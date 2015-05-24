# Five Bells Shared [![Circle CI](https://circleci.com/gh/ripple/five-bells-shared/tree/master.svg?style=svg&circle-token=df06f3b2d8bce028f8b2410d8b993285c3da5c9b)](https://circleci.com/gh/ripple/five-bells-shared/tree/master)

> Shared module among Five Bells Node.js apps

## Installation

``` sh
npm install --save-dev @ripple/five-bells-shared
```

## Schema Validator

This module contains a schema validator.

## Log Service

The log service uses [mag](https://github.com/mahnunchik/mag) and a custom formatter to generate pretty logs like this:

![Example log output](docs/assets/log-example.png)

### Usage

``` js
const log = require('@ripple/five-bells-shared/services/log')('transfers');

log.debug('very boring information');
log.info('somewhat useful information');
log.warn('sort of important information');
log.error('super-important information');
```

## Log Test Helper

The log helper is useful in tests to mute the log output of tests and print it if the test fails.

### Usage

``` js
const logHelper = require('@ripple/five-bells-shared/testHelpers/log');

describe('Transfers', function () {
  logHelper();

  // ...
});
```
