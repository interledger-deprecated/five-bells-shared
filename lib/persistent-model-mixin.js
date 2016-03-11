'use strict'

const _ = require('lodash')
const DatabaseError = require('../errors/server-error')

const defaultOptions = {
  underscored: true
}

const DATABASE_MODEL = Symbol('databaseModel')

module.exports = function PersistentModelMixin (Model, db, fields, userOptions) {
  const modelOptions = {
    instanceMethods: {
      toInternal: function () {
        return Model.fromDatabaseModel(this)
      }
    }
  }

  const options = _.merge({}, defaultOptions, modelOptions, userOptions)

  // Register model with Sequelize
  const DbModel = Model.DbModel = db.define(Model.name, fields, options)

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

  Model.prototype.setDatabaseModel = function (dbModel) {
    this[DATABASE_MODEL] = dbModel
  }

  Model.prototype.getDatabaseModel = function () {
    if (!this[DATABASE_MODEL]) {
      this[DATABASE_MODEL] = DbModel.build(this.getDataPersistent())
    }
    return this[DATABASE_MODEL]
  }

  Model.prototype.create = function (options) {
    if (this[DATABASE_MODEL]) {
      throw new DatabaseError('Tried to create a model which already exists')
    }
    return this.getDatabaseModel().save(options)
  }

  Model.prototype.save = function (options) {
    return this.getDatabaseModel().update(this.getDataPersistent(), options)
  }

  Model.prototype.destroy = function (options) {
    return this.getDatabaseModel().destroy(options)
  }

  Model.fromDatabaseModel = function (dbModel) {
    const model = new Model()
    model.setDatabaseModel(dbModel)
    model.setDataPersistent(dbModel.toJSON())
    return model
  }

  Model.fromDataPersistent = function (data) {
    const model = new Model()
    model.setDataPersistent(data)
    return model
  }

  Model.findAll = function findAll (options) {
    return DbModel.findAll(options).then(function (results) {
      return results.map(Model.fromDatabaseModel.bind(Model))
    })
  }

  Model.findById = function findById (id, options) {
    return DbModel.findById(id, options).then(fromDatabaseModel)
  }

  Model.findOne = function findOne (options) {
    return DbModel.findOne(options).then(fromDatabaseModel)
  }

  for (let method of ['count', 'findAndCount', 'max', 'min', 'sum', 'truncate']) {
    Model[method] = DbModel[method].bind(DbModel)
  }

  Model.build = function build (values, options) {
    const model = Model.fromData(values)

    return DbModel.build(model.getDataPersistent(), options)
  }

  Model.create = function create (values, options) {
    const model = Model.fromData(values)

    return DbModel.create(model.getDataPersistent(), options).then(fromDatabaseModel)
  }

  Model.upsert = function upsert (values, options) {
    const model = Model.fromData(values)

    return DbModel.upsert(model.getDataPersistent(), options)
  }

  Model.findOrCreate = function findOrCreate (options) {
    return DbModel.findOrCreate(options).spread((instance, created) => {
      return [fromDatabaseModel(instance), created]
    })
  }

  Model.bulkCreate = function bulkCreate (records, options) {
    const models = records
      .map(Model.fromData.bind(Model))
      .map(_.method('getDataPersistent'))

    return DbModel.bulkCreate(models, options)
  }

  Model.buildExternal = function buildExternal (values, options) {
    const model = Model.fromDataExternal(values)

    return DbModel.build(model.getDataPersistent(), options)
  }

  Model.createExternal = function createExternal (values, options) {
    const model = Model.fromDataExternal(values)

    return DbModel.create(model.getDataPersistent(), options)
  }

  Model.upsertExternal = function upsertExternal (values, options) {
    const model = Model.fromDataExternal(values)

    return DbModel.upsert(model.getDataPersistent(), options)
  }

  Model.bulkCreateExternal = function bulkCreateExternal (records, options) {
    const models = records
      .map(Model.fromDataExternal.bind(Model))
      .map(_.method('getDataPersistent'))

    return DbModel.bulkCreate(models, options)
  }

  function fromDatabaseModel (result) {
    return result ? Model.fromDatabaseModel(result) : result
  }
}
