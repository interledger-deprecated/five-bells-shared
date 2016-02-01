'use strict'

module.exports = function (caseID, state) {
  return 'urn:notary:' + caseID + ':' + state
}
