'use strict'

const axios = require('axios')
const querystring = require('querystring')
const db = require('./config')

const serverAddress = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://walkyourplace.ca'

const buildPolygon = polygon => {
    polygon = JSON.parse(polygon)
    let poly = ''
    for (let coordinates of polygon['features'][0]['geometry']['coordinates'][0][0]) {
        poly += `${parseFloat(coordinates[1]).toFixed(3)} ${parseFloat(coordinates[0]).toFixed(3)} `
    }
    poly = poly.substring(0, poly.length - 1)
    return poly
}
const getPoi = polygon => {
    const features = ['shop', 'leisure', 'historic', 'sport']
    const amenities = ['atm', 'bank', 'bar', 'pub', 'restaurant', 'fast_food', 'food_court', 'cafe', 'marketplace', 'arts_centre', 'cinema', 'nightclub', 'theatre', 'school', 'kindergarten', 'college', 'university', 'library', 'clinic', 'dentist', 'doctors', 'hospital', 'pharmacy', 'veterinary']
    const polygonFeatures = JSON.parse(polygon).features
    let spatialCondition = ''
    for (let feature of polygonFeatures) {
        spatialCondition += ` ST_INTERSECTS(ST_SETSRID(ST_GeomFromGeoJSON('${JSON.stringify(feature.geometry)}'), 4326), geom) OR `
    }
    spatialCondition = spatialCondition.substring(0, spatialCondition.length - 4)
    let query = `SELECT jsonb_agg(features) AS features
                            FROM (
                                SELECT jsonb_build_object(
                                    'type', 'Feature',
                                    'geometry', ST_AsGeoJSON(geom)::jsonb,
                                    'properties', to_jsonb(inputs) - 'geom') AS feature
                                FROM (
                                    SELECT  concat_ws(', ', ${features.join('::text,')}::text) as type, concat_ws(', ', name::text, operator::text) as name, geom
                                    FROM planet_osm_point
                                    WHERE (${features.join(' IS NOT NULL OR ')} IS NOT NULL) AND (${spatialCondition}) ) inputs) features;`

    let values = []
    for (let amenity of amenities) {
        values.push(`('${amenity}')`)
    }
    query += ` SELECT jsonb_agg(features) AS features
                            FROM (
                                SELECT jsonb_build_object(
                                    'type', 'Feature',
                                    'geometry', ST_AsGeoJSON(geom)::jsonb,
                                    'properties', to_jsonb(inputs) - 'geom') AS feature
                                FROM (
                                    SELECT  amenity as type, concat_ws(', ', name::text, operator::text) as name, geom
                                    FROM planet_osm_point
                                    WHERE amenity = ANY (VALUES ${values.join(',')}) AND (${spatialCondition})) inputs) features;`
    return new Promise((resolve, reject) => {
        db.multi(query)
            .then(data => {
                const c = []
                for (let a of data) {
                    for (let b of a[0].features) {
                        c.push(b.feature)
                    }
                }
                resolve({
                    "type": "FeatureCollection",
                    "features": c
                })
            })
            .catch(error => {
                reject(error)
            })
    })
}

