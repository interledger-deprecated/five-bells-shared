'use strict'

const chai = require('chai')
const expect = chai.expect
const Config = require('../lib/config')

describe('Config', function () {
  it('constructor', function () {
    it('should correctly convert the prefix', function () {
      const config = new Config('a-long-PrEFiX')

      expect(config.uppercasePrefix).to.equal('A_LONG_PREFIX_')
    })
  })
})
