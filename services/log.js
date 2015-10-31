'use strict'

// DEPRECATED, use lib/log.js

const hub = require('mag-hub')
const mag = require('mag')
const log = require('../lib/log')

const logger = module.exports = log(mag, hub)

logger('log').warn('DEPRECATED: Do not use five-bells-shared/services/log - create your own logging service using five-bells-shared/lib/log')
logger('log').warn('  required from ' + module.parent.filename)
