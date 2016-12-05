'use strict'

module.exports = validate

const fs = require('fs')
const path = require('path')
const Ajv = require('ajv')
const ServerError = require('../errors/server-error')

const validator = new Ajv()

const baseDir = path.join(__dirname, '/../schemas')

fs.readdirSync(baseDir)
  .filter(function (fileName) {
    return /^[\w\s]+\.json$/.test(fileName)
  })
  .forEach(function (fileName) {
    try {
      validator.addSchema(require(path.join(baseDir, fileName)), fileName)
    } catch (e) {
      throw new ServerError('Failed to parse schema: ' + fileName)
    }
  })

function validate (schemaId, json) {
  const isValid = validator.validate(schemaId + '.json', json)

  // Returning it in the same format as tv4.validateMultiple would do
  return {
    valid: isValid,
    schema: schemaId,
    errors: (isValid) ? undefined : validator.errors
  }
}
