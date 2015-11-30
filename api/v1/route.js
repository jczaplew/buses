var api = require('./api'),
    larkin = require('./larkin'),
    dbg = require('dbgeo');

var days = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
}

module.exports = function(req, res, next) {
  var dotw = new Date().getDay();

  if (('' + req.params.route_id).length < 2) {
    req.params.route_id = '0' + req.params.route_id;
  }

  // Janky because postgres doesn't like similarity + ST_AsGeoJSON in the same select?
/*  var sql = 'WITH first AS (SELECT route_short_name AS route_id, trip_headsign, trip_id ' +
      'FROM trips ' +
      'JOIN routes ON trips.route_id = routes.route_id ' +
      'JOIN calendar ON trips.service_id = calendar.service_id ' +
      'WHERE route_short_name = $1 AND ' + days[dotw] + " = 'TRUE' " +
      'ORDER BY similarity(trip_headsign, $2::varchar) DESC ' +
      'LIMIT 1 ) ' +
      'SELECT first.route_id, first.trip_headsign, ST_AsGeoJSON(geom) AS geometry ' +
      'FROM first ' +
      'JOIN trips ON first.trip_id = trips.trip_id ' +
      'JOIN routes ON trips.route_id = routes.route_id ';*/

    var sql = 'WITH first AS ( ' +
        'SELECT route_short_name AS route_id, trip_headsign, trip_id, shape_id ' +
        'FROM trips ' +
        'JOIN routes ON trips.route_id = routes.route_id ' +
        'JOIN calendar ON trips.service_id = calendar.service_id ' +
        'WHERE route_short_name = $1 AND ' + days[dotw] + " = 'TRUE' " +
        'ORDER BY similarity(trip_headsign, $2::varchar) DESC ' +
        'LIMIT 1 ' +
      '), ' +
      'second AS ( ' +
        'SELECT shape_id, geom  ' +
        'FROM shapes ' +
        'WHERE shape_id = (SELECT shape_id FROM first) ' +
        'ORDER BY shape_pt_sequence ' +
      '), ' +
      'third AS ( ' +
        'SELECT shape_id, st_makeline(geom) geom '  +
        'FROM second ' +
        'GROUP BY shape_id ' +
      ') ' +
      'SELECT first.route_id, first.trip_headsign, degrees(st_azimuth(st_startpoint(geom), st_endpoint(geom))) AS azimuth, ST_AsGeoJSON(geom) geometry ' +
      'FROM first ' +
      'JOIN third ON third.shape_id = first.shape_id ';

  larkin.queryPg('msnbus', sql, [req.params.route_id, req.query.headsign], function(error, response) {
    if (error) {
      console.log(error);
    }

    dbg.parse({
      data: response.rows,
      callback: function(error, result) {
        larkin.sendBare(result, res, next);
      }
    });

  });

}
