'use strict'

const chai = require('chai')
const expect = chai.expect
const fixtures = require('./data')
const path = require('path')
const ServerError = require('../errors/server-error')

const Validator = require('..').Validator

describe('Validator', function () {
  beforeEach(function () {
    this.validator = new Validator()
    this.validator.loadSharedSchemas()
  })

  describe('create()', function () {
    it('validates Account', function () {
      const validate = this.validator.create('Account')
      const account = fixtures.account
      expect(validate(account).valid).to.be.ok
      expect(validate(account).errors).to.be.empty
    })
  })

  describe('loadSchemasFromDirectory()', function () {
    it('throws a ServerError when loading an invalid schema', function () {
      expect(() => {
        this.validator.loadSchemasFromDirectory(path.join(__dirname, 'data/schemas/'))
      }).to.throw(ServerError)
    })
  })
})

