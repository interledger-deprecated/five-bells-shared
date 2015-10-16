'use strict'

module.exports = validate

const fs = require('fs')
const path = require('path')
const tv4 = require('tv4')
const formats = require('tv4-formats')
tv4.addFormat(formats)

const validator = tv4.freshApi()

const baseDir = path.join(__dirname, '/../schemas')

fs.readdirSync(baseDir)
  .filter(function (fileName) {
    return /^[\w\s]+\.json$/.test(fileName)
  })
  .forEach(function (fileName) {
    try {
      let schemaJson = fs.readFileSync(path.join(baseDir, fileName), 'utf8')
      validator.addSchema(fileName, JSON.parse(schemaJson))
    } catch (e) {
      throw new Error('Failed to parse schema: ' + fileName)
    }
  })

function validate (schemaId, json) {
  return validator.validateMultiple(json, schemaId + '.json')
}
