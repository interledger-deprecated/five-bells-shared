# Five Bells Shared [![npm][npm-image]][npm-url] [![circle][circle-image]][circle-url] [![codecov][codecov-image]][codecov-url]

[npm-image]: https://img.shields.io/npm/v/five-bells-shared.svg?style=flat
[npm-url]: https://npmjs.org/package/five-bells-shared
[circle-image]: https://circleci.com/gh/interledgerjs/five-bells-shared.svg?style=shield
[circle-url]: https://circleci.com/gh/interledgerjs/five-bells-shared
[codecov-image]: https://codecov.io/gh/interledgerjs/five-bells-shared/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/interledgerjs/five-bells-shared

> Shared module among Five Bells Node.js apps

## Installation

``` sh
npm install --save five-bells-shared
```

## Schema Validator

This module contains a schema validator.

## Log Service

The log service uses [mag](https://github.com/mahnunchik/mag) and a custom formatter to generate pretty logs like this:

![Example log output](docs/assets/log-example.png)

### Usage

Set up the logger somewhere in your top-level app:

``` js
const hub = require('mag-hub')
const mag = require('mag')
const log = require('five-bells-shared/lib/log')

module.exports = log(mag, hub)
```

Then use it from anywhere using `require('mag')`:

``` js
const log = require('mag')('transfers')

log.debug('very boring information')
log.info('somewhat useful information')
log.warn('sort of important information')
log.error('super-important information')
```

### Caveat

If you're using `mag` in a module which is `npm link`ed, it will receive its own instance of `mag` and messages will not be formatted correctly. To solve this problem, you can install the `mag` module globally and link it in all of your local modules:

``` sh
sudo npm install -g mag
npm link mag # in each module directory
```

## Log Test Helper

The log helper is useful in tests to mute the log output of tests and print it if the test fails.

### Usage

``` js
const logHelper = require('five-bells-shared/testHelpers/log');

describe('Transfers', function () {
  logHelper();

  // ...
});
```

