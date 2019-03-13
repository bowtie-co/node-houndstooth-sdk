const toml = require('toml')
const yaml = require('js-yaml')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const Collection = require('./Collection')

class Jekyll extends Base {
  constructor (options = {}) {
    verifyRequired(options, [ 'github', 'owner', 'repo' ])

    super(options)

    const { owner, repo } = options

    this.repoPath = `${owner}/${repo}`
    this.repoParams = { owner, repo }
    this.defaultParams = this.repoParams
  }

  config (params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('config')) {
          return resolve(this._cached('config'))
        }

        this.logger.info(`Loading jekyll config for: ${this.repoPath}`)

        this.github.files(this._params(params)).then(({ files }) => {
          const configFile = files.find(file => file.type === 'file' && /^_config\.(to|ya?)ml$/i.test(file.name))

          if (configFile) {
            this.github.files(this._params(params, { path: configFile.path })).then(({ file }) => {
              const content = Buffer.from(file.content, 'base64').toString()
              let config = {}

              if (/toml$/.test(file.path)) {
                config = toml.parse(content)
              } else {
                config = yaml.safeLoad(content)
              }

              resolve(this._cache('config', config))
            }).catch(reject)
          } else {
            reject(new Error('No config file found'))
          }
        }).catch(reject)
      }
    )
  }

  collections (params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('collections')) {
          return resolve(this._cached('collections'))
        }

        this.logger.info(`Loading jekyll collections for: ${this.repoPath}`)

        this.config(params).then(config => {
          let pathPrefix = ''

          if (config['collections_dir']) {
            pathPrefix = config['collections_dir']
          }

          if (pathPrefix.trim() !== '' && !/\/$/.test(pathPrefix)) {
            pathPrefix += '/'
          }

          let collections = []

          if (config['collections']) {
            collections = Object.keys(config['collections']).map(collectionName => {
              return new Collection({
                jekyll: this,
                name: collectionName,
                path: `${pathPrefix}_${collectionName}`
              })
            })
          }

          resolve(this._cache('collections', collections))
        }).catch(reject)
      }
    )
  }

  collection (name, params = {}) {
    return this.collections(params).then(collections => {
      return Promise.resolve(collections.find(coll => coll.name === name))
    })
  }
}

module.exports = Jekyll
