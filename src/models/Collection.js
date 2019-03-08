const yaml = require('js-yaml')
const { verifySchema, verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const CollectionItem = require('./CollectionItem')

class Collection extends Base {
  constructor(options = {}) {
    super(options)

    verifyRequired(options, [ 'jekyll', 'name', 'path' ])

    this.github = this.jekyll.github
    this.repoPath = this.jekyll.repoPath
    this.repoParams = this.jekyll.repoParams
    this.defaultParams = this.jekyll.defaultParams
  }

  parsePath(path, params = {}) {
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
              defaults['content'] = fileParts[2]
            }
          } catch (err) {
            this.logger.warn(`Invalid collection fields: ${this.path}`)
          }

          resolve(this._cache(path, defaults))
        }).catch(err => {
          this.logger.warn(`Error from collection: ${this.name} [${this.path}]`)
          this.logger.warn(err)

          resolve(this._cache(path, {}))
        })
      }
    )
  }

  defaults (params = {}) {
    return this.parsePath(`${this.path}/_fields.md`, params)
  }

  defaultsKey(key, params = {}) {
    return this.defaults(params).then(defaults => {
      return Promise.resolve(defaults[key])
    })
  }

  content (params = {}) {
    return this.defaultsKey('content', params)
  }

  fields (params = {}) {
    return this.defaultsKey('fields', params)
  }

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
}

module.exports = Collection
