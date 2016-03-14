'use strict'

const url = require('url')
const _ = require('lodash')
const pathToRegexp = require('path-to-regexp')
const InvalidUriParameterError = require('../errors/invalid-uri-parameter-error')
const InvalidUriError = require('../errors/invalid-uri-error')

/**
 * Parses URI with awareness of local resources.
 *
 * Knows about the different resource endpoints and can parse URIs returning
 * the type of resource and any useful parameters. It can also construct URIs
 * based on type and parameters.
 */
class UriManager {
  /**
   * Constructor.
   *
   * @param {String} base Should correspond to the public base URI.
   */
  constructor (base) {
    this.base = base
    this.baseParsed = url.parse(base)
    this.routes = []
    this.types = {}
  }

  /**
   * Register a new resource type.
   *
   * This is called initially during startup to define the different resources
   * and their corresponding URI endpoints.
   *
   * @param {String} type Type of resource.
   * @param {String} path Path (route) for this resource, e.g. '/foos/:id'
   */
  addResource (type, path) {
    const keys = []
    const re = pathToRegexp(path, keys)
    const keyNames = _.map(keys, 'name')

    // The first result of the regex will be the whole path
    keyNames.unshift('path')

    this.routes.push(function (localPart) {
      // Check if this route matches the URI
      const match = re.exec(localPart)
      if (!match) {
        return false
      }

      // Parse the URI extracting any parameters
      const params = _.zipObject(keyNames, match)

      // We also want to indicate which URI matched
      params.type = type

      return params
    })

    this.types[type] = {
      compiler: pathToRegexp.compile(path),
      keys: keys
    }
  }

  /**
   * Determines if a URI matches any local resource.
   *
   * This method will compare a URI first against the local base URI to
   * determine if it is a local URI at all. Then, it will compare it against
   * all registered local resource URI types. If any match it will parse the
   * URI and return an object with information about the type of resource and
   * any parameters that were included in the URI.
   *
   * @param {String} uri URI to be parsed/analyzed
   * @param {String} requiredType If provided, URI must be of this type or an error is raised.
   * @return {Object} Description of the URI with contextual information.
   */
  parse (uri, requiredType) {
    const parsed = url.parse(uri)

    // Match to the base path such that we enforce the right case-sensitivity:
    // - protocol is not case sensitive
    // - host is not case sensitive
    // - path is case sensitive
    parsed.local =
      _.startsWith(uri.toLowerCase(), this.base.toLowerCase()) &&
      _.startsWith(parsed.path, this.baseParsed.path)

    // For local URIs we want to know if it matches a specific local resource
    if (parsed.local && parsed.hash === null && parsed.search === null) {
      const localPart = uri.slice(this.base.length)

      // Test against all defined local routes
      for (let route of this.routes) {
        const match = route(localPart)
        if (match) {
          // If a route matches, copy the properties into our result
          _.merge(parsed, match)

          // And don't try any more routes
          break
        }
      }
    }

    if (requiredType &&
        (!parsed.local || parsed.type !== requiredType)) {
      throw new InvalidUriError('URI is not a valid ' + requiredType + ' URI: ' + uri)
    }

    return parsed
  }

  /**
   * Create a new URI based on a type and ordered parameters.
   *
   * @param {String} type Type of URI
   * @param {...*} params List of values to fill in to URI parameters
   * @return {String} Complete, absolute URI
   */
  make (type) {
    const typeInfo = this.types[type]
    const paramsList = Array.prototype.slice.call(arguments, 1)

    if (!typeInfo) {
      throw new InvalidUriError('Unknown resource type provided')
    }

    // Convert params list to object
    if (typeInfo.keys.length !== paramsList.length) {
      throw new InvalidUriParameterError('Incorrect parameter count provided')
    }
    const params = {}
    typeInfo.keys.forEach(function (key, i) {
      params[key.name] = paramsList[i]
    })

    return this.makeWithParams(type, params)
  }

  /**
   * Create a new URI based on a type and ordered parameters.
   *
   * @param {String} type Type of URI
   * @param {Object} params Parameters to fill in
   * @return {String} Complete, absolute URI
   */
  makeWithParams (type, params) {
    const typeInfo = this.types[type]

    if (!typeInfo) {
      throw new InvalidUriError('Unknown resource type provided')
    }

    return this.base + typeInfo.compiler(params)
  }
}

exports.UriManager = UriManager
