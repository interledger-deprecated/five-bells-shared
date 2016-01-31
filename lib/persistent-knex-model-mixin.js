'use strict'
const _ = require('lodash')

module.exports = function PersistentKnexModelMixin (Model, knex, inOptions, userOptions) {
  if (typeof Model.convertFromPersistent !== 'function') {
    Model.convertFromPersistent = function (data) {
      return data
    }
  }

  if (typeof Model.convertToPersistent !== 'function') {
    Model.convertToPersistent = function (data) {
      return data
    }
  }

  /**
   * Set data from database.
   *
   * Applies filters for conversion from database format to normal format.
   */
  Model.prototype.setDataPersistent = function (data) {
    this.setData(this._applyFilter(this.constructor.convertFromPersistent, data))
  }

  Model.prototype.getDataPersistent = function () {
    return this._applyFilter(this.constructor.convertToPersistent, this.getData())
  }

  Model.prototype.save = function * (options) {
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.update(this.getDataPersistent()).into(Model.tableName).where('id', this.id).then()
  }

  // Delete row based on where options
  Model.prototype.destroy = function (selectOptions) {
    return knex(Model.tableName).where(selectOptions).del()
  }

  Model.fromDatabaseModel = function (data) {
    if (!data) return null
    // If result is an array (return from knex select query), take the first object
    if (Array.isArray(data)) {
      data = data[0]
    }
    const model = new Model()
    model.setDataPersistent(data)
    return model
  }

  Model.fromDataPersistent = function (data) {
    const model = new Model()
    model.setDataPersistent(data)
    return model
  }

  Model.findAll = function * findAll () {
    // this returns an array of JSON objects
    return knex(Model.tableName).select().then()
  }
  Model.findById = function * findById (id, options) {
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.from(Model.tableName).select().where('id', id).then(fromDatabaseModel)
  }

  // Optional: transaction
  // set this to knex transaction if you want this operation to be done inside transaction.
  Model.create = function * create (values, options) {
    const model = Model.fromData(values)
    const modelPersistent = model.getDataPersistent()
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.insert(cleanUndefinedAttributes(modelPersistent)).into(Model.tableName)
  }

  Model.bulkCreate = function * bulkCreate (records, options) {
    const models = records
      .map(Model.fromData.bind(Model))
      .map(_.method('getDataPersistent'))

    yield bulkCreateInternal(models)
  }

  Model.bulkCreateExternal = function * bulkCreateExternal (records, options) {
    const models = records
      .map(Model.fromDataExternal.bind(Model))
      .map(_.method('getDataPersistent'))

    yield bulkCreateInternal(models)
  }

  // Helper functions
  function * bulkCreateInternal (models) {
    if (models.length > 0) {
      for (const i in models) {
        models[i] = cleanUndefinedAttributes(models[i])
      }
      return knex(Model.tableName).insert(models)
    }
  }

  function knexOrTransaction (knex, options) {
    return !options ? knex : (!options.transaction ? knex : options.transaction)
  }

  function fromDatabaseModel (result) {
    return result && Array.isArray(result) && result.length > 0
      ? Model.fromDatabaseModel(result) : null
  }

  // If you update or insert into Oracle an object with undefined attributes,
  // Oracle would give you an error.
  // So clean up the undefiend objects.
  // Input: JSON object
  // Output: Same JSON object, but undefined attributes are deleted.
  function cleanUndefinedAttributes (obj) {
    for (const i in obj) {
      if (obj[i] === null || obj[i] === undefined) {
        delete obj[i]
      }
    }
    return obj
  }
}