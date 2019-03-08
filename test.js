require('dotenv').config()

const { GitHub, Jekyll } = require('./')

const token = process.env.ACCESS_TOKEN

const github = new GitHub()

github.auth(token)

const test = async (ref = 'master') => {
  try {
    const j = new Jekyll({
      github,
      owner: 'bowtie-test',
      repo: 'test-jekyll'
    })

    const collections = await j.collections({ ref })

    // console.log(collections)

    collections.forEach(async collection => {
      const fields = await collection.fields({ ref })

      // console.log(fields)

      const content = await collection.content({ ref })

      // console.log(content)

      const items = await collection.items({ ref })

      items.forEach(async item => {
        const fields = await item.fields({ ref })
        const content = await item.content({ ref })

        item.logger.info(item.path)
      })

      // collection.clearCache()

      // const fields2 = await collection.fields()

      // console.log(fields2)

      // const items2 = await collection.items()

      // console.log(items2.map(i => i.name))
    })


    // const { user } = await github.user()
    // console.log(user.login)

    // const { orgs } = await github.orgs({ per_page: '0' })
    // console.log(orgs.length, 'orgs')

    // const { repos } = await github.repos({ per_page: '0' })
    // console.log(repos.length, 'repos')

    // const repoParams = { owner: 'bowtie-test', repo: 'test-repo' }

    // const { repo } = await github.repo(repoParams)
    // console.log(repo.full_name)

    // const { contributors } = await github.contributors(repoParams)
    // console.log(contributors.length, 'contributors')

    // const { collaborators } = await github.collaborators(repoParams)
    // console.log(collaborators.length, 'collaborators')

    // const { branches } = await github.branches(repoParams)
    // console.log(branches.length, 'branches')

    // const resp = await github.files(Object.assign({}, repoParams, { recursive: true, tree: true }))
    // console.log(resp)

    // const { file: createdFile } = await github.createFile(Object.assign({}, repoParams, {
    //   path: 'a-test-file-' + Math.random() * 100000000,
    //   message: 'create a test file',
    //   content: 'SGVsbG8gd29ybGQ=',
    //   encoding: 'base64'
    // }))
    // console.log(createdFile['content']['path'])

    // const { file: updatedFile } = await github.updateFile(Object.assign({}, repoParams, {
    //   path: createdFile['content']['path'],
    //   sha: createdFile['content']['sha'],
    //   message: 'updated a test file',
    //   content: 'SGVsbG8gd29ybGQgdXBkYXRlZCE=',
    //   encoding: 'base64'
    // }))
    // console.log(updatedFile['content']['path'])

    // const { file: deletedFile } = await github.deleteFile(Object.assign({}, repoParams, {
    //   path: updatedFile['content']['path'],
    //   sha: updatedFile['content']['sha'],
    //   message: 'deleted a test file'
    // }))
    // console.log(deletedFile['commit']['sha'])
  } catch (err) {
    console.error(err)
  }
}

test()
test('test')
