'use strict'

module.exports = {

  // Set environment variables DYLD_LIBRARY_PATH='/opt/oracle/instantclient'
  development: {
    'debug': true,
    'client': 'strong-oracle',
    'connection': {
      database: '',
      hostname: '192.168.99.100:49161/', // Set this to IP or hostname Oracle Docker is on
      // user: 'system', // Use system user ONLY FOR TESTING
      // password: 'oracle',
      adapter: 'oracle'
    },
    pool: {
      min: 0,
      max: 7
    }
  },
  // Test with Oracle on Linux (e.g. on CircleCI)
  // Set environment variables
  // NOTARY_DB_ENV=oracledci LD_LIBRARY_PATH='/opt/oracle/instantclient'
  oracleci: {
    'debug': true,
    'client': 'strong-oracle',
    'connection': {
      database: '',
      hostname: 'localhost:49161/', // Set this to IP or hostname Oracle Docker is on
      user: 'system', // Use system user ONLY FOR TESTING
      password: 'oracle',
      adapter: 'oracle'
    },
    pool: {
      min: 0,
      max: 7
    }
  }
}
