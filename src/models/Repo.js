const { verifySchema, verifyRequired } = require('@bowtie/utils')

const Base = require('./Base')

class Repo extends Base {
  constructor(options = {}) {
    verifyRequired(options, [ 'github', 'owner', 'repo' ])

    super(options)

    const { owner, repo } = options

    this.path = `${owner}/${repo}`
    this.defaultParams = { owner, repo }
  }
}

module.exports = Repo
