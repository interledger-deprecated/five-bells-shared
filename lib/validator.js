'use strict'

const co = require('co')
const fs = require('fs')
const path = require('path')
const parse = require('co-body')
const ServerError = require('../errors/server-error')
const InvalidBodyError = require('../errors/invalid-body-error')
const InvalidUriParameterError =
  require('../errors/invalid-uri-parameter-error')

const Ajv = require('ajv')

const BASE_DIR = path.join(__dirname, '/../schemas')

/**
 * @typedef {Object} ValidationResult
 * @property {Boolean} valid Whether the data matched the schema.
 * @property {Object[]} errors A list of validation errors if any.
 */

/**
 * Filter function for JSON data.
 *
 * @callback ValidatorFunction
 * @param {Object} data Data to be validated
 * @return {ValidationResult} Validation result
 */

/**
 * Validation helper class.
 */
class Validator {
  constructor () {
    this.ajv = new Ajv()
    this.loadedDirectories = new Set()
  }

  /**
   * Load the schemas shipped with five-bells-shared.
   */
  loadSharedSchemas () {
    this.loadSchemasFromDirectory(BASE_DIR)
  }

  /**
   * Load additional schemas from the provided directory.
   *
   * The schemas must be individual JSON files with the `.json` extension.
   *
   * @param {String} dirPath Absolute path to the schemas
   */
  loadSchemasFromDirectory (dirPath) {
    // Only load each directory once
    if (this.loadedDirectories.has(dirPath)) return
    this.loadedDirectories.add(dirPath)

    fs.readdirSync(dirPath)
      .filter((fileName) => {
        return /^[\w\s]+\.json$/.test(fileName)
      })
      .forEach((fileName) => {
        try {
          let schemaJson = fs.readFileSync(path.join(dirPath, fileName), 'utf8')
          this.ajv.addSchema(JSON.parse(schemaJson), fileName)
        } catch (e) {
          throw new ServerError('Failed to parse schema: ' + fileName + '. Reason: ' + e)
        }
      })
  }

  /**
   * Create a validation function for schema `schema`.
   *
   * @return {ValidatorFunction} Validation function
   */
  create (schema) {
    return (data) => {
      const isValid = this.ajv.validate(schema + '.json', data)

      // Returning it in the same format as tv4.validateMultiple would do
      return {
        valid: isValid,
        schema: schema,
        errors: (isValid) ? undefined : this.ajv.errors
      }
    }
  }

  /**
   * Validate path parameter.
   *
   * @param {String} paramId Name of URL parameter.
   * @param {String} paramValue Value of URL parameter.
   * @param {String} schema Name of JSON schema.
   *
   * @returns {void}
   */
  validateUriParameter (paramId, paramValue, schema) {
    const isValid = this.ajv.validate(schema + '.json', paramValue)
    if (!isValid) {
      throw new InvalidUriParameterError(paramId + ' is not a valid ' + schema,
        this.ajv.errors)
    }
  }

  /**
   * Parse the request body JSON and optionally validate it against a schema.
   *
   * @param {Object} ctx Koa context.
   * @param {String} schema Name of JSON schema.
   *
   * @returns {Promise.<Mixed>} Parsed JSON body
   */
  validateBody (ctx, schema) {
    return co.wrap(this._validateBody).call(this, ctx, schema)
  }

  * _validateBody (ctx, schema) {
    const json = yield parse(ctx)

    if (schema) {
      const isValid = this.ajv.validate(schema + '.json', json)
      if (!isValid) {
        throw new InvalidBodyError('JSON request body is not a valid ' + schema,
          this.ajv.errors)
      }
    }

    return json
  }
}

module.exports = Validator
