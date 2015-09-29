module.exports = function (wallaby) {
  return {
    files: [
      'errors/*.js',
      'lib/*.js',
      'middlewares/*.js',
      'schemas/*.json',
      'services/*.js',
      'testHelpers/*.js',
      'utils/*.js',
      'index.js'
    ],

    tests: [
      'test/*Spec.js'
    ],

    testFramework: 'mocha',

    env: {
      type: 'node',
      runner: '/usr/local/bin/node',
      params: {
        env: 'NODE_ENV=unit'
      }
    }
  }
}
