'use strict'

const tweetnacl = require('tweetnacl')
const validate = require('../services/validate')
const InvalidBodyError = require('../errors/invalid-body-error')
const UnmetConditionError = require('../errors/unmet-condition-error')
const hashJson = require('./hashJson')

// TODO: implement other algorithms
function verifySignedMessage (signedMessage) {
  let validationResult = validate('SignedMessageTemplate', signedMessage)
  if (!validationResult.valid) {
    throw new InvalidBodyError(
      'JSON request body is not a valid SignedMessage',
      validationResult.errors)
  }

  let messageHash
  if (signedMessage.message && signedMessage.message_hash) {
    throw new InvalidBodyError(
      'JSON request body should include either message or message_hash, but ' +
      'not both.'
    )
  } else if (signedMessage.message) {
    messageHash = tweetnacl.util.decodeBase64(
      hashJson(signedMessage.message))
  } else if (signedMessage.message_hash) {
    messageHash = tweetnacl.util.decodeBase64(signedMessage.message_hash)
  } else {
    throw new InvalidBodyError(
      'JSON request body should include message or message_hash.'
    )
  }

  let signature = tweetnacl.util.decodeBase64(signedMessage.signature)
  let publicKey = tweetnacl.util.decodeBase64(signedMessage.public_key)

  // TODO: check that the public_key matches the signer field

  let valid

  try {
    valid = tweetnacl.sign.detached.verify(messageHash, signature, publicKey)
  } catch(e) {
    throw new UnmetConditionError('Invalid signature')
  }

  if (!valid) {
    throw new UnmetConditionError('Invalid signature')
  }
}

module.exports = verifySignedMessage
