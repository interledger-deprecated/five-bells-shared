'use strict'

const _ = require('lodash')
const parse = require('co-body')
const InvalidBodyError = require('../errors/invalid-body-error')

const defaultOptions = exports.defaultOptions = {
  underscored: true,
  classMethods: {
    filterInput: function (data) {
      return data
    },
    filterOutput: function (data) {
      return data
    },
    bodyParser: function () {
      const Self = this
      return function * (next) {
        let json = yield parse(this)

        Self.validateSchema(json)
        this.body = Self.applyFilter(Self.filterInput, json)

        yield next
      }
    },
    applyFilter: _.curry(function (filter, data0) {
      let data = _.assign({}, _.cloneDeep(data0))

      data = filter(data, this)

      if (!data) {
        throw new Error('Invalid filter, did not return data: ' + filter)
      }
      return data
    }),
    createFromExternal: function (data) {
      return this.create(this.applyFilter(this.filterInput, data))
    },
    buildFromExternal: function (data) {
      return this.build(this.applyFilter(this.filterInput, data))
    },
    bulkCreateExternal: function (rows0) {
      let rows = rows0.map(this.applyFilter(this.filterInput))
      return this.bulkCreate(rows)
    },
    validateSchema: function (data) {
      if (this.validator) {
        let validationResult = this.validator(data)
        if (!validationResult.valid) {
          // TODO This error message is printing the model name, should print the schema name
          throw new InvalidBodyError('JSON request body is not a valid ' + this.name, validationResult.errors)
        }
        // TODO Might be good to do this for safety:
        // return validationResult.cleanInstance
      }
    }
  },
  instanceMethods: {
    toJSONExternal: function () {
      const Self = this.Model
      // Omit empty (null) fields in output
      const data = _.omit(this.toJSON(), _.isNull)
      // TODO: Should we expose these properties?
      delete data.created_at
      delete data.updated_at
      return Self.applyFilter(Self.filterOutput)(data)
    }
  }
}

exports.getOptions = function (options0) {
  const options = _.merge({}, defaultOptions, options0)
  return options
}
