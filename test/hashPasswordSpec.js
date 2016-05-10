'use strict'

const chai = require('chai')
const assert = chai.assert

const hashPassword = require('../utils/hashPassword')

describe('hashPassword', function () {
  it('hashes and verifies', function () {
    return hashPassword('test123')
      .then((hash) => {
        return hashPassword.verifyPassword('test123', hash)
      })
      .then((valid) => {
        assert(valid, 'password did not match')
      })
  })

  describe('verifyPassword', function () {
    it('verifies a password against a previously generated hash', function () {
      const hash = 'AAAAQAAAAQDh2zj04nvKqDiQSOerIqj2K72CKeO80E0gUgojWaHN43B+wCiwCN5/vZRHshp992p7z63g+snecm97tjPiHyAdWnGwVZIuI+Yh73o9AeznO8g6LVS/guRNUnFeqIsMl0QVovvusx95sqhQKiK+9k79rANWdn0aSyqja1bXgRorMlhbI4erOY19k6g0pJeEds7+piet7ghJ1vwtb7BAedaE/WdOyckhwIzjTW2/WNWrY+fuJUGgrGeb9qwpOSxTMzEiMqQV8ehmbz/V1MQDG+X5q89IEOEaHkr62KesPnTOZ6mtv6GCsivD8Zv0mNLt7YQx+gUKMBXbyEvlZ7anwJNBw1d40Fl20QIP8paqH803ghS822ui1mp7bTsBfHgataxYk6o1IIAqT+lq+dcjYq6NdVMIYZUDnZky193YzRR3yF+i483pLc5MJxcjmNp1PhNbmLe/nVGWAnWUtahNZnqnrqNC5IuBWguDADFPWvFRU1/+sc89asMLiVDbiufSS6/YSRDFoUPwp5Sa1Hcb2PrZeMY6TP91vr6Xpb1aZOSIurXYFmZeIkuYvPAfUJx6kyGOHumY/hEj0l9wqvC5WjjdNddbZzU1TRnIVzMucxpakOcwg+lWCaisWWrfdDq7mXK4IA3dV4Xm4Z1lKNWRQW+mgRF+FdJymmkZ4JdLBAjO6g/nGr6xAKgisBtYjxKLUtGOCLiHr7wH9JLa6Mju3r3XPWHQ7e2gpR9ONX55TjMLCGGb/sX9Z5a/qw9Du5bl7vQ='

      return hashPassword.verifyPassword('test', new Buffer(hash, 'base64'))
        .then((valid) => {
          assert(valid, 'password did not match')
        })
    })
  })
})
