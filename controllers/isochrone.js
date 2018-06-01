'use strict'

const axios = require('axios')

const getIsochrone = (origin, mode, threshold, maxWalkDistance, date, time) => {
    const thresholds = 'cutoffSec=' + threshold.split(',').join('&cutoffSec=')
    mode = mode.toUpperCase()
    let url = `http://localhost:8080/otp/routers/calgary/isochrone?fromPlace=${origin}&mode=${mode.toUpperCase()}&${thresholds}`
    if (maxWalkDistance !== null && maxWalkDistance !== undefined) {
        url += `&maxWalkDistance=${maxWalkDistance}` //mm-dd-yyyy
    }
    if (date !== null && date !== undefined) {
        url += `&date=${date}` //mm-dd-yyyy
    }
    if (time !== null && time !== undefined) {
        url += `&time=${time}` //hh:mm[am/pm]
    }
    return new Promise((resolve, reject) => {
        axios.get(url)
            .then(response => {
                resolve(response.data)
            })
            .catch(error => {
                reject(error)
            })
    })
}

const get = (req, res) => {
    const origin = req.query.origin
    const mode = req.query.mode
    const maxWalkDistance = req.query.max_walk_distance
    const threshold = req.query.threshold
    const date = req.query.date
    const time = req.query.time
    const isochrone = getIsochrone(origin, mode, threshold, maxWalkDistance, date, time)
    isochrone.then(result => {
        res.status(200)
            .json(result)
    }, error => {
        res.status(500)
    })
}

module.exports = {
    get,
    getIsochrone
}
