var api = require('./api'),
    larkin = require('./larkin'),
    async = require('async'),
    request = require('request'),
    moment = require('moment'),
    cheerio = require('cheerio');

module.exports = function(req, res, next) {

  larkin.queryPg('msnbus', 'SELECT route_id, direction_id, route_stop_directions.stop_id FROM route_stop_directions JOIN stops_scraped ON stops_scraped.stop_id = route_stop_directions.stop_id WHERE gtfs_id = $1', [req.params.stop_id], function(error, response) {
    if (error) {
      console.log(error);
    }

    // This holds the output
    var out = [];

    async.eachLimit(response.rows, 10, function(tuple, callback) {
      request('http://webwatch.cityofmadison.com/webwatch/MobileAda.aspx?r=' + tuple.route_id + '&d=' + tuple.direction_id + '&s=' + tuple.stop_id, function(error, response, body) {
        if (error) {
          console.log(error);
        }

        $ = cheerio.load(body);

        $('div[align=Left]').html().split('<br>').forEach(function(d) {
          if (!(isNaN(d.trim().substr(0, 1))) && d.trim().length) {
            var data = d.trim().split(' TO ');
            var time = data[0].replace(/\./g, '').trim();
            var until = moment(time, 'hh:mm A').diff(moment(), 'minutes');

            out.push({
              r: tuple.route_id,
              d: data[1].trim(),
              t: time,
              u: until
            });
          }
        });

        callback(null);

      });
    }, function(error) {
      if (error) {
        console.log(error);
      }

      out.sort(function(a, b) {
        return a.u - b.u;
      });

      larkin.sendCompact(out, res, null, next);
    });

  });

}
