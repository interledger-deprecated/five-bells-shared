'use strict'

const _ = require('lodash')
const chai = require('chai')
const expect = chai.expect
const sinonChai = require('sinon-chai')

const Model = require('..').Model

chai.use(sinonChai)

describe('Model', function () {
  beforeEach(function () {
    this.Vehicle = class Vehicle extends Model {}

    this.Car = class Car extends this.Vehicle {
      static convertFromExternal (data) {
        data.make = _.startCase(data.make)
        return data
      }

      static convertToExternal (data) {
        data.make = data.make.toLowerCase()
        return data
      }
    }

    this.exampleCarData = { make: 'blah' }
  })

  describe('setData', function () {
    it('should apply the filters', function () {
      const car = new this.Car()
      car.setDataExternal({ make: 'foo' })

      expect(car.getData()).to.deep.equal({ make: 'Foo' })
    })

    it('should throw if filter does not return data', function () {
      class WeirdCar extends this.Car {
        static convertFromExternal (data) {
          data = super.convertFromExternal(data)

          data.make = data.make + 'wat'
        }
      }

      const car = new WeirdCar()

      expect(function () {
        car.setDataExternal({ make: 'foo' })
      }).to.throw(Error, /Invalid filter, did not return data/)
    })

    describe('in a subclassed model', function () {
      beforeEach(function () {
        this.Mercedes = class Mercedes extends this.Car {
          static convertFromExternal (data) {
            data = super.convertFromExternal(data)

            if (typeof data.model === 'string' &&
                data.model.length === 1) {
              data.model = data.model.toUpperCase() + '-Class'
            }
            return data
          }
        }
      })
      it('should run both levels of filters', function () {
        const car = this.Mercedes.fromDataExternal({
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

      expect(car.getData()).to.deep.equal(car2.getData())
    })
  })

  describe('fromDataExternal', function () {
    it('should apply input filters', function () {
      const car = this.Car.fromDataExternal(this.exampleCarData)

      const expectedData = _.clone(this.exampleCarData)
      expectedData.make = 'Blah'

      expect(car.getData()).to.deep.equal(expectedData)
    })
  })

  describe('fromData', function () {
    it('should not apply any filters', function () {
      const car = this.Car.fromData(this.exampleCarData)

      expect(car.getData()).to.deep.equal(this.exampleCarData)
    })

    it('should return null when being passed null', function () {
      const car = this.Car.fromDataExternal(null)

      expect(car).to.equal(null)
    })
  })
})
