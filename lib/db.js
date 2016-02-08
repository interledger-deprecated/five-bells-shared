'use strict'

const _ = require('lodash')
const co = require('co')
const url = require('url')
const retry = require('retry-as-promised')

const DEFAULT_MAX_TRANSACTION_RETRIES = 5

module.exports = function (Sequelize, log) {
  if (typeof log === 'object') {
    log.warn('DEPRECATED: Do not pass a logger to five-bells-shared Database constructor. Instead, please pass it via the logging config option.')
  }
  return class DB extends Sequelize {
    // options.maxTransactionRetries is the number of times to retry transactions that fail due to serialization / transaction isolation errors
    constructor (uri, options) {
      options = _.merge({
        logging: typeof log === 'object' ? log.debug : false,
        omitNull: true,
        // All transactions should be done with isolation level SERIALIZABLE
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
      }, options)
      const dbParts = url.parse(uri)

      if (uri === 'sqlite://:memory:') {
        options.storage = ':memory:'
      } else if (dbParts.protocol === 'sqlite:') {
        options.storage = dbParts.pathname
      }

      if (options.logging) {
        options.logging('using database ' + uri)
      }

      super(uri, options)

      this.maxTransactionRetries = options.maxTransactionRetries || DEFAULT_MAX_TRANSACTION_RETRIES
    }

    * init () {
      if (this.options.dialect !== 'sqlite') return
      // Sequelize does not properly handle SQLITE_BUSY errors, so it's better
      // to avoid them by waiting longer
      yield this.query('PRAGMA busy_timeout = 0;')
      // Write-ahead log is faster
      yield this.query('PRAGMA journal_mode = WAL;')
      // SQLite is only intended for testing, so we don't care about durability
      yield this.query('PRAGMA synchronous = off;')
      this.getQueryInterface().QueryGenerator.startTransactionQuery = function (transaction, options) {
        // This changed from `options` to `transaction` at some point.
        if (transaction.parent || (options && options.parent)) {
          return 'SAVEPOINT ' + this.quoteIdentifier(transaction.name) + ';'
        }
        return 'BEGIN IMMEDIATE;'
      }
    }

    sync () {
      if (this.options.logging) {
        this.options.logging('synchronizing database schema')
      }
      return super.sync()
    }

    transaction (transactionFn) {
      if (typeof transactionFn !== 'function') {
        return super.transaction(transactionFn)
      }

      // Turn the generator into a promise, then call upstream transaction().
      // Transactions will be retried if they fail with an error due to serialization / transaction isolation
      return retry(() => {
        return super.transaction((tr) => {
          const generator = transactionFn.call(this, tr)
          if (typeof generator === 'object' &&
            typeof generator.next === 'function') {
            return co(generator)
          }

          return generator
        })
      }, {
        max: this.maxTransactionRetries,
        match: [
          'could not serialize access due to concurrent update',
          'could not serialize access due to read/write dependencies among transactions'
        ],
        backoffBase: 100,
        backoffExponent: 1.1
      })
    }
  }
}
