# Five Bells Shared [![Circle CI](https://circleci.com/gh/interledger/five-bells-shared/tree/master.svg?style=svg&circle-token=df06f3b2d8bce028f8b2410d8b993285c3da5c9b)](https://circleci.com/gh/interledger/five-bells-shared/tree/master)

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

``` js
const log = require('five-bells-shared/services/log')('transfers');

log.debug('very boring information');
log.info('somewhat useful information');
log.warn('sort of important information');
log.error('super-important information');
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
## JSON signing

JSONSigning module provides API for adding signature block, and verifying it, in a JSON object.  The format follows JSON Cleartext Signature (JCS) specification.

### Usage

```
JSONSigning.sign (json, cryptoType, privateKey, publicKey)

  json : JSON object.  Must not have "signature" block at the top level.
  cryptoType : "PS256" for RSA PSS, or "ES256" for ECDSA
  privateKey : Private key.
               For RSA, it can be a PEM format string, or jsrsasign RSA key object.
               For ECDSA, it has to be jsrsasign ECDSA key object.
  publicKey  : Public key.
               This is not needed for
               For ECDSA, it has to be jsrsasign ECDSA key object.

  Returns copy of JSON object with "signature" block added.  It does not modify the original JSON object.

JSONSigning.verify (json, cryptoType, publicKey)

  json : JSON object.  Must have "signature" block at the top level.
  cryptoType : "PS256" for RSA PSS, or "ES256" for ECDSA
  publicKey  : Public key.
               For RSA, it can be a PEM format string, or jsrsasign RSA key object.
               For ECDSA, it has to be jsrsasign ECDSA key object.

  Returns true (signature is valid) or false (otherwise)
```
