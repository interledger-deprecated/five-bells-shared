'use strict'
const _ = require('lodash')

const validTransferStates = _.union(require('../schemas/TransferState').enum, ['nonexistent'])

const statePrefix = 'TRANSFER_STATE_'

const transferStates = _.zipObject(_.map(validTransferStates, (state) => {
  return statePrefix + state.toUpperCase()
}), validTransferStates)

const validExecutionStates = [transferStates.TRANSFER_STATE_PREPARED]

const validCancellationStates = [transferStates.TRANSFER_STATE_PROPOSED, transferStates.TRANSFER_STATE_PREPARED]

const finalStates = [transferStates.TRANSFER_STATE_EXECUTED, transferStates.TRANSFER_STATE_REJECTED]

module.exports = {
  transferStates,
  validExecutionStates,
  validCancellationStates,
  finalStates
}
