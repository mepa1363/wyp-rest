'use strict'

const db = require('./config')

const getCrime = polygon => {
    const polygonGeometry = JSON.stringify(JSON.parse(polygon).features[0].geometry)
    const query = `SELECT jsonb_agg(features) AS features
                    FROM (
                        SELECT jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJSON(crime_location) :: jsonb,
                            'properties', to_jsonb(inputs) - 'crime_location') AS feature
                             FROM (
                                SELECT crime_location, crime_time, crime_type
                                    FROM cps_crime_data.crime_data
                                    WHERE (st_intersects(st_setsrid(st_geomfromgeojson(
                                                                            '${polygonGeometry}'),
                                                                        4326), crime_location))) inputs) features;`
    return new Promise((resolve, reject) => {
        db.any(query)
            .then(data => {
                const a = []
                for (let b of data[0].features) {
                    a.push(b.feature)
                }
                resolve({
                    "type": "FeatureCollection",
                    "features": a
                })
            })
            .catch(error => {
                reject(error)
            })
    })
}

const get = (req, res) => {
    const crime = getCrime(req.query.polygon)
    crime.then(result => {
        res.status(200)
            .json(result)
    }, error => {
        res.status(500)
    })
}

module.exports = {
    get,
    getCrime
}
