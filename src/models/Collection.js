const yaml = require('js-yaml')
const { verifySchema, verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const CollectionItem = require('./CollectionItem')

class Collection extends Base {
  constructor(options = {}) {
    super(options)

    verifyRequired(options, [ 'jekyll', 'path' ])

    this.path = options.path
    this.jekyll = options.jekyll
    this.github = this.jekyll.github
    this.repoPath = this.jekyll.repoPath
    this.repoParams = this.jekyll.repoParams
  }

  defaults (params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('defaults', params)) {
          return resolve(this._cached('defaults', params))
        }

        this.logger.info(`Loading defaults for collection: ${this.path}`)

        this.github.files(Object.assign({}, this.repoParams, { path: `${this.path}/_fields.md` })).then(({ file }) => {
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
              defaults['content'] = fileParts[2]
            }
          } catch (err) {
            this.logger.warn(`Invalid collection fields: ${this.path}`)
          }

          resolve(this._cache('defaults', defaults, params))
        }).catch(err => {
          this.logger.warn(err)

          resolve(this._cache('fields', {}, params))
        })
      }
    )
  }

  defaultsKey(key, params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('defaults', params)) {
          return resolve(this._cached('defaults', params)[key])
        }

        this.logger.info(`Loading defaults (${key}) for collection: ${this.path}`)

        this.defaults(params).then(defaults => {
          resolve(defaults[key])
        }).catch(reject)
      }
    )
  }

  content (params = {}) {
    return this.defaultsKey('content')
  }

  fields (params = {}) {
    return this.defaultsKey('fields')
  }

  items (params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('items', params)) {
          return resolve(this._cached('items', params))
        }

        this.logger.info(`Loading items for collection: ${this.path}`)

        this.github.files(Object.assign({}, this.repoParams, { path: this.path })).then(({ files }) => {
          let items = []

          if (Array.isArray(files)) {
            items = files.filter(item => {
              return (item.name.substr(0, 1) !== '_')
            }).map(item => {
              return new CollectionItem(Object.assign({}, item, {
                collection: this,
                cache: this.cache,
              }))
            })
          } else {
            this.logger.warn(`Invalid collection items: ${this.path}`)
          }

          resolve(this._cache('items', items, params))
        }).catch(reject)
      }
    )
  }
}

module.exports = Collection
