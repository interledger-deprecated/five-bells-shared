'use strict'

const url = require('url')
const tweetnacl = require('tweetnacl')

/**
 * Config management helper class.
 *
 * @example
 * class MyConfig extends Config {
 *   constructor () {
 *     super('example')
 *     this.parseServerConfig()
 *     this.parseDatabaseConfig()
 *   }
 * }
 */
class Config {
  /**
   * Constructor.
   *
   * @param {String} prefix Prefix to apply to all env variable names. Should be
   *   in lowercase with dashes as separators. Will automatically be converted
   *   to uppercase with underscores or other formats as necessary.
   */
  constructor (prefix) {
    this.prefix = prefix || ''
    this.uppercasePrefix = this.prefix.toUpperCase().replace(/-/g, '_') +
      (prefix ? '_' : '')
  }

  /**
   * Get a config value from the environment.
   *
   * Applies the config prefix defined in the constructor.
   *
   * @param {String} name Config key (will be prefixed)
   * @return {String} Config value or undefined
   *
   * @example
   * const config = new Config('example')
   * config.getEnv('MY_SETTING') === process.env.EXAMPLE_MY_SETTING
   */
  getEnv (name) {
    return process.env[this.uppercasePrefix + name]
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
  static castBool (value, defaultValue) {
    value = value && value.trim()
    if (value === undefined || value === '') return Boolean(defaultValue)
    if (value === 'true' || value === '1') return true
    if (value === 'false' || value === '0') return false
    throw new Error('castBool unexpected value: ' + value)
  }

  /**
   * Populates the configuration with server settings from the environment.
   */
  parseServerConfig () {
    this.server = {}
    this.server.secure = !!this.getEnv('PUBLIC_HTTPS')
    this.server.bind_ip = this.getEnv('BIND_IP') || '0.0.0.0'
    this.server.port = this.getEnv('PORT') || 3000
    this.server.public_host = this.getEnv('HOSTNAME') || require('os').hostname()
    this.server.public_port = this.getEnv('PUBLIC_PORT') || this.server.port

    this.updateDerivativeServerConfig()
  }

  /**
   * Update server config options that are derivative from other options.
   */
  updateDerivativeServerConfig () {
    // Calculate base_uri
    const isCustomPort = this.server.secure
      ? +this.server.public_port !== 443
      : +this.server.public_port !== 80
    this.server.base_host = this.server.public_host +
      (isCustomPort ? ':' + this.server.public_port : '')
    this.server.base_uri = url.format({
      protocol: 'http' + (this.server.secure ? 's' : ''),
      host: this.server.base_host
    })
  }

  /**
   * Populates the configuration with database settings from the environment.
   */
  parseDatabaseConfig () {
    this.db = {}

    // Database URI
    this.db.uri = this.getEnv('DB_URI')

    // Synchronize schema when the application starts
    this.db.sync = Config.castBool(
      this.getEnv('DB_SYNC'),
      // When using SQLite in-memory database, default to sync enabled
      this.db.uri === 'sqlite://'
    )
  }

  /**
   * Load configuration of this process' keypair.
   */
  parseKeyConfig () {
    this.keys = {}
    this.keys.ed25519 = {
      secret: process.env.ED25519_SECRET_KEY,
      public: process.env.ED25519_PUBLIC_KEY
    }

    let keyPair
    if (!this.keys.ed25519.secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('No ED25519_SECRET_KEY provided.')
      }
      keyPair = tweetnacl.sign.keyPair()
      this.keys.ed25519.secret = tweetnacl.util.encodeBase64(keyPair.secretKey)
      this.keys.ed25519.public = tweetnacl.util.encodeBase64(keyPair.publicKey)
    }

    if (!this.keys.ed25519.public) {
      if (!keyPair) {
        keyPair = tweetnacl.sign.keyPair.fromSecretKey(
          tweetnacl.util.decodeBase64(this.keys.ed25519.secret))
      }
      this.keys.ed25519.public =
        tweetnacl.util.encodeBase64(keyPair.publicKey)
    }

  }
}

module.exports = Config
