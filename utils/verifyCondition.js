'use strict'

const _ = require('lodash')
const validate = require('../services/validate')
const InvalidBodyError = require('../errors/invalid-body-error')
const verifySignedMessage = require('./verifySignedMessage')

function verifyCondition (condition, fulfillment) {
  let validationResult = validate('Condition', condition)
  if (!validationResult.valid) {
    throw new InvalidBodyError(
      'JSON request body is not a valid Condition',
      validationResult.errors)
  }
  validationResult = validate('ConditionFulfillment', fulfillment)
  if (!validationResult.valid) {
    throw new InvalidBodyError(
      'JSON request body is not a valid ConditionFulfillment',
      validationResult.errors)
  }

  const signedMessage = _.clone(condition)
  signedMessage.signature = fulfillment.signature

  return verifySignedMessage(signedMessage)
}

module.exports = verifyCondition
