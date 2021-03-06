'use strict'

const axios = require('axios')
const querystring = require('querystring')
const db = require('./config')

const getPoi = polygon => {
    const polygonFeatures = JSON.parse(polygon).features
    let spatialCondition = ''
    for (let feature of polygonFeatures) {
        spatialCondition += ` ST_INTERSECTS(ST_SETSRID(ST_GeomFromGeoJSON('${JSON.stringify(feature.geometry)}'), 4326), geom) OR `
    }
    spatialCondition = spatialCondition.substring(0, spatialCondition.length - 4)
    const query = ` SELECT jsonb_agg(features) AS features
                            FROM (
                                SELECT jsonb_build_object(
                                    'type', 'Feature',
                                    'geometry', ST_AsGeoJSON(geom)::jsonb,
                                    'properties', to_jsonb(inputs) - 'geom') AS feature
                                FROM (
                                    SELECT  category as type, concat_ws(', ', name::text, operator::text) as name, icon, geom
                                    FROM planet_osm_point
                                    WHERE category IS NOT NULL AND (${spatialCondition})) inputs) features;`
    return new Promise((resolve, reject) => {
        db.any(query)
            .then(data => {
                const features = []
                if (data[0].features !== null) {
                    for (let item of data[0].features) {
                        features.push(item.feature)
                    }
                }
                resolve({
                    "type": "FeatureCollection",
                    "features": features
                })
            })
            .catch(error => {
                reject(error)
            })
    })
}

const get = (req, res) => {
    const poi = getPoi(req.query.polygon)
    poi.then(result => {
        res.status(200)
            .json(result)
    }, error => {
        res.status(500)
    })
}

module.exports = {
    get,
    getPoi
}
