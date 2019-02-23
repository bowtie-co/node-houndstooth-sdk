const Houndstooth = require('./src/Houndstooth')

const token = process.env.ACCESS_TOKEN

const myHt = new Houndstooth()

const test = async () => {
  myHt.auth(token)

  const { user } = await myHt.user()
  console.log(user.login)

  const { orgs } = await myHt.orgs({ per_page: '0' })
  console.log(orgs.length, 'orgs')

  const { repos } = await myHt.repos({ per_page: '0' })
  console.log(repos.length, 'repos')

  const repoParams = { owner: '5290charlie', repo: 'charliemcclung-jekyll' }

  const { repo } = await myHt.repo(repoParams)
  console.log(repo.full_name)

  const { contributors } = await myHt.contributors(repoParams)
  console.log(contributors.length, 'contributors')

  const { collaborators } = await myHt.collaborators(repoParams)
  console.log(collaborators.length, 'collaborators')

  const { branches } = await myHt.branches(repoParams)
  console.log(branches.length, 'branches')

  const resp = await myHt.files(Object.assign({}, repoParams, { recursive: true, tree: true }))
  console.log(resp)

  const { file: createdFile } = await myHt.createFile(Object.assign({}, repoParams, {
    path: 'a-test-file-' + Math.random() * 100000000,
    message: 'create a test file',
    content: 'SGVsbG8gd29ybGQ=',
    encoding: 'base64'
  }))
  console.log(createdFile['content']['path'])

  const { file: updatedFile } = await myHt.updateFile(Object.assign({}, repoParams, {
    path: createdFile['content']['path'],
    sha: createdFile['content']['sha'],
    message: 'updated a test file',
    content: 'SGVsbG8gd29ybGQgdXBkYXRlZCE=',
    encoding: 'base64'
  }))
  console.log(updatedFile['content']['path'])

  const { file: deletedFile } = await myHt.deleteFile(Object.assign({}, repoParams, {
    path: updatedFile['content']['path'],
    sha: updatedFile['content']['sha'],
    message: 'deleted a test file'
  }))
  console.log(deletedFile['commit']['sha'])
}

test()
