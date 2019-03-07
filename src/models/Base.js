const logger = require('../logger')

class Base {
  constructor(options = {}) {
    this.logger = logger
    this.options = options
    this.cache = typeof options.cache !== 'undefined' ? !!options.cache : true
    this.cached = {}
  }

  _isCached(key, params = {}) {
    return this.cached[key] && this.cache && params['cache'] !== false
  }

  _cached(key, params = {}) {
    if (typeof this.cached[key] !== 'undefined') {
      this.logger.info(`Loading cached key: ${key}`)
    }

    return this.cached[key]
  }

  _cache(key, value, params = {}) {
    if (this.cache && params['cache'] !== false) {
      this.cached[key] = value
    }

    return value
  }

  clearCache() {
    this.cached = {}
  }
}

module.exports = Base
