const { verifySchema, verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')

class CollectionItem extends Base {
  constructor(options = {}) {
    super(options)

    verifyRequired(options, [ 'collection', 'name', 'path' ])

    this.name = options.name
    this.path = options.path
    this.collection = options.collection
    this.jekyll = this.collection.jekyll
    this.github = this.jekyll.github
    this.repoPath = this.jekyll.repoPath
    this.repoParams = this.jekyll.repoParams
  }
}

module.exports = CollectionItem
