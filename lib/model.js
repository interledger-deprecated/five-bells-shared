'use strict'

const _ = require('lodash')
const parseBody = require('co-body')

const InvalidBodyError = require('../errors/invalid-body-error')
const ServerError = require('../errors/server-error')

/**
 * Parent class for all models.
 *
 * @example
 * const Model = require('five-bells-shared/lib/model').Model
 *
 * class Car extends Model {
 *   constructor () {
 *     super()
 *   }
 *
 *   // Define filters for external data formats
 *   static convertFromExternal (data) {
 *     // Convert year to number
 *     data.year = parseInt(data.year)
 *     return data
 *   }
 *   static convertToExternal (data) {
 *     // Year is presented as a string to the outside world
 *     data.year = String(model.year)
 *     return data
 *   }
 *
 *   // Add a validator for external data
 *   static validateExternal (data) {
 *     if (typeof data.year !== 'string' || data.year.length > 4) {
 *       throw new Error('Invalid year')
 *     }
 *     return true
 *   }
 *
 *   // Add virtual properties via getters and setters
 *   get description () {
 *     return this.make + ' ' + this.model + ' ' + this.year
 *   }
 * }
 */
class Model {
  clone () {
    const cloned = new this.constructor()
    cloned.setData(this.getData())
    return cloned
  }

  /**
   * Creates instance from data.
   *
   * @param {Object} data Raw data.
   * @return {Model} Instance populated with data.
   */
  static fromData (data) {
    const Self = this

    if (data instanceof Self) {
      return data
    }

    // TODO We may wish to validate the data against the schema

    const model = new Self()
    model.setData(data)
    return model
  }

  /**
   * Creates instance from raw data.
   *
   * @param {Object} data Raw data.
   * @return {Model} Instance populated with data.
   */
  static fromDataExternal (data) {
    const Self = this

    if (!data) {
      return data
    }

    if (data instanceof Self) {
      return data
    }

    const model = new Self()
    model.setDataExternal(data)

    return model
  }

  /**
   * Set data to the model instance, bypassing filters.
   *
   * @param {Object} data Input data
   * @function Model.setData
   */
  setData (data) {
    return _.merge(this, data)
  }

  /**
   * Apply a set of JSON data (in external format) to this instance.
   *
   * @param {Object} data Input data
   */
  setDataExternal (data) {
    this.setData(this._applyFilter(this.constructor.convertFromExternal, data))
  }

  /**
   * Get model data as plain old JS object.
   *
   * Bypasses output filters.
   *
   * @return {Object} Plain representation of model
   */
  getData () {
    return _.assign({}, _.cloneDeep(this))
  }

  /**
   * Get model data as plain old JS object.
   *
   * Applies output filters.
   *
   * @return {Object} Plain, normalized representation of model
   */
  getDataExternal () {
    return this._applyFilter(this.constructor.convertToExternal, this.getData())
  }

  _applyFilter (filter, data0) {
    let data = _.isObject(data0) ? _.assign({}, _.cloneDeep(data0)) : data0

    data = filter(data, this)

    if (!data) {
      throw new ServerError('Invalid filter, did not return data: ' + filter)
    }
    return data
  }

  /**
   * Filter any data incoming from the outside world.
   *
   * You can override this method to add data mutations anytime external
   * data is passed in. This can include format conversions, sanitization and
   * the like.
   *
   * The data passed in is cloned, so feel free to modify the data object.
   *
   * You must return the data object, or you will trigger an error.
   *
   * @param {Object} data External data
   * @return {Object} Internal data
   */
  static convertFromExternal (data) {
    return data
  }

  /**
   * Filter any data being sent to the outside world.
   *
   * You can override this method to add filtering behavior anytime data is
   * passed to the outside. This can include format conversions, converting
   * local IDs to URIs and the like.
   *
   * The data passed to this method is cloned, so feel free to modify the data
   * object.
   *
   * filterInput(filterOutput(data)) should be idempotent although it may
   * normalize the data.
   *
   * You must return the data object, or you will trigger an error.
   *
   * @param {Object} data Internal data
   * @return {Object} External data
   */
  static convertToExternal (data) {
    return data
  }

  /**
   * Validate incoming external data.
   *
   * Models may override this method to validate external data against a
   * schema.
   *
   * @param {object} data Data to be validated
   * @return {ValidationResult} Result of the validation
   */
  static validateExternal (data) {
    return {
      valid: true,
      errors: []
    }
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
  static createBodyParser () {
    const Self = this

    return function * (next) {
      let json = yield parseBody(this)
      const validationResult = Self.validateExternal(json)
      if (validationResult.valid !== true) {
        const message = validationResult.schema
          ? 'Body did not match schema ' + validationResult.schema
          : 'Body did not pass validation'
        throw new InvalidBodyError(message, validationResult.errors)
      }

      const model = new Self()
      model.setDataExternal(json)
      this.body = model

      yield next
    }
  }
}

module.exports = Model
