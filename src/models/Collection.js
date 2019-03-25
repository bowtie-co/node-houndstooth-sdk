const yaml = require('js-yaml')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const CollectionItem = require('./CollectionItem')

/**
 * Collection class
 */
class Collection extends Base {
  /**
   * Create a Collection object
   *
   * @constructor
   * @param {Object} options - Options for collection
   * @param {Object} options.jekyll - The Jekyll instance for this collection
   * @param {String} options.name - The name of this collection
   * @param {String} options.path - The path to this collection
   */
  constructor (options = {}) {
    super(options)

    verifyRequired(options, [ 'jekyll', 'name', 'path' ])

    this.github = this.jekyll.github
    this.repoPath = this.jekyll.repoPath
    this.repoParams = this.jekyll.repoParams
    this.defaultParams = this.jekyll.defaultParams
  }

  /**
   * Parse Jekyll file path
   *
   * @param {String} path - Path to be parsed (for Jekyll front matter + markdown content)
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with parsed data
   */
  parsePath (path, params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached(path)) {
          return resolve(this._cached(path))
        }

        this.logger.info(`Parsing collection file: ${path} (from: ${this.name})`)

        this.github.files(this._params(params, { path })).then(({ file }) => {
          const defaults = {
            fields: {},
            content: ''
          }

          try {
            const fileContent = Buffer.from(file.content, 'base64').toString()
            const fileParts = fileContent.split('---')

            if (fileParts.length > 1) {
              defaults['fields'] = yaml.safeLoad(fileParts[1])
            }

            if (fileParts.length > 2) {
              fileParts.shift()
              fileParts.shift()
              defaults['content'] = fileParts.join('---')
            }
          } catch (err) {
            this.logger.warn(`Invalid collection fields: ${this.path}`)
          }

          resolve(this._cache(path, defaults))
        }).catch(err => {
          this.logger.warn(`Error from collection: ${this.name} [${this.path}] - Attempting to load: ${path}`)
          this.logger.warn(err)

          resolve(this._cache(path, {}))
        })
      }
    )
  }

  /**
   * Get defaults for a collection (from "_fields.md" file in collection dir)
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with parsed data
   */
  defaults (params = {}) {
    return this.parsePath(`${this.path}/_fields.md`, params)
  }

  /**
   * Load a single key from resolved defaults (fields or content)
   *
   * @param {String} key - Key to be loaded from defaults
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with parsed data for specified key
   */
  defaultsKey (key, params = {}) {
    return this.defaults(params).then(defaults => {
      return Promise.resolve(defaults[key])
    })
  }

  /**
   * Get content for this collection (using defaultsKey method)
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<String>} - Returns promise with parsed content
   */
  content (params = {}) {
    return this.defaultsKey('content', params)
  }

  /**
   * Get fields for this collection (using defaultsKey method)
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with parsed fields
   */
  fields (params = {}) {
    return this.defaultsKey('fields', params)
  }

  /**
   * Load items for this collection
   *
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Array>} - Returns promise with array of CollectionItem objects
   */
  items (params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('items')) {
          return resolve(this._cached('items'))
        }

        this.logger.info(`Loading items for collection: ${this.path}`)

        this.github.files(this._params(params, { path: this.path })).then(({ files }) => {
          let items = []

          if (Array.isArray(files)) {
            items = files.filter(item => {
              return (item.name.substr(0, 1) !== '_')
            }).map(item => {
              return new CollectionItem(Object.assign({}, item, {
                collection: this
              }))
            })
          } else {
            this.logger.warn(`Invalid collection items: ${this.path}`)
          }

          resolve(this._cache('items', items))
        }).catch(reject)
      }
    )
  }

  /**
   * Create a new item in this collection
   *
   * @param {Object} data - Data for new collection item
   * @param {String} data.name - Name for new collection item
   * @param {Object} [data.fields] - Fields for new collection item
   * @param {String} [data.content] - Content for new collection item
   * @param {String} [data.markdown] - Content for new collection item
   * @param {Object} [params] - Additional params (sent to github)
   */
  createItem (data, params = {}) {
    verifyRequired(data, [ 'name' ])

    data['path'] = `${this.path}/${data['name']}`
    data['collection'] = this

    const item = new CollectionItem(data)

    return item.save(params)
  }
}

module.exports = Collection
