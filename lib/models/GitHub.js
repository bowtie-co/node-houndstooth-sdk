const async = require('async')
const parse = require('parse-link-header')
const Octokit = require('@octokit/rest')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const Jekyll = require('./Jekyll')

/**
 * GitHub class
 */
class GitHub extends Base {
  /**
   * Create new GitHub object
   *
   * @constructor
   * @param {Object} [options] - Options for this GitHub instance
   * @param {String} [options.token] - Initialize GitHub with auth token
   */
  constructor (options = {}) {
    super(options)

    this.octokit = new Octokit()

    if (options.token) {
      this.auth(options.token)
    }
  }

  /**
   * Generic exec method for calling octokit methods
   *
   * @param {String} key - Key for exec call (return object key)
   * @param {Function} action - Octokit action to be used
   * @param {Object} [params] - Additional params (sent to github)
   * @returns {Promise<Object>} - Returns promise with response data
   */
  _exec (key, action, params = {}) {
    return new Promise(
      (resolve, reject) => {
        this.logger.info(`Exec github for key: ${key}`)

        if (params['per_page'] && params['per_page'].toString() === '0') {
          let list = []
          let nextPage = '1'
          async.whilst(
            () => nextPage !== null,
            (callback) => {
              const actionParams = Object.assign({}, params, { page: nextPage, per_page: '100' })

              if (!this.cache) {
                Object.assign(actionParams, {
                  headers: {
                    'If-None-Match': ''
                  }
                })
              }

              action(actionParams)
                .then(response => {
                  const pagination = parse(response.headers.link)
                  nextPage = pagination && pagination['next'] ? pagination['next']['page'] : null
                  list.push(...response['data'])
                  callback(null, list)
                })
                .catch(callback)
            },
            (err, n) => {
              if (err) {
                this.emit('err', err)
                reject(err)
              } else {
                resolve({
                  [key]: list,
                  pages: null
                })
              }
            }
          )
        } else {
          action(params)
            .then(resp => {
              resolve({
                [key]: resp.data,
                pages: parse(resp.headers.link)
              })
            })
            .catch(err => {
              this.emit('err', err)
              reject(err)
            })
        }
      }
    )
  }

  /**
   * Create a new Jekyll instance for this GitHub connection
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   */
  jekyll (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return new Jekyll(Object.assign({}, params, { github: this }))
  }

  /**
   * Authorize this GitHub instance
   * @param {String} token - GitHub access token
   */
  auth (token) {
    if (token) {
      this.octokit = new Octokit({ auth: `token ${token}` })
    }
  }

  /**
   * List orgs for authenticated user
   * @param {Object} [params] - Additional params (sent to github)
   */
  orgs (params = {}) {
    return this._exec('orgs', this.octokit.orgs.listForAuthenticatedUser, params)
  }

  /**
   * List repos for authenticated user
   * @param {Object} [params] - Additional params (sent to github)
   */
  repos (params = {}) {
    return this._exec('repos', this.octokit.repos.list, params)
  }

  /**
   * Get a specific repo
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   */
  repo (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('repo', this.octokit.repos.get, params)
  }

  /**
   * Get contributors for a specific repo
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   */
  contributors (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('contributors', this.octokit.repos.listContributors, params)
  }

  /**
   * Get collaborators for a specific repo
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   */
  collaborators (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('collaborators', this.octokit.repos.listCollaborators, params)
  }

  /**
   * Get branches for a specific repo
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   */
  branches (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('branches', this.octokit.repos.listBranches, params)
  }

