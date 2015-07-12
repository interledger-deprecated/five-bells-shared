'use strict'

/**
 * Generate a middleware that adds some bells and whistles to Koa.
 *
 * The bells middleware contains various utilities for Five Bells projects based
 * on Koa.
 *
 * @param {Object} config Configuration service
 *
 * @returns {Function} Koa middleware
 */
module.exports = function (config) {
  return function * bells (next) {
    this.bells = {}
    this.bells.base = config.server.base_uri

    yield next
  }
}
