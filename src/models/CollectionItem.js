const yaml = require('js-yaml')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')

/**
 * CollectionItem class
 */
class CollectionItem extends Base {
  /**
   * Create a new CollectionItem object
   *
   * @constructor
   * @param {Object} options - Options to create this CollectionItem
   * @param {Object} options.collection - Collection for this CollectionItem
   * @param {String} options.name - Name for this CollectionItem
   * @param {String} options.path - Path for this CollectionItem
   */
  constructor (options = {}) {
    verifyRequired(options, [ 'collection', 'name', 'path' ])

    super(options)

    this.jekyll = this.collection.jekyll
    this.github = this.jekyll.github
    this.repoPath = this.jekyll.repoPath
    this.repoParams = this.jekyll.repoParams
    this.defaultParams = Object.assign({}, this.repoParams, {
      path: this.path,
      sha: this.sha
    })
  }

  /**
   * Initialize this collection item
   * Load fields and content and save to itself
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<CollectionItem>} - Returns promise with itself
   */
  init (params = {}) {
    return this.defaults(params).then(defaults => {
      this.fields = defaults['fields']
      this.body = defaults['body']

      return Promise.resolve(this)
    })
  }

  /**
   * Reload this collection item (update attributes & sha)
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<CollectionItem>} - Returns promise with itself
   */
  reload (params = {}) {
    return new Promise(
      (resolve, reject) => {
        this.logger.info(`Reloading collection item: ${this.path}`)

        this.github.files(this._params(params)).then(({ file }) => {
          Object.assign(this, file)

          Object.assign(this.defaultParams, {
            sha: this.sha
          })

          resolve(this)
        }).catch(reject)
      }
    )
  }

  /**
   * Get defaults (current fields & body) for this collection item
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with defaults
   */
  defaults (params = {}) {
    return this.collection.parsePath(this.path, params)
  }

  /**
   * Get specific default key for this collection item
   *
   * @param {String} key - Key for default to get (fields or body)
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object|String>} - Returns promise with requested default key data
   */
  defaultsKey (key, params = {}) {
    return this.defaults(params).then(defaults => {
      return Promise.resolve(defaults[key])
    })
  }

  /**
   * Transform this CollectionItem into base64 content (to be sent to github)
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {String} - Returns base64 encoded string of Jekyll style file content
   */
  contentBase64 (params = {}) {
    const fields = this.fields || {}
    const body = this.body || ''

    return Buffer.from(`---\n${yaml.safeDump(fields)}\n---\n${body}\n`).toString('base64')
  }

  // loadContent (params = {}) {
  //   return this.defaultsKey('body', params)
  // }

  // loadFields (params = {}) {
  //   return this.defaultsKey('fields', params)
  // }

  /**
   * Save this CollectionItem
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<CollectionItem>} - Returns promise with itself
   */
  save (params = {}) {
    params['content'] = this.contentBase64(params)

    if (params['ref'] && !params['branch']) {
      params['branch'] = params['ref']
    }

    const githubAction = this.sha ? 'updateFile' : 'createFile'

    return this.github[githubAction](this._params(params)).then(resp => {
      this.logger.info('Updated item file: ' + this.path)
      this.collection.clearCache(this.path)

      return this.reload(params)
    })
  }

  /**
   * Delete this CollectionItem
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<CollectionItem>} - Returns promise with itself
   */
  delete (params = {}) {
    if (params['ref'] && !params['branch']) {
      params['branch'] = params['ref']
    }

    return this.github.deleteFile(this._params(params)).then(resp => {
      this.logger.info('Deleted item file: ' + this.path)
      this.collection.clearCache(this.path)

      return Promise.resolve(this)
    })
  }

  /**
   * Rename this CollectionItem
   *
   * @param {String} name - New name for this item
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<CollectionItem>} - Returns promise with itself
   */
  rename (name, params = {}) {
    return this.delete(params).then(() => {
      const { fields, body } = this

      return this.collection.createItem({
        name,
        fields,
        body
      }, params).then(item => {
        Object.assign(this, item)
        return Promise.resolve(this)
      })
    })
  }
}

module.exports = CollectionItem
