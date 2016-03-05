'use strict'

const _ = require('lodash')
const chai = require('chai')
const expect = chai.expect
const Config = require('../lib/config')
const Immutable = require('immutable')
const fs = require('fs')

const originalEnv = _.cloneDeep(process.env)
describe('Config', () => {
  beforeEach(() => {
    process.env = _.cloneDeep(originalEnv)
  })

  describe('castBool()', () => {
    it('should return false for castBool("0")', function () {
      expect(Config.castBool('0')).to.equal(false)
    })

    it('should return false for castBool("false")', function () {
      expect(Config.castBool('false')).to.equal(false)
    })

    it('should return true for castBool("1")', function () {
      expect(Config.castBool('1')).to.equal(true)
    })

    it('should return true for castBool("true")', function () {
      expect(Config.castBool('true')).to.equal(true)
    })

    it('should throw for castBool("anything")', function () {
      expect(function () {
        Config.castBool('anything')
      }).to.throw()
    })

    it('should return false for castBool(" false ")', function () {
      expect(Config.castBool(' false ')).to.equal(false)
    })

    it('should return false for castBool(" 0 ")', function () {
      expect(Config.castBool(' 0 ')).to.equal(false)
    })

    it('should return false for castBool(undefined)', function () {
      expect(Config.castBool(undefined)).to.equal(false)
    })

    it('should return false for castBool("")', function () {
      expect(Config.castBool('')).to.equal(false)
    })

    it('should return true for castBool(undefined, true)', function () {
      expect(Config.castBool(undefined, true)).to.equal(true)
    })

    it('should return true for castBool("", true)', function () {
      expect(Config.castBool('', true)).to.equal(true)
    })

    it('should return false for castBool("0", true)', function () {
      expect(Config.castBool('0', true)).to.equal(false)
    })

    it('should return true for castBool("1", false)', function () {
      expect(Config.castBool('1', false)).to.equal(true)
    })
  })

  describe('getEnv()', () => {
    it('returns an environment variable defined with a prefix', () => {
      process.env['PREFIX_FOO'] = 'bar'
      expect(Config.getEnv('prefix', 'foo')).to.equal('bar')
    })

    it('returns an env variable defined without prefix', () => {
      process.env['FOO'] = 'bar'
      expect(Config.getEnv('FOO')).to.equal('bar')
      expect(Config.getEnv(undefined, 'FOO')).to.equal('bar')
    })

    it('throws an error on invalid arguments', () => {
      expect(() => Config.getEnv()).to.throw()
      expect(() => Config.getEnv('')).to.throw()
      expect(() => Config.getEnv('', '')).to.throw()
      expect(() => Config.getEnv(undefined, undefined)).to.throw()
    })
  })

  describe('parseServerConfig', () => {
    const testDefaults = {
      base_host: 'localhost',
      base_uri: 'http://localhost',
      bind_ip: '0.0.0.0',
      port: 61337,
      public_secure: false,
      public_host: 'localhost',
      public_port: 80,
      public_path: '',
      secure: false
    }

    const hostname = require('os').hostname()
    const defaults = {
      base_host: `${hostname}:3000`,
      base_uri: `http://${hostname}:3000`,
      bind_ip: '0.0.0.0',
      public_secure: false,
      public_host: hostname,
      public_port: 3000,
      public_path: '',
      secure: false,
      port: 3000
    }

    it('test -- returns default server config when no server env vars set', () => {
      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(testDefaults)
    })

    it('returns default server config when no server env vars set', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(defaults)
    })

    it('USE_HTTPS=true', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.USE_HTTPS = 'true'
      // HTTPS requires TLS configuration to be set
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = 'test/data/crt'
      const server = _.defaults({
        base_uri: `https://${hostname}:3000`,
        public_secure: true,
        secure: true
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('USE_HTTPS=true -- missing TLS_KEY', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.USE_HTTPS = 'true'
      // HTTPS requires TLS configuration to be set
      process.env.TLS_CERTIFICATE = 'test/data/crt'

      expect(() => Config.loadConfig()).to.throw()
    })

    it('USE_HTTPS=true -- missing TLS_CERTIFICATE', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.USE_HTTPS = 'true'
      // HTTPS requires TLS configuration to be set
      process.env.TLS_KEY = 'test/data/key'

      expect(() => Config.loadConfig()).to.throw()
    })

    it('PUBLIC_HTTPS=true', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PUBLIC_HTTPS = 'true'
      // HTTPS requires TLS configuration to be set
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = 'test/data/crt'
      const server = _.defaults({
        base_uri: `https://${hostname}:3000`,
        public_secure: true
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('PUBLIC_HTTPS=true PUBLIC_PORT=443', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PUBLIC_HTTPS = 'true'
      process.env.PUBLIC_PORT = '443'
      const server = _.defaults({
        base_host: `${hostname}`,
        base_uri: `https://${hostname}`,
        public_secure: true,
        public_port: 443
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('BIND_IP=10.10.10.10', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.BIND_IP = '10.10.10.10'
      const server = _.defaults({
        bind_ip: '10.10.10.10'
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('PUBLIC_PORT=5000', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PUBLIC_PORT = '5000'
      const server = _.defaults({
        base_host: `${hostname}:5000`,
        base_uri: `http://${hostname}:5000`,
        public_host: hostname,
        public_port: 5000,
        secure: false,
        port: 3000
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('PORT=5000', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PORT = '5000'
      const server = _.defaults({
        base_host: `${hostname}:5000`,
        base_uri: `http://${hostname}:5000`,
        public_host: hostname,
        public_port: 5000,
        secure: false,
        port: 5000
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('PUBLIC_PATH=', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PUBLIC_PATH = ''
      const server = defaults
      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('PUBLIC_PATH=/example', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PUBLIC_PATH = '/example'
      const server = _.defaults({
        base_uri: `http://${hostname}:3000/example`,
        public_path: '/example'
      }, defaults)
      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })

    it('PUBLIC_PATH=example', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.PUBLIC_PATH = 'example'
      const server = _.defaults({
        base_uri: `http://${hostname}:3000/example`,
        public_path: '/example'
      }, defaults)
      const _config = Config.loadConfig()
      expect(_config.get('server').toJS()).to.deep.equal(server)
    })
  })

  describe('parseKeyConfig', () => {
    beforeEach(() => {
      process.env.DB_URI = 'localhost:5000'
    })

    it('test env -- ed25519', () => {
      const _config = Config.loadConfig()
      expect(_config.get('keys').toJS()).to.include.keys('ed25519')
      expect(_config.getIn(['keys', 'ed25519']).toJS()).to.include.keys('secret', 'public')
    })

    it('ed25519', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      const _config = Config.loadConfig()
      expect(_config.get('keys').toJS()).to.include.keys('ed25519')
      expect(_config.getIn(['keys', 'ed25519']).toJS()).to.include.keys('secret', 'public')
    })

    it('ED25519_SECRET_KEY', () => {
      const secret = 'WvWye3P79SXVGWJT8E4NhsGeKgJZlxhMyXDh7cRcbHsEqvDmg2dhC8EWdAAwTf6B8hzzdI/dq7WZXyqEobN9rw=='
      process.env.ED25519_SECRET_KEY = secret
      const _config = Config.loadConfig()
      expect(_config.get('keys').toJS()).to.include.keys('ed25519')
      expect(_config.getIn(['keys', 'ed25519']).toJS()).to.include.keys('secret', 'public')
      expect(_config.getIn(['keys', 'ed25519', 'secret'])).to.equal(secret)
    })
  })

  describe('parseDatabaseConfig', () => {
    const testDefaults = {
      knex_env: 'development',
      sync: true,
      uri: 'sqlite://'
    }

    const defaults = {
      sync: false,
      uri: undefined
    }

    it('test -- returns default db config when no db env vars set', () => {
      const _config = Config.loadConfig()
      expect(_config.get('db').toJS()).to.deep.equal(testDefaults)
    })

    it('DB_SYNC=true DB_URI=localhost:5000', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.DB_SYNC = 'true'
      process.env.DB_URI = 'localhost:5000'
      const db = _.defaults({
        knex_env: 'development',
        sync: true,
        uri: 'localhost:5000'
      }, defaults)
      const _config = Config.loadConfig()
      expect(_config.get('db').toJS()).to.deep.equal(db)
    })

    it('DB_URI=localhost:5000', () => {
      process.env.UNIT_TEST_OVERRIDE = 'true'
      process.env.DB_URI = 'localhost:5000'
      const db = _.defaults({
        knex_env: 'development',
        uri: 'localhost:5000'
      }, defaults)

      const _config = Config.loadConfig()
      expect(_config.get('db').toJS()).to.deep.equal(db)
    })
  })

  describe('parseAuthConfig', () => {
    beforeEach(() => {
      process.env.DB_URI = 'localhost:5000'
    })

    const defaults = {
      basic_enabled: true,
      http_signature_enabled: true,
      client_certificates_enabled: false
    }

    it('returns default auth config when no auth env vars set', () => {
      const _config = Config.loadConfig()
      expect(_config.get('auth').toJS()).to.deep.equal(defaults)
    })

    it('AUTH_BASIC_ENABLED=false', () => {
      process.env.AUTH_BASIC_ENABLED = 'false'
      const _config = Config.loadConfig()
      const auth = _.defaults({
        basic_enabled: false
      }, defaults)
      expect(_config.get('auth').toJS()).to.deep.equal(auth)
    })

    it('AUTH_HTTP_SIGNATURE_ENABLED=false', () => {
      process.env.AUTH_HTTP_SIGNATURE_ENABLED = 'false'
      const _config = Config.loadConfig()
      const auth = _.defaults({
        http_signature_enabled: false
      }, defaults)
      expect(_config.get('auth').toJS()).to.deep.equal(auth)
    })

    it('AUTH_CLIENT_CERT_ENABLED=true', () => {
      process.env.AUTH_CLIENT_CERT_ENABLED = 'true'
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = 'test/data/crt'
      const _config = Config.loadConfig()
      const auth = _.defaults({
        client_certificates_enabled: true
      }, defaults)
      expect(_config.get('auth').toJS()).to.deep.equal(auth)
    })

    it('AUTH_CLIENT_CERT_ENABLED=true, TLS_KEY=undefined', () => {
      process.env.AUTH_CLIENT_CERT_ENABLED = 'true'
      process.env.TLS_CERTIFICATE = '/foo'
      process.env.TLS_KEY = undefined
      expect(() => Config.loadConfig()).to.throw()
    })

    it('AUTH_CLIENT_CERT_ENABLED=true, SSL_CERTIFICATE=undefined', () => {
      process.env.AUTH_CLIENT_CERT_ENABLED = 'true'
      process.env.SSL_KEY = '/foo'
      process.env.SSL_CERTIFICATE = undefined
      expect(() => Config.loadConfig()).to.throw()
    })
  })

  describe('parseTLSConfig', () => {
    beforeEach(() => {
      process.env.DB_URI = 'localhost:5000'
      process.env.USE_HTTPS = 'true'
    })

    it('TLS_KEY, TLS_CERTIFICATE, TLS_CRL, TLS_CA', () => {
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = 'test/data/crt'
      process.env.TLS_CRL = 'test/data/crl'
      process.env.TLS_CA = 'test/data/ca'

      const _config = Config.loadConfig()
      expect(_config.get('tls').toJS()).to.deep.equal({
        key: fs.readFileSync('test/data/key'),
        cert: fs.readFileSync('test/data/crt'),
        crl: fs.readFileSync('test/data/crl'),
        ca: fs.readFileSync('test/data/ca')
      })
    })

    it('missing TLS_KEY', () => {
      process.env.TLS_KEY = '/foo/'
      process.env.TLS_CERTIFICATE = '/test/data/cert'
      expect(() => Config.loadConfig()).to.throw().match(/Failed to read TLS config/)
    })

    it('missing TLS_CERTIFICATE', () => {
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = '/foo'
      expect(() => Config.loadConfig()).to.throw().match(/Failed to read TLS config/)
    })

    it('missing TLS_CRL', () => {
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = '/test/data/cert'
      process.env.TLS_CRL = '/foo/'
      expect(() => Config.loadConfig()).to.throw().match(/Failed to read TLS config/)
    })

    it('missing TLS_CA', () => {
      process.env.TLS_KEY = 'test/data/key'
      process.env.TLS_CERTIFICATE = '/test/data/cert'
      process.env.TLS_CA = '/foo/'
      expect(() => Config.loadConfig()).to.throw().match(/Failed to read TLS config/)
    })
  })

  describe('loadConfig()', () => {
    it('returns an Immutable config object', () => {
      const _config = Config.loadConfig()

      // _config.toJS()
      // db: {
      //   sync: true,
      //   uri: 'sqlite://'
      // },
      // keys: {
      //   ed25519: {
      //     public: 'QxV0xwSiFb1jGzk+K3/s45y2oKSB2b0LQo50QiU/d28=',
      //     secret: '9Q8W9m9k2dBMFFM6w+0evSR8a+jSApL6uK+ekz96fKBDFXTHBKIVvWMbOT4rf+zjnLagpIHZvQtCjnRCJT93bw=='
      //   }
      // },
      // server: {
      //   base_host: 'localhost',
      //   base_uri: 'http://localhost',
      //   bind_ip: '0.0.0.0',
      //   port: 61337,
      //   public_host: 'localhost',
      //   public_port: 80,
      //   secure: false
      // }
      //

      expect(_config).to.be.instanceof(Immutable.Map)

      expect(_config.toJSON()).to.include.keys('db', 'keys', 'server')
      expect(_config.get('db').toJS()).to.deep.equal({
        knex_env: 'development',
        sync: true,
        uri: 'sqlite://'
      })

      expect(_config.getIn(['db', 'sync'])).to.equal(true)
      expect(_config.getIn(['db', 'uri'])).to.equal('sqlite://')

      expect(_config.get('server').toJS()).to.deep.equal({
        base_host: 'localhost',
        base_uri: 'http://localhost',
        bind_ip: '0.0.0.0',
        port: 61337,
        public_secure: false,
        public_host: 'localhost',
        public_port: 80,
        public_path: '',
        secure: false
      })

      expect(_config.get('keys').toJS()).to.include.keys('ed25519')
    })

    describe('with a localConfig', () => {
      it('extends common config with localConfig object', () => {
        const localConfig = {foo: {bar: {test: 'test'}}}
        const _config = Config.loadConfig('prefix', localConfig)
        expect(_config.getIn(['foo', 'bar']).toJS()).to.deep.equal({test: 'test'})
      })
    })
  })
})