// const getPoi = polygon => {
//     polygon = buildPolygon(polygon)
//     const url = `http://overpass-api.de/api/interpreter`
//     const osmFeatures = [
//         //grocery
//         'shop=alcohol', 'shop=bakery', 'shop=beverages', 'shop=butcher', 'shop=convenience', 'shop=general',
//         'shop=department_store', 'shop=farm', 'shop=mall', 'shop=supermarket',
//         //shopping
//         'shop',
//         //entertainment
//         'leisure', 'historic', 'sport',
//         //library
//         'shop=books'
//     ]
//     //bank, restaurant & cafe, park & entertainment, school, book, hospital
//     //usage: node["amenity=atm"]
//     const osmAmenities = [
//         //bank
//         'atm', 'bank',
//         //restaurant
//         'bar', 'pub', 'restaurant', 'fast_food', 'food_court', 'cafe',
//         //shopping
//         'marketplace',
//         //entertainment and also from osm_feature_list
//         'arts_centre', 'cinema', 'nightclub', 'theatre',
//         //school
//         'school', 'kindergarten', 'college', 'university',
//         'library', //library and also from osm_feature_list
//         //health
//         'clinic', 'dentist', 'doctors', 'hospital', 'pharmacy', 'veterinary'
//     ]
//     let query = ''
//     for (let amenity of osmAmenities) {
//         query += `node(poly:"${polygon}")["amenity"="${amenity}"]; way(poly:"${polygon}")["amenity"="${amenity}"]; relation(poly:"${polygon}")["amenity"="${amenity}"];`
//     }
//     for (let feature of osmFeatures) {
//         query += `node(poly:"${polygon}")[${feature}]; way(poly:"${polygon}")[${feature}]; relation(poly:"${polygon}")[${feature}];`
//     }
//     return new Promise((resolve, reject) => {
//         axios.post(url, querystring.stringify({
//                 data: `[out:json];
//                     (${query});
//                     out center;`
//             }), {
//                 headers: {
//                     'content-type': 'application/x-www-form-urlencoded'
//                 }
//             })
//             .then(response => {
//                 const features = []
//                 for (let item of response.data.elements) {
//                     let type = 'POI'
//                     let icon = `${serverAddress}/static/marker-15.svg`
//                     if ('shop' in item.tags) {
//                         type = 'Grocery'
//                         if (item.tags.shop === 'alcohol' || item.tags.shop === 'beverages') {
//                             icon = `${serverAddress}/static/alcohol-shop-15.svg`
//                         } else if (item.tags.shop === 'bakery') {
//                             icon = `${serverAddress}/static/bakery-15.svg`
//                         } else if (item.tags.shop === 'books') {
//                             icon = `${serverAddress}/static/library-15.svg`
//                         } else {
//                             icon = `${serverAddress}/static/shop-15.svg`
//                             type = 'Shopping'
//                         }
//                     } else if ('leisure' in item.tags) {
//                         icon = `${serverAddress}/static/playground-15.svg`
//                         type = 'Entertainment'
//                     } else if ('sport' in item.tags) {
//                         icon = `${serverAddress}/static/basketball-15.svg`
//                         type = 'Entertainment'
//                     } else if ('historic' in item.tags) {
//                         icon = `${serverAddress}/static/town-hall-15.svg`
//                         type = 'Entertainment'
//                     } else if ('amenity' in item.tags) {
//                         if (item.tags.amenity === 'atm' || item.tags.amenity === 'bank') {
//                             icon = `${serverAddress}/static/bank-15.svg`
//                             type = 'Bank'
//                         } else if (item.tags.amenity === 'bar' || item.tags.amenity === 'pub') {
//                             icon = `${serverAddress}/static/bar-15.svg`
//                             type = 'Restaurant'
//                         } else if (item.tags.amenity === 'restaurant') {
//                             icon = `${serverAddress}/static/restaurant-15.svg`
//                             type = 'Restaurant'
//                         } else if (item.tags.amenity === 'cafe') {
//                             icon = `${serverAddress}/static/cafe-15.svg`
//                             type = 'Restaurant'
//                         } else if (item.tags.amenity === 'fast_food' || item.tags.amenity === 'food_court') {
//                             icon = `${serverAddress}/static/fast-food-15.svg`
//                             type = 'Restaurant'
//                         } else if (item.tags.amenity === 'marketplace') {
//                             icon = `${serverAddress}/static/shop-15.svg`
//                             type = 'Grocery'
//                         } else if (item.tags.amenity === 'arts_centre') {
//                             icon = `${serverAddress}/static/art-gallery-15.svg`
//                             type = 'Entertainment'
//                         } else if (item.tags.amenity === 'cinema') {
//                             icon = `${serverAddress}/static/cinema-15.svg`
//                             type = 'Entertainment'
//                         } else if (item.tags.amenity === 'nightclub') {
//                             icon = `${serverAddress}/static/music-15.svg`
//                             type = 'Entertainment'
//                         } else if (item.tags.amenity === 'theatre') {
//                             icon = `${serverAddress}/static/theatre-15.svg`
//                             type = 'Entertainment'
//                         } else if (item.tags.amenity === 'school' || item.tags.amenity === 'kindergarten') {
//                             icon = `${serverAddress}/static/school-15.svg`
//                             type = 'School'
//                         } else if (item.tags.amenity === 'college' || item.tags.amenity === 'university') {
//                             icon = `${serverAddress}/static/college-15.svg`
//                             type = 'School'
//                         } else if (item.tags.amenity === 'library') {
//                             icon = `${serverAddress}/static/library-15.svg`
//                             type = 'Library'
//                         } else if (item.tags.amenity === 'hospital' || item.tags.amenity === 'clinic' || item.tags.amenity === 'dentist' ||
//                             item.tags.amenity === 'doctors' || item.tags.amenity === 'veterinary') {
//                             icon = `${serverAddress}/static/hospital-15.svg`
//                             type = 'Health'
//                         } else if (item.tags.amenity === 'pharmacy') {
//                             icon = `${serverAddress}/static/pharmacy-15.svg`
//                             type = 'Health'
//                         }
//                     }
//                     features.push({
//                         "type": "Feature",
//                         "geometry": {
//                             "type": "Point",
//                             "coordinates": item.type === 'node' ? [item.lon, item.lat] : [item.center.lon, item.center.lat]
//                         },
//                         "properties": {
//                             "name": 'name' in item.tags ? item.tags.name : 'NAME',
//                             "type": type,
//                             "icon": icon
//                         }
//                     })
//                     resolve({
//                         "type": "FeatureCollection",
//                         "features": features
//                     })
//                 }
//             })
//             .catch(error => {
//                 reject(error)
//             })
//     })
// }

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
