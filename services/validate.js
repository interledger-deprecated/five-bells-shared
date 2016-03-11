'use strict'

module.exports = validate

const fs = require('fs')
const path = require('path')
const tv4 = require('tv4')
const formats = require('tv4-formats')
const ServerError = require('../errors/server-error')

const validator = tv4.freshApi()
validator.addFormat(formats)

const baseDir = path.join(__dirname, '/../schemas')

fs.readdirSync(baseDir)
  .filter(function (fileName) {
    return /^[\w\s]+\.json$/.test(fileName)
  })
  .forEach(function (fileName) {
    try {
      validator.addSchema(fileName, require(path.join(baseDir, fileName)))
    } catch (e) {
      throw new ServerError('Failed to parse schema: ' + fileName)
    }
  })

function validate (schemaId, json) {
  return validator.validateMultiple(json, schemaId + '.json')
}
