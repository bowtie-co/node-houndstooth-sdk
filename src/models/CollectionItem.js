const { verifySchema, verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')

class CollectionItem extends Base {
  constructor(options = {}) {
    verifyRequired(options, [ 'collection', 'name', 'path' ])

    super(options)

    this.jekyll = this.collection.jekyll
    this.github = this.jekyll.github
    this.repoPath = this.jekyll.repoPath
    this.repoParams = this.jekyll.repoParams
  }

  init (params = {}) {
    return this.defaults(params).then(defaults => {
      this.fields = defaults['fields']
      this.markdown = defaults['content']

      return Promise.resolve(this)
    })
  }

  defaults (params = {}) {
    return this.collection.parsePath(this.path, params)
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
}

module.exports = CollectionItem