  /**
   * Get a single branch for a specific repo
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   * @param {String} params.branch - Branch name
   */
  branch (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'branch' ])

    return this._exec('branch', this.octokit.repos.getBranch, params)
  }

  /**
   * Get the currently authenticated user
   * @param {Object} [params] - Additional params (sent to github)
   */
  user (params = {}) {
    return this._exec('user', this.octokit.users.getAuthenticated, params)
  }

  /**
   * Get file(s) list or conent from github
   * @param {Object} [params] - Parameters
   * @param {String} [params.path='.'] - Path to load (Default is entire repo)
   * @param {Boolean} [params.recursive] - Recursively load files (for dir path only)
   * @param {Boolean} [params.flatten] - Flatten response (for recursive only)
   * @param {Boolean} [params.tree] - Return file tree response (for dir path only)
   */
  files (params = {}) {
    if (!params.path) {
      params.path = '.'
    }

    [ 'recursive', 'flatten', 'tree' ].forEach(opt => {
      params[opt] = params[opt] && params[opt].toString().toLowerCase() === 'true'
    })

    // this.logger.info('LOADING GH FILES WITH')
    // this.logger.info(JSON.stringify(params))

    return this._loadPath(params)
  }

  /**
   * Update a file on github
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   * @param {String} params.path - Path of file being updated
   * @param {String} params.message - Message for commit on updating file
   * @param {String} params.content - New content for updated file
   * @param {String} params.sha - Current sha of file being updated
   */
  updateFile (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'path', 'message', 'content', 'sha' ])

    if (params['ref']) {
      params['branch'] = params['ref']
    }

    return this._exec('file', this.octokit.repos.updateFile, params)
  }

  /**
   * Create a file on github
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   * @param {String} params.path - Path of file being created
   * @param {String} params.message - Message for commit on creating file
   * @param {String} params.content - New content for created file
   */
  createFile (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'path', 'message', 'content' ])

    if (params['ref']) {
      params['branch'] = params['ref']
    }

    return this._exec('file', this.octokit.repos.createFile, params)
  }

  /**
   * Update a file on github
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   * @param {String} params.path - Path of file being deleted
   * @param {String} params.message - Message for commit on deleting file
   * @param {String} params.sha - Current sha of file being deleted
   */
  deleteFile (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'path', 'message', 'sha' ])

    if (params['ref']) {
      params['branch'] = params['ref']
    }

    return this._exec('file', this.octokit.repos.deleteFile, params)
  }

  /**
   * Create or update 1 or more files on github
   * @param {Object} params - Parameters
   * @param {String} params.owner - Repo owner name
   * @param {String} params.repo - Repo name
   * @param {Array} params.files - Array of file objects with base64 encoded content
   * @param {String} params.message - Message for commit on creating file(s)
   */
  upsertFiles (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'files', 'message' ])

    return new Promise(
      (resolve, reject) => {
        const options = Object.assign({}, params)

        const branchName = params['ref'] || 'master'

        const { files, message } = params

        const fileDefaults = {
          mode: '100644',
          encoding: 'utf-8'
        }

        const fileList = files.map(file => {
          return Object.assign({}, fileDefaults, file)
        })

        Promise.all(fileList.map(file => {
          return this.octokit.git.createBlob(Object.assign({}, options, {
            content: file.content,
            encoding: file.encoding
          }))
        })).then(blobs => {
          return this.octokit.repos.getBranch(Object.assign({}, options, {
            branch: branchName
          })).then(branch => {
            return this.octokit.git.createTree(Object.assign({}, options, {
              tree: fileList.map((file, index) => {
                return {
                  path: file.path,
                  mode: file.mode,
                  type: 'blob',
                  sha: blobs[index].data.sha
                }
              }),
              base_tree: branch.data.commit.sha
            })).then(tree => {
              return this.octokit.git.createCommit(Object.assign({}, options, {
                message: message,
                tree: tree.data.sha,
                parents: [
                  branch.data.commit.sha
                ]
              }))
            }).then(commit => {
              return this.octokit.git.updateRef(Object.assign({}, options, {
                ref: `heads/${branchName}`,
                sha: commit.data.sha
              })).then(resp => {
                resolve(commit)
              })
            })
          })
        })
          .catch(err => {
            this.emit('err', err)
            reject(err)
          })
      }
    )
  }

  /**
   * Load a given path with options
   * @param {Object} [options] - Load path options
   */
  _loadPath (options = {}) {
    return new Promise(
      (resolve, reject) => {
        const content = {}

        if (!this.cache) {
          Object.assign(options, {
            headers: {
              'If-None-Match': ''
            }
          })
        }

        this.octokit.repos.getContents(options)
          .then(resp => {
            if (Array.isArray(resp.data)) {
              const files = resp.data

              if (!options.flatten && !options.tree) {
                content.files = files
              }

              async.each(files, (file, next) => {
                if (options.flatten) {
                  content[file.path] = options.tree ? file.sha : file
                } else if (options.tree) {
                  content[file.path] = (file.type === 'dir' && options.recursive) ? {} : file.sha
                }

                if (file.type === 'dir' && options.recursive) {
                  const subDirOpts = Object.assign({}, options, {
                    path: file.path
                  })

                  this._loadPath(subDirOpts)
                    .then(subDirContent => {
                      if (options.flatten) {
                        Object.assign(content, subDirContent)
                      } else {
                        if (options.tree) {
                          Object.assign(content[file.path], subDirContent)
                        } else {
                          Object.assign(file, subDirContent)
                        }
                      }

                      next()
                    }).catch(next)
                } else {
                  next()
                }
              }, err => {
                if (err) {
                  this.emit('err', err)
                  reject(err)
                } else {
                  resolve(content)
                }
              })
            } else {
              const file = resp.data

              if (options.flatten) {
                content[file.path] = options.tree ? file.sha : file
              } else {
                content.file = options.tree ? file.sha : file
              }

              resolve(content)
            }
          })
          .catch(err => {
            this.emit('err', err)
            reject(err)
          })
      }
    )
  }
}

module.exports = GitHub
