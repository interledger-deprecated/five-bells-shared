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
  this.notificationDAO = options.notificationDAO
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
  // Exponential backoff
  const delay = Math.pow(2, retries)
  // If delay becomes really long (over 1 week), give up.
  if (delay >= 60 * 60 * 24 * 7) {
    this.log.debug('Give up on notification ' + notification.id)
    return notification.destroy()
  }
  // Add random jitter
  notification.retry_at = new Date(Date.now() + Math.round(1000 * delay * (0.8 + Math.random() * 0.4)))
  this.log.debug('Notification ' + notification.id + ' new retry_count: ' + notification.retry_count + ', new retry_at: ' + notification.retry_at)
  return this.notificationDAO.updateNotification(notification)
}

NotificationScheduler.prototype.processQueue = function * () {
  const notifications = yield this.notificationDAO.getReadyNotifications()
  this.log.debug('processing ' + notifications.length + ' notifications')
  yield notifications.map(this.processNotification.bind(this))
  yield this.scheduleProcessing()
}

NotificationScheduler.prototype._getTimeToEarliestNotification = function * () {
  // Get Date.now() for the diff _before_ calling _getEarliestNotification()
  // to ensure that the diff is >=0.
  const now = Date.now()
  const earliestNotification =
    yield this.notificationDAO.getEarliestNotification()
  const retryAt = earliestNotification && earliestNotification.retry_at
  if (!retryAt) return
  return Math.min(retryAt - now, MAX_32INT)
}

module.exports = NotificationScheduler
