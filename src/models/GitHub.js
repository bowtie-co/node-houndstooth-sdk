const async = require('async')
const parse = require('parse-link-header')
const Octokit = require('@octokit/rest')
const { verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')
const Jekyll = require('./Jekyll')

class GitHub extends Base {
  constructor (options = {}) {
    super(options)

    this.octokit = new Octokit()

    if (options.token) {
      this.auth(options.token)
    }
  }

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
              action(Object.assign({}, params, { page: nextPage, per_page: '100' }))
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
            .catch(reject)
        }
      }
    )
  }

  jekyll (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return new Jekyll(Object.assign({}, params, { github: this }))
  }

  auth (token) {
    if (token) {
      this.octokit = new Octokit({ auth: `token ${token}` })
    }
  }

  orgs (params = {}) {
    return this._exec('orgs', this.octokit.orgs.listForAuthenticatedUser, params)
  }

  repos (params = {}) {
    return this._exec('repos', this.octokit.repos.list, params)
  }

  repo (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('repo', this.octokit.repos.get, params)
  }

  contributors (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('contributors', this.octokit.repos.listContributors, params)
  }

  collaborators (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('collaborators', this.octokit.repos.listCollaborators, params)
  }

  branches (params = {}) {
    verifyRequired(params, [ 'owner', 'repo' ])

    return this._exec('branches', this.octokit.repos.listBranches, params)
  }

  branch (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'branch' ])

    return this._exec('branch', this.octokit.repos.getBranch, params)
  }

  user (params = {}) {
    return this._exec('user', this.octokit.users.getAuthenticated, params)
  }

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

  updateFile (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'path', 'message', 'content', 'sha' ])

    if (params['ref']) {
      params['branch'] = params['ref']
    }

    return this._exec('file', this.octokit.repos.updateFile, params)
  }

  createFile (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'path', 'message', 'content' ])

    if (params['ref']) {
      params['branch'] = params['ref']
    }

    return this._exec('file', this.octokit.repos.createFile, params)
  }

  deleteFile (params = {}) {
    verifyRequired(params, [ 'owner', 'repo', 'path', 'message', 'sha' ])

    if (params['ref']) {
      params['branch'] = params['ref']
    }

    return this._exec('file', this.octokit.repos.deleteFile, params)
  }

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
          .catch(reject)
      }
    )
  }

  _loadPath (options = {}) {
    return new Promise(
      (resolve, reject) => {
        const content = {}

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
          .catch(reject)
      }
    )
  }
}

module.exports = GitHub
