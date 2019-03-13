/* eslint-env mocha */

require('dotenv').config()

const chai = require('chai')
const { expect } = chai

const { GitHub } = require('../')

const token = process.env.ACCESS_TOKEN

describe('GitHub', function () {
  const github = new GitHub()

  github.auth(token)

  it('needs a token', function () {
    expect(token).to.be.a('string')
  })

  it('should exist', function () {
    expect(GitHub).to.be.a('function')
    expect(github).to.be.an.instanceof(GitHub)
  })
})
