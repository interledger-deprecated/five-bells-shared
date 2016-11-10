'use strict'

const crypto = require('crypto')
const os = require('os')
const url = require('url')
const tweetnacl = require('tweetnacl')
const omitBy = require('lodash/fp/omitBy')
const isUndefined = require('lodash/isUndefined')
const isEmpty = require('lodash/isEmpty')
const get = require('lodash/get')
const merge = require('lodash/merge')
const trimCharsEnd = require('lodash/fp/trimCharsEnd')
const some = require('lodash/fp/some')
const map = require('lodash/fp/map')
const forEach = require('lodash/fp/forEach')
const mapValues = require('lodash/fp/mapValues')
const startsWith = require('lodash/fp/startsWith')
const fs = require('fs')
const ServerError = require('../errors/server-error')

const secretNames = {} // { prefix ⇒ { name ⇒ true } }

function isRunningTests () {
  return process.argv[0].endsWith('mocha') ||
    (process.argv.length > 1 && process.argv[0].endsWith('node') &&
     process.argv[1].endsWith('mocha'))
}

function useTestConfig () {
  return !castBool(process.env.UNIT_TEST_OVERRIDE) && isRunningTests()
}

const removeUndefined = omitBy(isUndefined)
const removeEmpty = omitBy(isEmpty)

function ensureLeadingSlash (path) {
  return path[0] !== '/' ? '/' + path : path
}

const removeTrailingSlashes = trimCharsEnd('/')

/**
 * Parse a boolean config variable.
 *
 * Environment variables are passed in as strings, but this function can turn
 * values like `undefined`, `''`, `'0'` and `'false'` into `false`.
 *
 * If a default value is provided, `undefined` and `''` will return the
 * default value.
 *
 * Values other than `undefined`, `''`, `'1'`, `'0'`, `'true'`, and `'false'` will throw.
 *
 * @param {String} value Config value
 * @param {Boolean} defaultValue Value to be returned for undefined or empty inputs
 * @param {Boolean} Same config value intelligently cast to bool
 */
function castBool (value, defaultValue) {
  value = value && value.trim()
  if (value === undefined || value === '') return Boolean(defaultValue)
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  throw new ServerError('castBool unexpected value: ' + value)
}

/**
 * Get a config value from the environment.
 *
 * Applies the config prefix defined in the constructor.
 *
 *
 * @param {String} prefix prefix
 * @param {String} name Config key (will be prefixed)
 * @return {String} Config value or undefined
 *
 * getEnv('example', 'my_setting') === process.env.EXAMPLE_MY_SETTING
 */
function getEnv (prefix, name) {
  let envVar
  if (name && prefix) envVar = `${prefix}_${name}`
  else if (name && !prefix) envVar = name
  else if (!name && prefix) envVar = prefix
  else throw new ServerError('Invalid environment variable')

  return process.env[envVar.toUpperCase().replace(/-/g, '_')]
}

/**
 * Generate a secret based on {prefix}_SECRET.
 *
 * @param {String} prefix
 * @param {String} name
 * @returns {Buffer}
 */
function generateSecret (prefix, name) {
  const names = secretNames[prefix] = secretNames[prefix] || {}
  if (names[name]) throw new Error('Secret "' + name + '" already exists')
  names[name] = true

  const secret = parseSecret(prefix)
  return crypto.createHmac('sha256', secret)
    .update(name)
    .digest()
}

function parseSecret (prefix) {
  const secret = getEnv(prefix, 'SECRET')
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new ServerError('No ' + (prefix ? prefix.toUpperCase() + '_' : '') + 'SECRET provided.')
  }
  return crypto.randomBytes(32).toString('base64')
}

