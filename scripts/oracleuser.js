#!/usr/bin/env node
'use strict'

const co = require('co')

// Environment variable SHARED_DB_ENV should be set according to deployment type
// E.g., 'production' or 'staging'.
// This is used to look up Knex configuration in knexfile.js
const knexConfigEnv = process.env.SHARED_DB_ENV ? process.env.SHARED_DB_ENV
      : 'development'
const knexConfig = require('../knexfile')[knexConfigEnv]

const argv = process.argv
const args = argv.slice(2)
const command = args[0]

if (args.length < 4 || !isCommand(command)) {
  console.log('This command connects to Oracle database with first (most likely sysadmin) account, and creates a new database that belongs to another user.')
  console.log('Usage: node oracledb.js command admin_username admin_password new_username new_password')
  console.log('Or   : node oracledb.js command admin_username admin_password -file/-f user_list_in_json_file')
  console.log('       command: create (c) or delete (d)')
  console.log('Note: make sure DYLD_LIBRARY_PATH environment variable is set, and strong-oracle module is installed.')
  process.exit(1)
}

const system_user = args[1]
const system_pass = args[2]

let newusers = []

if (args[3] === '-file' || args[3] === '-f') {
  newusers = require(args[4])
} else {
  newusers = [{
    'username': args[3],
    'password': args[4]
  }]
}

function isCommand (c) {
  return c === 'create' || c === 'c' || c === 'delete' || c === 'd'
}

knexConfig.connection.user = system_user
knexConfig.connection.password = system_pass
const knex = require('knex')(knexConfig)

let sqlArray

co(function * () {
  for (const user of newusers) {
    console.log('user: ' + JSON.stringify(user, null, 2))
    const new_user = user.username
    const new_password = user.password

    if (command === 'create' || command === 'c') {
      sqlArray = [
        'CREATE USER ' + new_user + ' IDENTIFIED BY ' + new_password,
        'grant ALL PRIVILEGES to ' + new_user
      ]
    } else if (command === 'delete' || command === 'd') {
      sqlArray = [ 'DROP USER ' + new_user + ' CASCADE' ]
    }

    for (const sql of sqlArray) {
      yield knex.raw(sql)
    }
  }
}).then(function (value) {
  console.log('OK')
  process.exit(0)
}, function (err) {
  console.error(err.stack)
  process.exit(1)
})
