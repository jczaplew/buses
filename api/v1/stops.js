var api = require('./api'),
    larkin = require('./larkin'),
    dbg = require('dbgeo');

module.exports = function(req, res, next) {

  larkin.queryPg('msnbus', 'SELECT stop_code as code, name_clean as name, stop_desc as desc, stop_lat as lat, stop_lon as lng, ST_AsGeoJSON(geom) AS geometry FROM stops', [], function(error, response) {
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
