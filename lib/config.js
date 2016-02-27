'use strict'

const Immutable = require('immutable')
const url = require('url')
const tweetnacl = require('tweetnacl')
const _ = require('lodash')
const fs = require('fs')

function isRunningTests () {
  return process.argv[0].endsWith('mocha') ||
    (process.argv.length > 1 && process.argv[0].endsWith('node') &&
     process.argv[1].endsWith('mocha'))
}

function useTestConfig () {
  return !castBool(process.env.UNIT_TEST_OVERRIDE) && isRunningTests()
}

function removeUndefined (obj) {
  return _.omit(obj, _.isUndefined)
}

function removeEmpty (obj) {
  return _.omit(obj, _.isEmpty)
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
  throw new Error('castBool unexpected value: ' + value)
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
  else throw new Error('Invalid environment variable')

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
    return _.mapValues(tlsEnvConfig, file => fs.readFileSync(file))
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
    uri = process.env.LEDGER_UNIT_DB_URI || 'sqlite://'
  }

  // Synchronize schema when the application starts
  // When using SQLite in-memory database, default to sync enabled
  const sync = castBool(getEnv(prefix, 'DB_SYNC'), uri === 'sqlite://')

  return removeUndefined({
    uri,
    sync
  })
}

/**
 * Parse keypair configuration from the environment
 */
function parseKeyConfig (prefix) {
  const ed25519 = {
    secret: getEnv(prefix, 'ED25519_SECRET_KEY'),
    public: getEnv(prefix, 'ED25519_PUBLIC_KEY')
  }

  let keyPair
  if (!ed25519.secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('No ' + (prefix ? prefix.toUpperCase() + '_' : '') +
        'ED25519_SECRET_KEY provided.')
    }
    keyPair = tweetnacl.sign.keyPair()
    ed25519.secret = tweetnacl.util.encodeBase64(keyPair.secretKey)
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

  return {
    ed25519
  }
}

function parseAuthConfig (prefix) {
  return {
    basic_enabled: castBool(getEnv(prefix, 'AUTH_BASIC_ENABLED'), true),
    http_signature_enabled: castBool(getEnv(prefix, 'AUTH_HTTP_SIGNATURE_ENABLED'), true),
    client_certificates_enabled: castBool(getEnv(prefix, 'AUTH_CLIENT_CERT_ENABLED'), false)
  }
}

function validateEnvConfig (prefix) {
  const secureOrClientCertEnabled = castBool(getEnv(prefix, `USE_HTTPS`)) ||
    getEnv(prefix, `AUTH_CLIENT_CERT_ENABLED`)

  const tls = parseTLSEnv(prefix)
  if (secureOrClientCertEnabled && _.isEmpty(tls)) {
    const _prefix = prefix ? prefix + '_' : ''
    throw new Error(
        `Missing ${_prefix}TLS_KEY or ${_prefix}TLS_CERTIFICATE`)
  }

  try {
    _.forEach(tls, file => fs.accessSync(file, fs.R_OK))
  } catch (e) {
    throw new Error(`Failed to read TLS config: ${e.message}`)
  }
}

/**
 * @param {String} prefix Prefix to apply to all env variable names. Should be
 *   in lowercase with dashes as separators. Will automatically be converted
 *   to uppercase with underscores or other formats as necessary.
 *
 * @param {Object} [localConfig]
 * @returns {Immutable.Map} - Immutable Config
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
function loadConfig (prefix, localConfig) {
  validateEnvConfig(prefix)
  const server = parseServerConfig(prefix)
  const db = parseDatabaseConfig(prefix)
  const keys = parseKeyConfig(prefix)
  const auth = parseAuthConfig(prefix)
  const tls = parseTLSConfig(prefix)

  const commonConfig = Immutable.fromJS(removeEmpty({server, db, keys, auth, tls}))
  const completeConfig = commonConfig.mergeDeep(localConfig || {})

  return completeConfig
}

module.exports = {
  getEnv,
  loadConfig,
  castBool
}
