'use strict'

const _ = require('lodash')
const co = require('co')
const url = require('url')

module.exports = function (Sequelize, log) {
  return class DB extends Sequelize {
    constructor (uri, options) {
      options = _.merge({
        logging: log.debug,
        omitNull: true
      }, options)
      const dbParts = url.parse(uri)

      if (uri === 'sqlite://:memory:') {
        options.storage = ':memory:'
      } else if (dbParts.protocol === 'sqlite:') {
        options.storage = dbParts.pathname
      }

      super(uri, options)
    }

    sync () {
      log.info('synchronizing database schema')
      return super.sync()
    }

    transaction (transactionFn) {
      if (typeof transactionFn !== 'function') {
        return super.transaction(transactionFn)
      }

      // Turn the generator into a promise, then call upstream transaction().
      return super.transaction(function (tr) {
        const generator = transactionFn.call(this, tr)
        if (typeof generator === 'object' &&
          typeof generator.next === 'function') {
          return co(generator)
        }

        return generator
      })
    }
  }
}
