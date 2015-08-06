'use strict'

const _ = require('lodash')
const parse = require('co-body')
const InvalidBodyError = require('../errors/invalid-body-error')

// Symbols
const INPUT_FILTERS = Symbol('inputFilters')
const OUTPUT_FILTERS = Symbol('outputFilters')

/**
 * Filter function for JSON data.
 *
 * @callback jsonFilter
 * @param {Object} data Current state of the data (whatever the last filter put out)
 * @param {Model} model Target (for input filters) or original (for output filters) model instance
 */

/**
 * Parent class for all models.
 *
 * @example
 *   const Model = require('@ripple/five-bells-shared/lib/model').Model
 *   const validate = require('@ripple/five-bells-shared/services/validate')
 *
 *   class Car extends Model {
 *     constructor () {
 *       super()
 *       this.setSchema(validate, 'Car')
 *       this.addInputFilter(function (data, model) {
 *         // Convert year to number
 *         data.year = parseInt(data.year)
 *         return data
 *       })
 *       this.addOutputFilter(function (data, model) {
 *         // Year is presented as a string to the outside world
 *         data.year = String(model.year)
 *         return data
 *       })
 *     }
 *
 *     // Add virtual properties via getters and setters
 *     get description () {
 *       return this.make + ' ' + this.model + ' ' + this.year
 *     }
 *   }
 */
class Model {
  constructor () {
    this[INPUT_FILTERS] = []
    this[OUTPUT_FILTERS] = []
  }

  clone () {
    const cloned = new this.constructor()
    cloned.setDataRaw(this.getDataRaw())
    return cloned
  }

  /**
   * Adds a filter that is run when reading data from an external source.
   *
   * Filters are run in sequence to process JSON data. The output of each
   * function is passed as the input to the next one.
   *
   * This filter will be run every time that a model is being converted from an
   * external source (e.g. JSON or XML) to an active model instance.
   *
   * @param {jsonFilter} filter A filter method to process the data.
   */
  addInputFilter (filter) {
    this[INPUT_FILTERS].push(filter)
  }

  /**
   * Remove an input filter.
   *
   * @param {jsonFilter} filter Reference to the filter to be removed
   */
  removeInputFilter (filter) {
    this._removeFilter(this[INPUT_FILTERS], filter)
  }

  /**
   * Adds a filter that is run when writing data to an external source.
   *
   * Filters are run in sequence to process JSON data. The output of each
   * function is passed as the input to the next one.
   *
   * This filter will be run every time that a model is being converted from
   * @param {jsonFilter} filter A filter method to process the data.
   */
  addOutputFilter (filter) {
    this[OUTPUT_FILTERS].push(filter)
  }

  /**
   * Remove an output filter.
   *
   * @param {jsonFilter} filter Reference to the filter to be removed
   */
  removeOutputFilter (filter) {
    this._removeFilter(this[OUTPUT_FILTERS], filter)
  }

  /**
   * Validate external data against schema.
   *
   * Validate the provided data against the schema. The format should be the
   * external format, i.e. what we would receive from a client.
   *
   * The method returns the "cleaned" data. Currently this feature is disabled,
   * but it is still recommended that users of this method continue with the
   * data this method returns.
   *
   * @param {Object} data Data to verify
   * @return {Object} Cleaned data (currently the same as the original data)
   */
  validateData (data) {
    if (this.constructor.schema) {
      let validationResult = this.constructor.validate(this.constructor.schema, data)
      if (!validationResult.valid) {
        throw new InvalidBodyError('JSON request body is not a valid ' +
          this.constructor.schema, validationResult.errors)
      }
      // TODO Might be good to do this for safety:
      // return validationResult.cleanInstance
    }
    return data
  }

  /**
   * Apply a set of JSON data to this instance.
   *
   * @param {Object} data Input data
   */
  setData (data) {
    this.setDataRaw(this._applyFilters(data, this[INPUT_FILTERS]))
  }

  /**
   * Set data to the model instance, bypassing filters.
   *
   * @param {Object} data Input data
   */
  setDataRaw (data) {
    _.merge(this, data)
  }

  /**
   * Get model data as plain old JS object.
   *
   * Applies output filters.
   *
   * @return {Object} Plain, normalized representation of model
   */
  getData () {
    return this._applyFilters(this.getDataRaw(), this[OUTPUT_FILTERS])
  }

  /**
   * Get model data as plain old JS object.
   *
   * Bypasses output filters.
   *
   * @return {Object} Plain representation of model
   */
  getDataRaw () {
    return _.cloneDeep(this)
  }

  /**
   * Internal helper for removing a filter.
   *
   * @param {jsonFilter[]} filters Reference to the list of filters to operate on
   * @param {jsonFilter} filterToRemove The filter that should be removed
   * @return {Object} Resulting data
   *
   * @private
   */
  _removeFilter (filters, filterToRemove) {
    const index = _.indexOf(filters, filterToRemove)
    if (index === -1) {
      throw new Error('Filter not found')
    }
    filters.splice(index, 1)
  }

  /**
   * Internal helper for applying filters.
   *
   * @param {Object} data Data to process
   * @param {jsonFilter[]} filters List of filters to apply
   * @return {Object} Resulting data
   *
   * @private
   */
  _applyFilters (originalData, filters) {
    let data = originalData
    for (let fn of filters) {
      data = fn(data, this)

      if (!data) {
        throw new Error('Invalid filter, did not return data: ' + fn)
      }
    }
    return data
  }

  /**
   * Set a schema to validate against.
   *
   * @param {Function} validate Validation function.
   * @param {String} schema Name of the schema.
   */
  static setSchema (validate, schema) {
    this.validate = validate
    this.schema = schema
  }

  /**
   * Creates instance from raw data.
   *
   * @param {Object} data Raw data.
   * @return {Model} Instance populated with data.
   */
  static fromDataRaw (data) {
    const Self = this

    if (!data) {
      return data
    }

    const model = new Self()
    model.setDataRaw(data)

    return model
  }

  /**
   * Creates instance from data.
   *
   * @param {Object} data Raw data.
   * @return {Model} Instance populated with data.
   */
  static fromData (data) {
    const Self = this

    // TODO We may wish to validate the data against the schema

    const model = new Self()
    model.setData(data)
    return model
  }

  /**
   * Generate a middleware that creates an instance from the request body.
   *
   * This method returns a middleware which will read the request body, parse
   * it, validate it (if the model has set a schema) and create an instace of
   * the model with that data.
   *
   * The resulting model will be added to the Koa context as `this.body`.
   *
   * @return {bodyParserMiddleware} Middleware for parsing model out of JSON body
   */
  static bodyParser () {
    const Self = this

    return function * (next) {
      let json = yield parse(this)

      this.body = new Self()
      json = this.body.validateData(json)
      this.body.setData(json)

      yield next
    }
  }
}

Model.validate = function nullValidate () {
  return { valid: true }
}
Model.schema = null

exports.Model = Model
