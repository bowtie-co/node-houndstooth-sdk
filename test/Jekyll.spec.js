/* eslint-env mocha */

require('dotenv').config()

const chai = require('chai')
const { expect } = chai

const { GitHub, Jekyll } = require('../')

const token = process.env.ACCESS_TOKEN

describe('Jekyll', function () {
  const github = new GitHub()

  github.auth(token)

  it('should exist', function () {
    expect(Jekyll).to.be.a('function')
  })
})
