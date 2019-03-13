/* eslint-env mocha */

require('dotenv').config()

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { expect } = chai

const { GitHub } = require('../')

chai.use(dirtyChai)

const token = process.env.ACCESS_TOKEN

describe('GitHub', function () {
  this.timeout(10000)

  const repoParams = { owner: 'bowtie-test', repo: 'test-repo' }

  const github = new GitHub()

  github.auth(token)

  it('needs a token', function () {
    expect(token).to.be.a('string')
  })

  it('should exist', function () {
    expect(GitHub).to.be.a('function')
    expect(github).to.be.an.instanceof(GitHub)
  })

  it('can load user', async function () {
    const { user } = await github.user()

    expect(user.login).to.eql(repoParams.owner)
  })

  it('can load orgs', async function () {
    const { orgs } = await github.orgs({ per_page: '0' })

    expect(orgs.length).to.eql(0)
  })

  it('can load repos', async function () {
    const { repos } = await github.repos({ per_page: '0' })

    expect(repos.length).to.be.greaterThan(0)

    const testRepo = repos.find(repo => repo.name === repoParams.repo)

    expect(testRepo).to.be.an.instanceof(Object)
  })

  it('can load a single repo', async function () {
    const { repo } = await github.repo(repoParams)

    expect(repo).to.be.an.instanceof(Object)
    expect(repo.full_name).to.eql(`${repoParams.owner}/${repoParams.repo}`)
  })

  it('can load branches for a repo', async function () {
    const { branches } = await github.branches(repoParams)

    expect(branches).to.be.an.instanceof(Array)
    expect(branches.length).to.be.greaterThan(0)
  })

  it('can load contributors', async function () {
    const { contributors } = await github.contributors(repoParams)

    expect(contributors).to.be.an.instanceof(Array)
    expect(contributors.length).to.be.greaterThan(0)
  })

  it('can load collaborators', async function () {
    const { collaborators } = await github.collaborators(repoParams)

    expect(collaborators).to.be.an.instanceof(Array)
    expect(collaborators.length).to.be.greaterThan(0)
  })

  it('can load a file tree', async function () {
    const resp = await github.files(Object.assign({}, repoParams, { recursive: true, tree: true }))

    expect(resp).to.be.an.instanceof(Object)
    expect(resp['README.md']).to.be.a('string')
  })

  it('can create/update/delete files', async function () {
    const testFileName = 'a-test-file-' + Math.random() * 100000000

    const { file: createdFile } = await github.createFile(Object.assign({}, repoParams, {
      path: testFileName,
      message: 'create a test file',
      content: 'SGVsbG8gd29ybGQ=',
      encoding: 'base64'
    }))

    expect(createdFile).to.be.an.instanceof(Object)
    expect(createdFile['content']['name']).to.eql(testFileName)

    const { file: updatedFile } = await github.updateFile(Object.assign({}, repoParams, {
      path: createdFile['content']['path'],
      sha: createdFile['content']['sha'],
      message: 'updated a test file',
      content: 'SGVsbG8gd29ybGQgdXBkYXRlZCE=',
      encoding: 'base64'
    }))

    expect(updatedFile).to.be.an.instanceof(Object)
    expect(updatedFile['content']['name']).to.eql(createdFile['content']['name'])

    const { file: deletedFile } = await github.deleteFile(Object.assign({}, repoParams, {
      path: updatedFile['content']['path'],
      sha: updatedFile['content']['sha'],
      message: 'deleted a test file'
    }))

    expect(deletedFile).to.be.an.instanceof(Object)
    expect(deletedFile['commit']['sha']).to.be.a('string')
  })
})
