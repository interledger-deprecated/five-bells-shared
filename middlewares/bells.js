'use strict';

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
  return function *bells(next) {
    this.bells = {};

    const isCustomPort = config.server.secure ?
      +config.server.public_port !== 443 : +config.server.public_port !== 80;
    this.bells.base =
      'http' + (config.server.secure ? 's' : '') +
      '://' + config.server.public_host +
      (isCustomPort ? ':' + config.server.public_port : '');

    yield next;
  };
};
