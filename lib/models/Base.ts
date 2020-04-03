import EventEmitter from 'eventemitter2';

import { logger } from '../logger';

/**
 * Base class for shared logic
 */
class Base extends EventEmitter {
  /**
   * Constructor for a Base object
   *
   * @constructor
   * @param {Object} [options] - Options for this object, copied onto itself
   */
  constructor (options = {}) {
    super()

    this.logger = logger
    this.cached = {}
    this.defaultParams = {}

    Object.assign(this, options)
  }

  /**
   * Construct params object, starting with this.defaultParams
   *
   * @returns {Object} - Returns any params given merged ontop of defaultParams
   */
  _params () {
    return Object.assign({}, this.defaultParams, ...arguments)
  }

  /**
   * Check if a given key is cached
   *
   * @param {String} key - Key to check for in the cache
   */
  _isCached (key) {
    return typeof this.cached[key] !== 'undefined'
  }

  /**
   * Get cached value for a given key
   *
   * @param {String} key - Key to return value for from cache
   */
  _cached (key) {
    if (this._isCached(key)) {
      this.logger.info(`Loading cached key: ${key}`)
    }

    return this.cached[key]
  }

  /**
   * Cache a new key/value pair
   *
   * @param {String} key - Key to be cached
   * @param {*} value - Value to be cached
   */
  _cache (key, value) {
    this.cached[key] = value

    return value
  }

  /**
   * Clear key (or all keys) from cache
   *
   * @param {String} [key] - Optional key to clear from cache, otherwise clear all
   */
  clearCache (key) {
    if (key && this.cached[key]) {
      delete this.cached[key]
    } else {
      this.cached = {}
    }
  }
}

module.exports = Base
