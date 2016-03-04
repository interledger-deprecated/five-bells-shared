'use strict'

const chai = require('chai')
const expect = chai.expect
const transferStateDictionary = require('../lib/transferStateDictionary')

describe('transferStateDictionary', function () {
  it('should return all valid transfer states', function () {
    expect(transferStateDictionary.transferStates).to.deep.equal({
      TRANSFER_STATE_PROPOSED: 'proposed',
      TRANSFER_STATE_PREPARED: 'prepared',
      TRANSFER_STATE_EXECUTED: 'executed',
      TRANSFER_STATE_REJECTED: 'rejected',
      TRANSFER_STATE_NONEXISTENT: 'nonexistent'
    })
  })

  it('should return a list of the valid execution states', function () {
    expect(transferStateDictionary.validExecutionStates).to.deep.equal(['prepared'])
  })

  it('should return a list of the valid cancellation states', function () {
    expect(transferStateDictionary.validCancellationStates).to.deep.equal(['proposed', 'prepared'])
  })

  it('should return a list of the final states of a transfer', function () {
    expect(transferStateDictionary.finalStates).to.deep.equal(['executed', 'rejected'])
  })
})
