'use strict'

const crypto = require('crypto')
const url = require('url')
const tweetnacl = require('tweetnacl')
const _ = require('lodash')
const fs = require('fs')
const ServerError = require('../errors/server-error')

function isRunningTests () {
  return process.argv[0].endsWith('mocha') ||
    (process.argv.length > 1 && process.argv[0].endsWith('node') &&
     process.argv[1].endsWith('mocha'))
}

function useTestConfig () {
  return !castBool(process.env.UNIT_TEST_OVERRIDE) && isRunningTests()
}

function removeUndefined (obj) {
  return _.omitBy(obj, _.isUndefined)
}

function removeEmpty (obj) {
  return _.omitBy(obj, _.isEmpty)
}

function ensureLeadingSlash (path) {
  return path.length && path[0] !== '/' ? '/' + path : path
}

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
 * Parse the server configuration settings from the environment.
 */
function parseServerConfig (prefix) {
  const secure = castBool(getEnv(prefix, 'USE_HTTPS'))
  const bind_ip = getEnv(prefix, 'BIND_IP') || '0.0.0.0'

  let port = parseInt(getEnv(prefix, 'PORT'), 10) || 3000
  const public_secure = castBool(getEnv(prefix, 'PUBLIC_HTTPS'), secure)
  let public_host = getEnv(prefix, 'HOSTNAME') || require('os').hostname()
  let public_port = parseInt(getEnv(prefix, 'PUBLIC_PORT'), 10) || port
  const public_path = ensureLeadingSlash(getEnv(prefix, 'PUBLIC_PATH') || '')

  if (useTestConfig()) {
    public_host = 'localhost'
    port = 61337
    public_port = 80
  }

  // Depends on previously defined config values
  const isCustomPort = public_secure
    ? +public_port !== 443
    : +public_port !== 80

  const base_host = public_host + (isCustomPort ? ':' + public_port : '')
  const base_uri = url.format({
    protocol: 'http' + (public_secure ? 's' : ''),
    host: base_host,
    pathname: public_path
  })

  return {
    secure,
    bind_ip,
    port,
    public_secure,
    public_host,
    public_port,
    public_path,
    base_host,
    base_uri
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
  const useTLS = !_.isEmpty(tlsEnvConfig)
  if (useTLS) {
    return _.mapValues(tlsEnvConfig, (file) => fs.readFileSync(file))
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
  const sync = castBool(getEnv(prefix, 'DB_SYNC'), uri === 'sqlite://')

  // Knex
  const knex_env = getEnv(prefix, 'DB_KNEX_ENV') || 'development'

  // User for connecting to DB
  const connection_user = getEnv(prefix, 'DB_CONNECTION_USER')
  const connection_password = getEnv(prefix, 'DB_CONNECTION_PASSWORD')

  return removeUndefined({
    uri,
    sync,
    knex_env,
    connection_user,
    connection_password
  })
}

function parseED25519 (prefix) {
  const ed25519 = {
    secret: getEnv(prefix, 'ED25519_SECRET_KEY'),
    public: getEnv(prefix, 'ED25519_PUBLIC_KEY')
  }

  let keyPair
  if (!ed25519.secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new ServerError('No ' + (prefix ? prefix.toUpperCase() + '_' : '') +
        'ED25519_SECRET_KEY provided.')
    }
    const seed = crypto.randomBytes(32)
    keyPair = tweetnacl.sign.keyPair.fromSeed(seed)
    ed25519.secret = seed.toString('base64')
    ed25519.public = tweetnacl.util.encodeBase64(keyPair.publicKey)
  }

  if (!ed25519.public) {
    if (!keyPair) {
      keyPair = tweetnacl.sign.keyPair.fromSecretKey(
        tweetnacl.util.decodeBase64(ed25519.secret))
    }
    ed25519.public =
      tweetnacl.util.encodeBase64(keyPair.publicKey)
  }

  return ed25519
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
    _.forEach(tls, (file) => fs.accessSync(file, fs.R_OK))
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
configProto.get = function get (propertyPath, defaultValue) {
  return _.get(this, propertyPath, defaultValue)
}
configProto.getIn = function getIn (propertyList, defaultValue) {
  return _.get(this, propertyList, defaultValue)
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
  const _options = options || {}

  validateEnvConfig(prefix)
  const server = parseServerConfig(prefix)
  const db = parseDatabaseConfig(prefix)
  const keys = parseKeyConfig(prefix, _options)
  const auth = parseAuthConfig(prefix)
  const tls = parseTLSConfig(prefix)

  const commonConfig = removeEmpty({server, db, keys, auth, tls})
  const completeConfig = Object.assign(Object.create(configProto), _.merge(commonConfig, localConfig || {}))

  if (!useTestConfig()) {
    deepFreeze(completeConfig)
  }
  return completeConfig
}

module.exports = {
  getEnv,
  loadConfig,
  castBool
}
