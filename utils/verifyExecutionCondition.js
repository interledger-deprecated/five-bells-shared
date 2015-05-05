'use strict';

const tweetnacl = require('tweetnacl');
const validate = require('../services/validate');
const InvalidBodyError = require('../errors/invalid-body-error');
const UnmetConditionError = require('../errors/unmet-condition-error');
const hashJson = require('./hashJson');

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

  let messageHash;
  if (executionCondition.message && executionCondition.message_hash) {
    throw new InvalidBodyError(
      'JSON request body should include either message or message_hash, but ' +
      'not both.'
    );
  } else if (executionCondition.message) {
    messageHash = hashJson(executionCondition.message);
  } else if (executionCondition.message_hash) {
    messageHash = tweetnacl.util.decodeBase64(executionCondition.message_hash);
  } else {
    throw new InvalidBodyError(
      'JSON request body should include message or message_hash.'
    );
  }
  let signature = tweetnacl.util.decodeBase64(fulfillment.signature);
  let publicKey = tweetnacl.util.decodeBase64(executionCondition.public_key);

  // TODO: check that the public_key matches the signer field

  let valid;

  try {
    valid = tweetnacl.sign.detached.verify(messageHash, signature, publicKey);
  } catch(e) {
    throw new UnmetConditionError('Invalid signature');
  }

  if (!valid) {
    throw new UnmetConditionError('Invalid signature');
  }
}

module.exports = verifyExecutionCondition;
