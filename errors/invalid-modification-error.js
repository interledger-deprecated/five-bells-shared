'use strict'

module.exports = function InvalidModificationError (message, invalidDiffs) {
  Error.captureStackTrace(this, this.constructor)
  this.name = this.constructor.name
  this.message = message
  this.invalidDiffs = invalidDiffs
}

require('util').inherits(module.exports, Error)

module.exports.prototype.formatDiff = function (diff) {
  if (typeof diff !== 'object') {
    return JSON.stringify(diff)
  }

  const path = diff.path ? ' `' + diff.path.join('.') + '`' : ''
  switch (diff.kind) {
    case 'N':
      return 'added' + path + ', value: ' + JSON.stringify(diff.rhs)
    case 'D':
      return 'deleted' + path + ', was: ' + JSON.stringify(diff.lhs)
    case 'E':
      return 'changed' + path + ' from: ' + JSON.stringify(diff.lhs) +
        ' to: ' + JSON.stringify(diff.rhs)
    case 'A':
      return 'array' + path + ', index ' + diff.index +
        ' ' + this.formatDiff(diff.item)
    default:
      return JSON.stringify(diff)
  }
}

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Invalid Modification: ' + this.message)
  if (this.invalidDiffs) {
    for (let diff of this.invalidDiffs) {
      log.debug(' -- ' + this.formatDiff(diff))
    }
  }
  ctx.status = 400
  ctx.body = {
    id: this.name,
    message: this.message,
    invalidDiffs: this.invalidDiffs
  }
}
