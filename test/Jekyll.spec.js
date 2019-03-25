/* eslint-env mocha */

require('dotenv').config()

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const { expect } = chai

const { GitHub, Jekyll, Collection, CollectionItem } = require('../')

chai.use(dirtyChai)

const token = process.env.ACCESS_TOKEN

describe('Jekyll', function () {
  this.timeout(10000)

  const github = new GitHub()

  github.auth(token)

  const jekyllParams = { github, owner: 'bowtie-test', repo: 'test-jekyll' }

  it('needs a token', function () {
    expect(token).to.be.a('string')
  })

  it('should exist', function () {
    expect(GitHub).to.be.a('function')
    expect(github).to.be.an.instanceof(GitHub)
  })

  it('should exist', function () {
    expect(Jekyll).to.be.a('function')
  })

  it('forces required options', function () {
    const attempt = () => {
      const jekyll = new Jekyll()

      jekyll.collections()
    }

    expect(attempt).to.throw()
  })

  it('returns new instance with required options', function () {
    const attempt = () => {
      const jekyll = new Jekyll(jekyllParams)

      expect(jekyll).to.be.an.instanceof(Jekyll)
    }

    expect(attempt).not.to.throw()
  })

  it('can load collections', async function () {
    const jekyll = new Jekyll(jekyllParams)

    const collections = await jekyll.collections()

    expect(collections.length).to.be.greaterThan(0)
    expect(collections[0]).to.be.an.instanceof(Collection)
  })

  it('can load a single collection', async function () {
    const jekyll = new Jekyll(jekyllParams)

    const collection = await jekyll.collection('posts')

    expect(collection).to.be.an.instanceof(Collection)
  })

  it('can load a items from a collection', async function () {
    const jekyll = new Jekyll(jekyllParams)

    const collection = await jekyll.collection('posts')

    expect(collection).to.be.an.instanceof(Collection)

    const items = await collection.items()

    expect(items.length).to.be.greaterThan(0)
    expect(items[0]).to.be.an.instanceof(CollectionItem)
  })

  it('can create/update/delete items from a collection', async function () {
    const jekyll = new Jekyll(jekyllParams)
    const newItemName = `new-item-${Date.now()}.md`
    const newItemMarkdown = 'Hello world! --- this should be a part of markdown'
    const newItemFields = {
      abc: '123',
      stuff: 'things',
      an_array: [ 'val1', 'val2', 'val3' ]
    }

    const collection = await jekyll.collection('posts')

    expect(collection).to.be.an.instanceof(Collection)

    const newItem = await collection.createItem({
      name: newItemName,
      fields: newItemFields,
      markdown: newItemMarkdown
    }, {
      message: 'Created an item from sdk!'
    })

    expect(newItem).to.be.an.instanceof(CollectionItem)
    expect(newItem.sha).to.be.a('string')
    expect(newItem.name).to.eql(newItemName)
    expect(newItem.fields).to.eql(newItemFields)
    expect(newItem.markdown).to.eql(newItemMarkdown)

    let items = await collection.items()

    const findNewItem = items.find(item => item.name === newItemName)

    expect(findNewItem).to.be.an.instanceof(CollectionItem)

    const newItemSha = newItem.sha
    const updatedMarkdown = `\nNEW CONTENT! ${newItem.sha}\n`

    newItem.markdown = updatedMarkdown

    const updatedItem = await newItem.save({
      message: 'Updated item from sdk!'
    })

    expect(updatedItem.sha).to.not.eql(newItemSha)
    expect(updatedItem.name).to.eql(newItemName)
    expect(updatedItem.markdown).to.eql(updatedMarkdown)

    const deletedItem = await updatedItem.delete({
      message: 'Deleted item from sdk!'
    })

    expect(deletedItem.name).to.eql(newItemName)

    items = await collection.items()

    const findDeletedItem = items.find(item => item.name === deletedItem)

    expect(findDeletedItem).to.be.undefined()
  })

  it('can rename an item from a collection', async function () {
    const jekyll = new Jekyll(jekyllParams)

    const collection = await jekyll.collection('posts')

    expect(collection).to.be.an.instanceof(Collection)

    let items = await collection.items()

    expect(items.length).to.be.greaterThan(0)

    expect(items[0]).to.be.an.instanceof(CollectionItem)

    const newName = `changed-name-${Date.now()}.md`

    const renamedItem = await items[0].rename(newName, { message: 'Rename item from sdk!' })

    expect(renamedItem.name).to.eql(newName)

    items = await collection.items()

    const findRenamedItem = items.find(item => item.name === newName)

    expect(findRenamedItem).to.be.an.instanceof(CollectionItem)
    expect(findRenamedItem.name).to.eql(newName)
  })
})
