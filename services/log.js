'use strict'

// DEPRECATED, use lib/log.js

const hub = require('mag-hub')
const mag = require('mag')
const log = require('../lib/log')

module.exports = log(mag, hub)
