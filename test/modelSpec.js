'use strict'

const _ = require('lodash')
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

const Model = require('../lib/model').Model
const InvalidBodyError = require('../errors/invalid-body-error')

chai.use(sinonChai)

describe('Model', function () {
  beforeEach(function () {

    this.Vehicle = class Vehicle extends Model {
      constructor () {
        super()
      }
    }
    this.startCaseInputFilter = function (data) {
      data.make = _.startCase(data.make)
      return data
    }
    this.lowerCaseOutputFilter = function (data) {
      data.make = data.make.toLowerCase()
      return data
    }

    const ctx = this
    this.Car = class Car extends this.Vehicle {
      constructor () {
        super()

        this.addInputFilter(ctx.startCaseInputFilter)
        this.addOutputFilter(ctx.lowerCaseOutputFilter)
      }
    }

    this.exampleCarData = { make: 'blah' }
  })

  describe('removeInputFilter', function () {
    it('should remove a filter', function () {
      sinon.spy(this.Car.prototype, '_applyFilters')

      const car = new this.Car()
      car.removeInputFilter(this.startCaseInputFilter)
      car.setData({})

      expect(this.Car.prototype._applyFilters).calledWith({}, [])
    })

    it('should fail if the filter was not found', function () {
      sinon.spy(this.Car.prototype, '_applyFilters')

      const car = new this.Car()
      expect(function () {
        car.removeInputFilter(function () {})
      }).to.throw(Error, /Filter not found/)
    })
  })

  describe('removeOutputFilter', function () {
    it('should remove a filter', function () {
      sinon.spy(this.Car.prototype, '_applyFilters')

      const car = new this.Car()
      car.removeOutputFilter(this.lowerCaseOutputFilter)
      car.getData()

      expect(this.Car.prototype._applyFilters).calledWith({}, [])
    })

    it('should fail if the filter was not found', function () {
      sinon.spy(this.Car.prototype, '_applyFilters')

      const car = new this.Car()
      expect(function () {
        car.removeOutputFilter(function () {})
      }).to.throw(Error, /Filter not found/)
    })
  })

  describe('validateData', function () {
    it('should call the validator', function () {
      const validator = sinon.spy(Model.validate)
      this.Car.setSchema(validator, 'ExampleSchema')
      const car = new this.Car()

      car.validateData(this.exampleCarData)

      expect(validator).calledWithExactly('ExampleSchema', this.exampleCarData)
    })
    it('should throw if the validation fails', function () {
      const validator = function () {
        return { valid: false }
      }
      this.Car.setSchema(validator, 'ExampleSchema')
      const car = new this.Car()
      const exampleData = this.exampleCarData

      expect(function () {
        car.validateData(exampleData)
      }).to.throw(InvalidBodyError, /JSON request body is not a valid ExampleSchema/)
    })
  })

  describe('setData', function () {
    it('should apply the filters', function () {
      const car = new this.Car()
      car.setData({ make: 'foo' })

      expect(car.getDataRaw()).to.deep.equal({ make: 'Foo' })
    })
    it('should throw if filter does not return data', function () {
      class WeirdCar extends this.Car {
        constructor () {
          super()

          this.addInputFilter(function (data) {
            data.make = data.make + 'wat'
          })
        }
      }

      const car = new WeirdCar()

      expect(function () {
        car.setData({ make: 'foo' })
      }).to.throw(Error, /Invalid filter, did not return data/)
    })

    describe('in a subclassed model', function () {
      beforeEach(function () {
        this.Mercedes = class Mercedes extends this.Car {
          constructor () {
            super()

            this.addInputFilter(function (data) {
              if (typeof data.model === 'string' &&
                  data.model.length === 1) {
                data.model = data.model.toUpperCase() + '-Class'
              }
              return data
            })
          }
        }
      })
      it('should run both levels of filters', function () {
        const car = this.Mercedes.fromData({
          make: 'mercedes',
          model: 'c'
        })

        expect(car.make).to.equal('Mercedes')
        expect(car.model).to.equal('C-Class')
      })
    })
  })

  describe('clone', function () {
    it('should return an object with equivalent data', function () {
      const car = this.Car.fromData(this.exampleCarData)

      const car2 = car.clone()

      expect(car.getDataRaw()).to.deep.equal(car2.getDataRaw())
    })
  })

  describe('fromData', function () {
    it('should apply input filters', function () {
      const car = this.Car.fromData(this.exampleCarData)

      const expectedData = _.clone(this.exampleCarData)
      expectedData.make = 'Blah'

      expect(car.getDataRaw()).to.deep.equal(expectedData)
    })
  })

  describe('fromDataRaw', function () {
    it('should not apply any filters', function () {
      const car = this.Car.fromDataRaw(this.exampleCarData)

      expect(car.getDataRaw()).to.deep.equal(this.exampleCarData)
    })

    it('should return null when being passed null', function () {
      const car = this.Car.fromDataRaw(null)

      expect(car).to.equal(null)
    })
  })
})
