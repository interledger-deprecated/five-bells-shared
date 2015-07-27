'use strict'

const chai = require('chai')
const expect = chai.expect
const UriManager = require('../lib/uri-manager').UriManager

describe('UriManager', function () {
  beforeEach(function () {
    this.uri = new UriManager('http://localhost')
  })

  describe('addResource', function () {
    it('should create a route parser', function *() {
      this.uri.addResource('foo', '/foo/:id')

      expect(this.uri.routes).to.have.length(1)
      expect(this.uri.routes[0]).to.be.a('function')
    })
  })

  describe('parse', function () {
    beforeEach(function () {
      this.uri.addResource('foo', '/foo/:id')
    })

    it('should recognize a remote uri as non-local', function () {
      const result = this.uri.parse('http://example.com')

      expect(result.local).to.equal(false)
    })

    it('should recognize any local uri as local', function () {
      const result = this.uri.parse('http://localhost/bar/baz')

      expect(result.local).to.equal(true)
    })

    it('should recognize a specific resource', function () {
      const result = this.uri.parse('http://localhost/foo/abracadabra')

      expect(result.local).to.equal(true)
      expect(result.type).to.equal('foo')
      expect(result.id).to.equal('abracadabra')
    })
  })

  describe('make', function () {
    beforeEach(function () {
      this.uri.addResource('foo', '/foo/:id')
      this.uri.addResource('rio', '/rio/:wat/:where')
    })

    it('should construct a local uri correctly', function () {
      const uri = this.uri.make('foo', 'bar')

      expect(uri).to.equal('http://localhost/foo/bar')
    })

    it('should construct another local uri correctly', function () {
      const uri = this.uri.make('rio', 'bar', 'baz')

      expect(uri).to.equal('http://localhost/rio/bar/baz')
    })

    it('should construct a local uri correctly with params obj', function () {
      const uri = this.uri.makeWithParams('foo', {id: 'bar'})

      expect(uri).to.equal('http://localhost/foo/bar')
    })

    it('should refuse to construct a URI when given invalid type', function () {
      const self = this
      expect(function () {
        self.uri.make('baz', 'bar')
      }).to.throw(Error, /Unknown resource type/)
    })

    it('should refuse to construct a URI when given wrong param count', function () {
      const self = this
      expect(function () {
        self.uri.make('rio', 'bar')
      }).to.throw(Error, /Incorrect parameter count/)
    })

    it('should refuse to construct a URI when given invalid type w/ obj', function () {
      const self = this
      expect(function () {
        self.uri.makeWithParams('baz', {id: 'bar'})
      }).to.throw(Error, /Unknown resource type/)
    })
  })
})
