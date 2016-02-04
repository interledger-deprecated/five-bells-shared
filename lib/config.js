'use strict'

const Immutable = require('immutable')
const url = require('url')
const tweetnacl = require('tweetnacl')

function isRunningTests () {
  return process.argv[0].endsWith('mocha') ||
    (process.argv.length > 1 && process.argv[0].endsWith('node') &&
     process.argv[1].endsWith('mocha'))
}

function useTestConfig () {
  return !castBool(process.env.UNIT_TEST_OVERRIDE) && isRunningTests()
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
  const secure = castBool(getEnv(prefix, 'PUBLIC_HTTPS'))
  const bind_ip = getEnv(prefix, 'BIND_IP') || '0.0.0.0'

  let port = parseInt(getEnv(prefix, 'PORT'), 10) || 3000
  let public_host = getEnv(prefix, 'HOSTNAME') || require('os').hostname()
  let public_port = parseInt(getEnv(prefix, 'PUBLIC_PORT'), 10) || port

  if (useTestConfig()) {
    public_host = 'localhost'
    port = 61337
    public_port = 80
  }

  // Depends on previously defined config values
  const isCustomPort = secure
    ? +public_port !== 443
    : +public_port !== 80

  const base_host = public_host + (isCustomPort ? ':' + public_port : '')
  const base_uri = url.format({
    protocol: 'http' + (secure ? 's' : ''),
    host: base_host
  })

  return {
    secure,
    bind_ip,
    port,
    public_host,
    public_port,
    base_host,
    base_uri
  }
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

  return {
    uri,
    sync
  }
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
      throw new Error('No ' + this.uppercasePrefix + 'ED25519_SECRET_KEY provided.')
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
 *   config.toJSON()
 *   => { foo: {bar: 'baz'} }
 *
 *   config.getIn('foo.bar')
 *   => 'baz'
 *
 */
function loadConfig (prefix, localConfig) {
  const server = parseServerConfig(prefix, localConfig && localConfig.server)
  const db = parseDatabaseConfig(prefix, localConfig && localConfig.db)
  const keys = parseKeyConfig(prefix, localConfig && localConfig.keys)

  const commonConfig = Immutable.fromJS({server, db, keys})

  return commonConfig.merge(localConfig || {})
}

module.exports = {
  getEnv,
  loadConfig,
  castBool,
  // For unit tests
  _private: {
    parseKeyConfig,
    parseServerConfig,
    parseDatabaseConfig
  }
}

