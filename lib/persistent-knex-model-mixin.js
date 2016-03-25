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

  Model.prototype.save = function (options) {
    const myKnex = knexOrTransaction(knex, options)(Model.tableName)
    const data = this.getDataPersistent()
    if (this.id) {
      return myKnex.update(data).where('id', this.id).then()
    } else {
      return myKnex.insert(data).then()
    }
  }

  Model.prototype.destroy = function (options) {
    const myKnex = knexOrTransaction(knex, options)
    return myKnex(Model.tableName).where('id', this.id).del().then()
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

  Model.findAll = function * findAll (options) {
    // this returns an array of JSON objects
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.from(Model.tableName).select().then()
  }

  Model.findWhere = function * findWhere (where, options) {
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.from(Model.tableName).select().where(where).then()
  }

  Model.findById = function * findById (id, options) {
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.from(Model.tableName).select().where('id', id).then(fromDatabaseModel)
  }

  Model.findByKey = function findByKey (keyName, value, options) {
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.from(Model.tableName).select().where(keyName, value).then(fromDatabaseModel)
  }

  // Optional: transaction
  // set this to knex transaction if you want this operation to be done inside transaction.
  Model.create = function * create (values, options) {
    const model = Model.fromData(values)
    const modelPersistent = model.getDataPersistent()
    const myKnex = knexOrTransaction(knex, options)
    return myKnex.insert(modelPersistent).into(Model.tableName)
  }

  Model.createExternal = function createExternal (values, options) {
    const model = Model.fromDataExternal(values)
    return Model.create(model.getDataPersistent(), options)
  }

  Model.bulkCreate = function * bulkCreate (records, options) {
    const models = records
      .map(Model.fromData.bind(Model))
      .map(_.method('getDataPersistent'))

    yield bulkCreateInternal(models, options)
  }

  Model.bulkCreateExternal = function * bulkCreateExternal (records, options) {
    const models = records
      .map(Model.fromDataExternal.bind(Model))
      .map(_.method('getDataPersistent'))

    yield bulkCreateInternal(models, options)
  }

  // Helper functions
  function * bulkCreateInternal (models, options) {
    const myKnex = knexOrTransaction(knex, options)
    if (models.length > 0) {
      return myKnex(Model.tableName).insert(models)
    }
  }

  Model.destroy = function (options) {
    const myKnex = knexOrTransaction(knex, options)
    const where = options.where || {id: this.id}
    return myKnex(Model.tableName).where(where).del().then()
  }

  function knexOrTransaction (knex, options) {
    return !options ? knex : (!options.transaction ? knex : options.transaction)
  }

  function fromDatabaseModel (result) {
    return result && Array.isArray(result) && result.length > 0
      ? Model.fromDatabaseModel(result) : null
  }
}
