const toml = require('toml')
const yaml = require('js-yaml')
const { verifySchema, verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const Collection = require('./Collection')
const GitHub = require('./GitHub')

class Jekyll extends Base {
  constructor(options = {}) {
    super(options)

    verifyRequired(options, [ 'token', 'owner', 'repo' ])

    const { token, owner, repo } = options

    this.repoPath = `${owner}/${repo}`
    this.repoParams = { owner, repo }
    this.github = new GitHub({ token })
  }

  config(params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('config', params)) {
          return resolve(this._cached('config', params))
        }

        this.logger.info(`Loading jekyll config for: ${this.repoPath}`)

        this.github.files(this.repoParams).then(({ files }) => {
          const configFile = files.find(file => file.type === 'file' && /^_config\.(to|ya?)ml$/i.test(file.name))

          if (configFile) {
            this.github.files(Object.assign({}, this.repoParams, { path: configFile.path })).then(({ file }) => {
              const content = Buffer.from(file.content, 'base64').toString()
              let config = {}

              if (/toml$/.test(file.path)) {
                config = toml.parse(content)
              } else {
                config = yaml.safeLoad(content)
              }

              resolve(this._cache('config', config, params))
            }).catch(reject)
          } else {
            reject(new Error('No config file found'))
          }
        }).catch(reject)
      }
    )
  }

  collections(params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (this._isCached('collections', params)) {
          return resolve(this._cached('collections', params))
        }

        this.logger.info(`Loading jekyll collections for: ${this.repoPath}`)

        this.config().then(config => {
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
                path: `${pathPrefix}_${collectionName}`,
                cache: this.cache
              })
            })
          }

          resolve(this._cache('collections', collections, params))
        }).catch(reject)
      }
    )
  }

  collection(name) {
    this.config().then(config => {

    })
  }
}

module.exports = Jekyll
