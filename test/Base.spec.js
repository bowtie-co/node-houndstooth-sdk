/* eslint-env mocha */

require('dotenv').config()

const chai = require('chai')
var dirtyChai = require('dirty-chai')
const { expect } = chai

chai.use(dirtyChai)

const { Base } = require('../')

describe('Base', function () {
  it('should exist', function () {
    expect(Base).to.be.a('function')
  })

  it('should have expected properties', function () {
    const option1 = 'a string value'
    const option2 = {
      key: 'value'
    }

    const base = new Base({
      option1,
      option2
    })

    expect(base).to.be.an.instanceof(Base)

    expect(base.logger).to.exist()
    expect(base.cached).to.exist()
    expect(base.defaultParams).to.exist()

    expect(base.cached).to.be.an.instanceof(Object)
    expect(base.defaultParams).to.be.an.instanceof(Object)

    expect(base.cached).to.be.empty()
    expect(base.defaultParams).to.be.empty()

    expect(base.option1).to.eql(option1)
    expect(base.option2).to.eql(option2)
  })

  it('should support params builder method', function () {
    const defaultParams = {
      key: 'value'
    }

    const base = new Base({
      defaultParams
    })

    expect(base.defaultParams).to.eql(defaultParams)

    const blankParams = base._params()

    expect(blankParams).to.eql(defaultParams)

    const extraParams = base._params({ another: 'param' })

    expect(extraParams).to.eql(Object.assign({}, defaultParams, { another: 'param' }))
  })

  it('should support caching', function () {
    const key1 = 'cached_key'
    const val1 = 'a cached value'

    const key2 = 'cached_key2'
    const val2 = {
      stuff: 'things'
    }

    const base = new Base()

    expect(base._isCached(key1)).to.be.false()
    expect(base._isCached(key2)).to.be.false()

    base._cache(key1, val1)
    base._cache(key2, val2)

    expect(base._isCached(key1)).to.be.true()
    expect(base._cached(key1)).to.eql(val1)

    base.clearCache(key1)

    expect(base._isCached(key1)).to.be.false()
    expect(base._cached(key1)).to.be.undefined()

    expect(base._isCached(key2)).to.be.true()
    expect(base._cached(key2)).to.eql(val2)

    base.clearCache()

    expect(base._isCached(key2)).to.be.false()
    expect(base._cached(key2)).to.be.undefined()
  })
})
