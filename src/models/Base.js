const logger = require('../logger')

class Base {
  constructor(options = {}) {
    this.logger = logger
    this.cached = {}
    this.defaultParams = {}

    Object.assign(this, options)
  }

  _params() {
    return Object.assign({}, this.defaultParams, ...arguments)
  }

  _isCached(key, params = {}) {
    return this.cached[key]
  }

  _cached(key, params = {}) {
    if (typeof this.cached[key] !== 'undefined') {
      this.logger.info(`Loading cached key: ${key}`)
    }

    return this.cached[key]
  }

  _cache(key, value, params = {}) {
    this.cached[key] = value

    return value
  }

  clearCache(key) {
    if (key && this.cached[key]) {
      delete this.cached[key]
    } else {
      this.cached = {}
    }
  }
}

module.exports = Base
