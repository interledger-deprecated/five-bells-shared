'use strict'

const chai = require('chai')
const expect = chai.expect
const Config = require('../lib/config')

describe('Config', function () {
  describe('constructor', function () {
    it('should correctly convert the prefix', function () {
      const config = new Config('a-long-PrEFiX')

      expect(config.uppercasePrefix).to.equal('A_LONG_PREFIX_')
    })
  })

  describe('castBool', function () {
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

  describe('get/set', () => {
    it('returns a value set at a configuration path', () => {
      const config = new Config()
      config.set('server.auth.user', 'foo')
      expect(config.get('server.auth.user')).to.equal('foo')
    })

    it('returns undefined when value at path is not set', () => {
      const config = new Config()
      expect(config.get('server.auth.user')).to.equal(undefined)
    })
  })
})
