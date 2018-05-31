const express = require('express')
const cors = require('cors')
const isochrone = require('../controllers/isochrone')
const poi = require('../controllers/poi')
const crime = require('../controllers/crime')
const score = require('../controllers/score')
const router = express.Router()

router.all('*', cors())

router.get('/api/isochrone', isochrone.get)
router.get('/api/poi', poi.get)
router.get('/api/crime', crime.get)
router.get('/api/score', score.get)

module.exports = router
