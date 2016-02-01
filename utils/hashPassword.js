'use strict'
const bcrypt = require('bcrypt')

module.exports = function (password) {
  return new Promise(function (resolve, reject) {
    const rounds = 10
    bcrypt.genSalt(rounds, function (error, salt) {
      if (error) {
        return reject(error)
      }
      bcrypt.hash(password, salt, function (err, hash) {
        return err ? reject(err) : resolve(hash)
      })
    })
  })
}
