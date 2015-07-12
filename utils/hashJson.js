'use strict'

const crypto = require('crypto')
const stringifyJson = require('canonical-json')

module.exports = function hashJSON (json) {
  let str = stringifyJson(json)
  let hash = crypto.createHash('sha512').update(str).digest('base64')
  return hash
}
