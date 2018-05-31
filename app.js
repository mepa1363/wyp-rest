'use strict'

require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const routes = require('./routes/index')
const app = express()

app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(bodyParser.json())

app.use('/', routes)

app.use('/static', express.static('static'))

module.exports = app