function parsePublicURI (prefix, port, secure) {
  const names = ['PUBLIC_HTTPS', 'PUBLIC_PORT', 'PUBLIC_PATH']
  if (some((name) => getEnv(prefix, name), names)) {
    const _prefix = prefix ? prefix.toUpperCase() + '_' : ''
    const addPrefix = (name) => _prefix + name
    const vars = map(addPrefix, names).join(', ')
    console.log('DEPRECATION WARNING: Use ' + _prefix +
      'PUBLIC_URI instead of ' + vars)
  }

  const uri = getEnv(prefix, 'PUBLIC_URI')
  if (uri) {
    const parsed = url.parse(uri)
    return {
      secure: parsed.protocol === 'https:',
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) ||
        (parsed.protocol === 'https:' ? 443 : 80),
      path: ensureLeadingSlash(removeTrailingSlashes(parsed.path))
    }
  } else {
    return {
      secure: castBool(getEnv(prefix, 'PUBLIC_HTTPS'), secure),
      host: getEnv(prefix, 'HOSTNAME') || os.hostname(),
      port: parseInt(getEnv(prefix, 'PUBLIC_PORT'), 10) || port,
      path: ensureLeadingSlash(removeTrailingSlashes(
        getEnv(prefix, 'PUBLIC_PATH') || ''
      ))
    }
  }
}

/**
 * Parse the server configuration settings from the environment.
 */
function parseServerConfig (prefix) {
  const secure = castBool(getEnv(prefix, 'USE_HTTPS'))
  const bindIp = getEnv(prefix, 'BIND_IP') || '0.0.0.0'

  let port = parseInt(getEnv(prefix, 'PORT'), 10) || 3000
  const publicConfig = parsePublicURI(prefix, port, secure)

  if (useTestConfig()) {
    publicConfig.host = 'localhost'
    port = 61337
    publicConfig.port = 80
  }

  // Depends on previously defined config values
  const isCustomPort = publicConfig.secure
    ? +publicConfig.port !== 443
    : +publicConfig.port !== 80

  const baseHost = publicConfig.host +
    (isCustomPort ? ':' + publicConfig.port : '')
  const baseUri = removeTrailingSlashes(url.format({
    protocol: 'http' + (publicConfig.secure ? 's' : ''),
    host: baseHost,
    pathname: publicConfig.path
  }))

  return {
    secure,
    bind_ip: bindIp,
    port,
    public_secure: publicConfig.secure,
    public_host: publicConfig.host,
    public_port: publicConfig.port,
    public_path: publicConfig.path,
    base_host: baseHost,
    base_uri: baseUri
  }
}

function parseTLSEnv (prefix) {
  const key = getEnv(prefix, 'TLS_KEY')
  const cert = getEnv(prefix, 'TLS_CERTIFICATE')
  const crl = getEnv(prefix, 'TLS_CRL')
  const ca = getEnv(prefix, 'TLS_CA')

  return removeUndefined({key, cert, crl, ca})
}

function parseTLSConfig (prefix) {
  const tlsEnvConfig = parseTLSEnv(prefix)
  const useTLS = !isEmpty(tlsEnvConfig)
  if (useTLS) {
    return mapValues((file) => fs.readFileSync(file), tlsEnvConfig)
  }
  return {}
}

/*
 * Parse the database configuration settings from the environment.
 */
function parseDatabaseConfig (prefix) {
  // Database URI
  let uri = getEnv(prefix, 'DB_URI')

  if (useTestConfig()) {
    // We use a different config parameter for unit tests, because typically one
    // wouldn't want to use their production or even dev databases for unit tests
    // and it'd be far to easy to do that accidentally by running npm test.
    uri = getEnv(prefix, 'UNIT_DB_URI') || 'sqlite://'
  }

  // Synchronize schema when the application starts
  // When using SQLite in-memory database, default to sync enabled
  const sync = castBool(getEnv(prefix, 'DB_SYNC'), startsWith('sqlite://', uri))

  // User for connecting to DB
  const connectionUser = getEnv(prefix, 'DB_CONNECTION_USER')
  const connectionPassword = getEnv(prefix, 'DB_CONNECTION_PASSWORD')

  return removeUndefined({
    uri,
    sync,
    connection_user: connectionUser,
    connection_password: connectionPassword
  })
}

