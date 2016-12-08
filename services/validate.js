'use strict'

module.exports = validate

const Ajv = require('ajv')
const validator = new Ajv()
const schemas = require('../schemas')

for (const schemaId in schemas) {
  validator.addSchema(schemas[schemaId], schemaId + '.json')
}

function validate (schemaId, json) {
  const isValid = validator.validate(schemaId + '.json', json)

  // Returning it in the same format as tv4.validateMultiple would do
  return {
    valid: isValid,
    schema: schemaId,
    errors: (isValid) ? undefined : validator.errors
  }
}
