'use strict'

const BaseError = require('./base-error')

class InvalidModificationError extends BaseError {
  constructor (message, invalidDiffs) {
    super(message)
    this.invalidDiffs = invalidDiffs
  }

  formatDiff (diff) {
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

  * handler (ctx, log) {
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
}

module.exports = InvalidModificationError
