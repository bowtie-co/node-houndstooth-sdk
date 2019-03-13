const yaml = require('js-yaml')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')

class CollectionItem extends Base {
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

  init (params = {}) {
    return this.defaults(params).then(defaults => {
      this.fields = defaults['fields']
      this.markdown = defaults['content']

      return Promise.resolve(this)
    })
  }

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

  defaults (params = {}) {
    return this.collection.parsePath(this.path, params)
  }

  defaultsKey (key, params = {}) {
    return this.defaults(params).then(defaults => {
      return Promise.resolve(defaults[key])
    })
  }

  contentBase64 (params = {}) {
    const fields = this.fields || {}
    const markdown = this.markdown || ''

    return Buffer.from(`---\n${yaml.safeDump(fields)}\n---\n${markdown}\n`).toString('base64')
  }

  // loadContent (params = {}) {
  //   return this.defaultsKey('content', params)
  // }

  // loadFields (params = {}) {
  //   return this.defaultsKey('fields', params)
  // }

  save (params = {}) {
    params['content'] = this.contentBase64(params)

    if (params['ref'] && !params['branch']) {
      params['branch'] = params['ref']
    }

    const githubAction = this.sha ? 'updateFile' : 'createFile'

    return this.github[githubAction](this._params(params)).then(resp => {
      this.logger.info('Updated item file: ' + this.path)
      this.collection.clearCache(this.path)

      return this.reload()
    })
  }

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
}

module.exports = CollectionItem