function parseED25519 (prefix) {
  const seed = generateSecret(prefix, 'ed25519')
  const keyPair = tweetnacl.sign.keyPair.fromSeed(seed)
  return {
    secret: seed.toString('base64'),
    public: new Buffer(keyPair.publicKey).toString('base64')
  }
}

/**
 * Parse keypair configuration from the environment
 */
function parseKeyConfig (prefix, options) {
  return removeUndefined({
    ed25519: options.ed25519 !== false ? parseED25519(prefix) : undefined
  })
}

function parseAuthConfig (prefix) {
  return {
    basic_enabled: castBool(getEnv(prefix, 'AUTH_BASIC_ENABLED'), true),
    http_signature_enabled: castBool(getEnv(prefix, 'AUTH_HTTP_SIGNATURE_ENABLED'), true),
    client_certificates_enabled: castBool(getEnv(prefix, 'AUTH_CLIENT_CERT_ENABLED'), false)
  }
}

function validateEnvConfig (prefix) {
  const authConfig = parseAuthConfig(prefix)
  const secureOrClientCertEnabled = castBool(getEnv(prefix, 'USE_HTTPS')) ||
    authConfig.client_certificates_enabled

  const tls = parseTLSEnv(prefix)
  if (secureOrClientCertEnabled && (tls.key === undefined || tls.cert === undefined)) {
    const _prefix = prefix ? prefix + '_' : ''
    throw new ServerError(
        `Missing ${_prefix}TLS_KEY or ${_prefix}TLS_CERTIFICATE`)
  }

  try {
    forEach((file) => fs.accessSync(file, fs.R_OK), tls)
  } catch (e) {
    throw new ServerError(`Failed to read TLS config: ${e.message}`)
  }
}

function deepFreeze (o) {
  Object.freeze(o)

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o[prop] &&
        (o[prop].constructor === Object ||
         o[prop].constructor === Array ||
         typeof o[prop] === 'function') &&
        !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop])
    }
  })

  return o
}

const configProto = {}

/**
 * @this {Object} The config object
 * @param {String} propertyPath - The config property path. Follows lodash.get
 *   syntax https://lodash.com/docs#get
 * @param {any} [defaultValue] - A default value to return if config value is undefined
 * @returns {any} - The config value at the specified path
 *
 */
configProto.get = function (propertyPath, defaultValue) {
  return get(this, propertyPath, defaultValue)
}
configProto.getIn = function (propertyList, defaultValue) {
  return get(this, propertyList, defaultValue)
}

/**
 * @param {String} prefix Prefix to apply to all env variable names. Should be
 *   in lowercase with dashes as separators. Will automatically be converted
 *   to uppercase with underscores or other formats as necessary.
 *
 * @param {Object} [localConfig]
 * @param {Object} [options]
 * @param {Boolean} [options.ed25519] - 'false' if config should not parse ed25519 keypair
 * @returns {Object} - Frozen Config
 *
 * @example
 *   const config = loadConfig('prefix', localConfig)
 *   config.toJS()
 *   => { foo: {bar: 'baz'} }
 *
 *   config.getIn(['foo', 'bar'])
 *   => 'baz'
 *
 *   config.get('foo').toJS()
 *   => {bar: 'baz'}
 *
 */
function loadConfig (prefix, localConfig, options) {
  secretNames[prefix] = {}
  const _options = options || {}

  validateEnvConfig(prefix)
  const server = parseServerConfig(prefix)
  const db = parseDatabaseConfig(prefix)
  const keys = parseKeyConfig(prefix, _options)
  const auth = parseAuthConfig(prefix)
  const tls = parseTLSConfig(prefix)

  const commonConfig = removeEmpty({server, db, keys, auth, tls})
  const completeConfig = Object.assign(Object.create(configProto), merge(commonConfig, localConfig || {}))

  if (!useTestConfig()) {
    deepFreeze(completeConfig)
  }
  return completeConfig
}

module.exports = {
  getEnv,
  generateSecret,
  loadConfig,
  castBool
}
