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
    this.defaultParams = Object.assign({}, this.repoParams)
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

  /**
   * Load data for this Jekyll instance
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Array>} - Returns promise with array of data files/folders
   */
  data (params = {}) {
    return new Promise(
      (resolve, reject) => {
        if (!params['path']) {
          params['path'] = '_data'
        }

        if (this._isCached(params['path'])) {
          return resolve(this._cached(params['path']))
        }

        this.logger.info(`Loading jekyll data for: ${this.repoPath} ${params['path']}`)

        this.github.files(this._params(params)).then((data) => {
          if (data.files) {
            return resolve(this._cache(params['path'], data.files))
          } else if (data.file) {
            const content = Buffer.from(data.file.content, 'base64').toString()

            data['fields'] = {}

            if (/toml$/.test(data.file.path)) {
              data['fields'] = toml.parse(content)
            } else {
              data['fields'] = yaml.safeLoad(content)
            }
          }

          resolve(this._cache(params['path'], data))
        }).catch(err => {
          if (err.status === 404) {
            resolve(this._cache(params['path'], []))
          } else {
            reject(err)
          }
        })
      }
    )
  }

  /**
   * Save data for this Jekyll instance
   * @param {Object} params - Additional params (sent to github)
   * @param {String} params.sha - SHA from current version of data file
   * @param {String} params.path - Path of data file to be saved
   * @param {Object} params.data - Data to be saved to file
   * @param {String} params.message - Commit message to use when updating file
   * @returns {Promise<Array>} - Returns promise with github update response
   */
  saveData (params = {}) {
    verifyRequired(params, [ 'sha', 'path', 'data', 'message' ])

    this.logger.info(`Saving jekyll data for: ${this.repoPath} ${params['path']}`)

    params['content'] = Buffer.from(yaml.safeDump(params['data'])).toString('base64')

    delete params['data']

    if (params['ref'] && !params['branch']) {
      params['branch'] = params['ref']
    }

    return this.github.updateFile(this._params(params))
  }
}

module.exports = Jekyll
