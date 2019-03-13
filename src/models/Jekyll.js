const toml = require('toml')
const yaml = require('js-yaml')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const Collection = require('./Collection')

/**
 * Jekyll class
 */
class Jekyll extends Base {
  /**
   * Create a new Jekyll object
   * @param {Object} options - Options for this Jekyll instance
   * @param {GitHub} options.github - GitHub instance for this Jekyll object
   * @param {String} options.owner - Owner name of repo for this Jekyll object
   * @param {String} options.repo - Name of repo for this Jekyll object
   */
  constructor (options = {}) {
    verifyRequired(options, [ 'github', 'owner', 'repo' ])

    super(options)

    const { owner, repo } = options

    this.repoPath = `${owner}/${repo}`
    this.repoParams = { owner, repo }
    this.defaultParams = this.repoParams
  }

  /**
   * Load Jekyll config from repo (_config.yaml or _config.toml)
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with response data
   */
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

  /**
   * Load collections for this Jekyll instance
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Array>} - Returns promise with array of Collections
   */
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

  /**
   * Load a specific collection by name
   * @param {String} name - Name of collection to load
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Collection>} - Returns promise with a single Collection
   */
  collection (name, params = {}) {
    return this.collections(params).then(collections => {
      return Promise.resolve(collections.find(coll => coll.name === name))
    })
  }
}

module.exports = Jekyll
