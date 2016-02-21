'use strict'
const co = require('co')
const defer = require('co-defer')
const MAX_32INT = 2147483647

/**
 * Callback to process a notification.
 * @callback processNotification
 * @param {Object} notification
 * @return {Promise}
 */

/**
 * @param {Object} options
 * @param {Class} options.Notification
 * @param {Object} options.knex
 * @param {Logger} options.log
 * @param {processNotification} options.processNotification
 */
function NotificationScheduler (options) {
  this.Notification = options.Notification
  this.knex = options.knex
  this.log = options.log
  this.processNotification = options.processNotification
  this._timeout = null
}

NotificationScheduler.prototype.isEnabled = function () { return !!this._timeout }

NotificationScheduler.prototype.start = function () {
  if (this._timeout) return
  this._timeout = defer.setTimeout(this.processQueue.bind(this), 0)
}

NotificationScheduler.prototype.stop = function () {
  if (!this._timeout) return
  clearTimeout(this._timeout)
  this._timeout = null
}

// Be sure to call this to schedule any retries, otherwise they will never be executed.
NotificationScheduler.prototype.scheduleProcessing = co.wrap(function * () {
  if (!this._timeout) return
  clearTimeout(this._timeout)
  const timeToEarliestNotification = yield this._getTimeToEarliestNotification()
  if (!timeToEarliestNotification) return

  this._timeout = defer.setTimeout(
    this.processQueue.bind(this),
    timeToEarliestNotification)
})

NotificationScheduler.prototype.retryNotification = function (notification) {
  const retries = notification.retry_count = (notification.retry_count || 0) + 1
  const delay = Math.min(120, Math.pow(2, retries))
  notification.retry_at = new Date(Date.now() + 1000 * delay)
  return notification.save()
}

NotificationScheduler.prototype.processQueue = function * () {
  const notifications = yield this._getReadyNotifications()
  this.log.debug('processing ' + notifications.length + ' notifications')
  yield notifications.map(this.processNotification.bind(this))
  yield this.scheduleProcessing()
}

NotificationScheduler.prototype._getReadyNotifications = function () {
  // Fetch notifications that are ready to be retries. The 100ms padding
  // reduces the number of queries made by fetching clusters of notifications.
  return this.knex(this.Notification.tableName)
    .select()
    .where('retry_at', null)
    .orWhere('retry_at', '<', new Date(Date.now() + 100))
    .then()
}

NotificationScheduler.prototype._getEarliestNotification = function () {
  return this.knex(this.Notification.tableName)
    .select()
    .whereNot('retry_at', null)
    .orderBy('retry_at', 'ASC')
    .limit(1)
    .then(getFirstRecord)
}

function getFirstRecord (results) { return results && results[0] }

NotificationScheduler.prototype._getTimeToEarliestNotification = function * () {
  // Get Date.now() for the diff _before_ calling _getEarliestNotification()
  // to ensure that the diff is >=0.
  const now = Date.now()
  const earliestNotification = yield this._getEarliestNotification()
  const retry_at = earliestNotification && earliestNotification.retry_at
  if (!retry_at) return
  return Math.min(retry_at - now, MAX_32INT)
}

module.exports = NotificationScheduler
