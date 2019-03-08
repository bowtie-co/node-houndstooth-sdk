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
      const newItem = await collection.createItem({
        name: `new-item-${Date.now()}.md`,
        fields: {
          abc: '123',
          stuff: 'things',
          an_array: [ 'val1', 'val2', 'val3' ]
        },
        markdown: `HELLO WORLD!`
      }, {
        message: 'Created an item from sdk!'
      })

      console.log('CREATED', newItem.name)
      // const fields = await collection.fields({ ref })

      // console.log(fields)

      // const content = await collection.content({ ref })

      // console.log(content)

      const items = await collection.items({ ref })

      items.reduce((promiseChain, item) => {
        item.markdown = `\nNEW CONTENT! ${item.sha}\n`
        return promiseChain.then(() => item.save({ ref, message: 'Updated item from sdk!' }))
      }, Promise.resolve()).then(() => {
        console.log('Done saving items')

        if (items.length > 4) {
          items[items.length-1].delete({ message: 'Delete an item from sdk' }).then(item => {
            console.log('deleted item', item.name)
          })
        }
      })

      // const item = items[0]
      // items.forEach(async item => {
      //   // const fields = await item.fields({ ref })
      //   // const content = await item.content({ ref })

      //   item.logger.info(item.path)

      //   item.markdown = `\nNEW CONTENT! ${item.sha}\n`

      //   const updated = await item.save({ ref, message: 'Updated item from sdk!' })

      //   // console.log(updated.markdown)

      //   updated.markdown = `\nOOPS I UPDATED AGAIN! ${updated.sha}\n`

      //   const again = await updated.save({ ref, message: 'Update again!' })
      // })

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
// test('test')
