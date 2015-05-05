'use strict';

const _ = require('lodash');
const validate = require('../services/validate');
const InvalidBodyError = require('../errors/invalid-body-error');
const verifySignedMessage = require('./verifySignedMessage');

// TODO: implement other algorithms
function verifyExecutionCondition(executionCondition, fulfillment) {

  let validationResult = validate('ExecutionCondition', executionCondition);
  if (!validationResult.valid) {
    throw new InvalidBodyError(
      'JSON request body is not a valid ExecutionCondition',
      validationResult.errors);
  }
  validationResult = validate('ExecutionConditionFulfillment', fulfillment);
  if (!validationResult.valid) {
    throw new InvalidBodyError(
      'JSON request body is not a valid ExecutionConditionFulfillment',
      validationResult.errors);
  }

  const signedMessage = _.clone(executionCondition);
  signedMessage.signature = fulfillment.signature;

  return verifySignedMessage(signedMessage);
}

module.exports = verifyExecutionCondition;
