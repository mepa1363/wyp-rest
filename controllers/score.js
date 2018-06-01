'use strict'

const isochrone = require('./isochrone').getIsochrone
const poi = require('./poi').getPoi
const crime = require('./crime').getCrime

const get = (req, res) => {
    const origin = req.query.origin
    const mode = req.query.mode
    const maxWalkDistance = req.query.max_walk_distance
    const threshold = req.query.threshold
    const date = req.query.date
    const time = req.query.time
    const polygon = isochrone(origin, mode, threshold, maxWalkDistance, date, time)
    polygon.then(isochrone => {
            return Promise.all([
                isochrone,
                poi(JSON.stringify(isochrone)),
                crime(JSON.stringify(isochrone))
            ])
        })
        .then(result => {
            const isochrone = result[0]
            const pois = result[1]
            const crimes = result[2]
            const poiWeights = {
                "Bank": [1], //bank
                "Grocery": [3], //grocery
                "Restaurant": [.75, .45, .25, .25, .225, .225, .225, .225, .2, .2], //restaurant and coffee
                "Shopping": [.5, .45, .4, .35, .3], //shopping
                "Entertainment": [1], //entertainment
                "School": [1], //school
                "Library": [1], //library
                "Health": [1] //health
            }
            //calculate the sum of weights for poi
            let poiSum = 0
            for (let item in poiWeights) {
                for (let weight of poiWeights[item]) {
                    poiSum += weight
                }
            }
            //ex: poiTypes = [Entertainment, Shopping, Entertainment, Restaurant, Pub, Restaurant, Restaurant]
            const poiTypes = []
            for (let feature of pois.features) {
                poiTypes.push(feature.properties.type)
            }
            //ex: poiTypesAndCounts = {Entertainment: 2, Shopping: 1, Restaurant: 3, Pub: 1}
            const poiTypesAndCounts = {}
            poiTypes.forEach(x => {
                poiTypesAndCounts[x] = (poiTypesAndCounts[x] || 0) + 1
            })
            //calculate poi score
            let poiIndex = 0
            for (let poiType in poiTypesAndCounts) {
                if (poiWeights.hasOwnProperty(poiType)) {
                    if (poiWeights[poiType].length >= poiTypesAndCounts[poiType]) {
                        for (let i = 0; i < poiTypesAndCounts[poiType]; i++) {
                            poiIndex += poiWeights[poiType][i]
                        }
                    } else {
                        for (let i = 0; i < poiWeights[poiType].length; i++) {
                            poiIndex += poiWeights[poiType][i]
                        }
                    }
                }
            }
            //calculate normalized poi score (percentage)
            const normalPoiIndex = Math.round(poiIndex / poiSum * 100)

            const crimeWeights = {
                "Arson": [1, 1, 1, 1],
                "Assault": [10],
                "AttemptedMurder": [4.5, 4.5],
                "CommercialBreakIn": [.5, .5, .5, .5, .5, .5, .5, .5, .5, .5],
                "Homicide": [9],
                "ResidentialBreakIn": [.5, .5, .5, .5, .5, .5, .5, .5, .5, .5],
                "Robbery": [2, 1.5, 1.5],
                "SexOffence": [10],
                "Theft": [.4, .4, .4, .4, .4, .4, .4, .4, .4, .4],
                "TheftFromVehicle": [.3, .3, .3, .3, .3, .3, .3, .3, .3, .3],
                "Vandalism": [.2, .2, .2, .2, .2, .2, .2, .2, .2, .2],
                "VehicleTheft": [.1, .1, .1, .1, .1, .1, .1, .1, .1, .1]
            }
            //calculate the sum of weights for poi
            let crimeSum = 0
            for (let item in crimeWeights) {
                for (let weight of crimeWeights[item]) {
                    crimeSum += weight
                }
            }
            const crimeTypes = []
            for (let feature of crimes.features) {
                crimeTypes.push(feature.properties.crime_type)
            }
            const crimeTypesAndCounts = {}
            crimeTypes.forEach(x => {
                crimeTypesAndCounts[x] = (crimeTypesAndCounts[x] || 0) + 1
            })
            let crimeIndex = 0
            for (let crimeType in crimeTypesAndCounts) {
                if (crimeWeights.hasOwnProperty(crimeType)) {
                    if (crimeWeights[crimeType].length >= crimeTypesAndCounts[crimeType]) {
                        for (let i = 0; i < crimeTypesAndCounts[crimeType]; i++) {
                            crimeIndex += crimeWeights[crimeType][i]
                        }
                    } else {
                        for (let i = 0; i < crimeWeights[crimeType].length; i++) {
                            crimeIndex += crimeWeights[crimeType][i]
                        }
                    }
                }
            }
            const normalCrimeIndex = Math.round(crimeIndex / crimeSum * 100)

            let crimeColor = ''
            if (normalCrimeIndex >= 0 && normalCrimeIndex < 20)
                crimeColor = '#39B54A'
            else if (normalCrimeIndex >= 20 && normalCrimeIndex < 40)
                crimeColor = '#8DC63F'
            else if (normalCrimeIndex >= 40 && normalCrimeIndex < 60)
                crimeColor = '#FFF200'
            else if (normalCrimeIndex >= 60 && normalCrimeIndex < 80)
                crimeColor = '#F7941E'
            else if (normalCrimeIndex >= 80 && normalCrimeIndex <= 100)
                crimeColor = '#ED1C24'

            for (let feature of isochrone.features) {
                feature.properties.score = normalPoiIndex
                feature.properties.crime_index = normalCrimeIndex
                feature.properties.color = crimeColor
            }

            res.status(200).json(isochrone)
        })
}

module.exports = {
    get
}
