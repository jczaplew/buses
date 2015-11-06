var pg = require('pg');
var cheerio = require('cheerio');
var async = require('async');
var request = require('request');
var credentials = require('./credentials');

// These are the unwanted links on every page
var badLinks = ['Go Back', 'Mobile Stop Times', 'Transit Tracker Home'];

function queryPg(sql, params, callback) {
    pg.connect("postgres://" + credentials.pg.user + "@" + credentials.pg.host + "/" + credentials.pg.db, function(err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = client.query(sql, params, function(err, result) {
        done();
        if (err) {
          return callback(err);
        }

        callback(null, result.rows);

      });
     // console.log(query);

    });
  };

async.waterfall([

  // Start by getting a list of all available routes
  function(callback) {
    var routes = [];

    request('http://webwatch.cityofmadison.com/webwatch/mobileada.aspx', function(error, response, body) {
      $ = cheerio.load(body);
      var links = $('a').each(function(i, a) {
        // Clean up the text
        var route = $(this).text().replace('Route', '').replace('Supplemental', '').trim();
        if (badLinks.indexOf(route) === -1) {
          routes.push(route);
        }
      });

      console.log('1. Done fetching stops');
      callback(null, routes);
    });
  },

  // Get all directions for each route
  function(routes, callback) {
    var routeDirections = {};
    var directions = {};
    async.eachLimit(routes, 5, function(route, callback) {
      request('http://webwatch.cityofmadison.com/webwatch/MobileAda.aspx?r=' + route, function(error, response, body) {
        $ = cheerio.load(body);

        var links = $('a').each(function(i, a) {
          var direction = $(this).text().trim();
          var href = $(this).attr('href');
          var directionID = href.substr(href.indexOf('d=') + 2, href.length);
          if (badLinks.indexOf(direction) === -1) {

            if (!(route in routeDirections)) {
              routeDirections[route] = [directionID]
            } else {
              routeDirections[route].push(directionID)
            }

            if (!(directionID in directions)) {
              directions[directionID] = {
                id: directionID,
                name: direction
              }
            }
          }
        });

        callback(null);
      });
    }, function(error) {
      if (error) {
        console.log(error);
      }

      console.log('2. Done getting directions');
      callback(null, routes, directions, routeDirections)
    });
  },

  // Get rid of routes
  function(routes, directions, routeDirections, callback) {
    async.eachLimit(routes, 5, function(route, callback) {
      queryPg("INSERT INTO routes (route_id) VALUES ($1)", [route], function(error, result) {
        if (error) {
          console.log(errror);
        }
        callback(null);
      });
    }, function() {

      console.log('3. Done inserting routes');
      callback(null, directions, routeDirections);
    });
  },

  // Get rid of directions
  function(directions, routeDirections, callback) {
    async.eachLimit(directions, 5, function(direction, callback) {
      queryPg("INSERT INTO directions (direction_id, name) VALUES ($1, $2)", [direction.id, direction.name], function(error, result) {
        if (error) {
          console.log(error);
        }
        callback(null);
      });
    }, function() {
      console.log('4. Done inserting directions');
      callback(null, routeDirections);
    });
  },

  // Get all stops for route-direction pairs
  function(routeDirections, callback) {
    var stops = {};
    var tuples = [];
    async.eachLimit(Object.keys(routeDirections), 2, function(route, callback) {
      async.each(routeDirections[route], function(direction, callback) {
        request('http://webwatch.cityofmadison.com/webwatch/MobileAda.aspx?r=' + route + '&d=' + direction, function(error, response, body) {
          $ = cheerio.load(body);
          $('a').each(function(i, a) {
            var stop = $(this).text().trim();
            if (badLinks.indexOf(stop) === -1 || stop.length < 1) {
              var href = $(this).attr('href');
              var stopID = href.substr(href.indexOf('s=') + 2, href.length);
              var brackets = stop.match(/\[([^)]+)\]/) ? stop.match(/\[([^)]+)\]/)[1] : '';

              var directionString = brackets.substr(0, 2);
              var gtfsID = brackets.substr(brackets.indexOf('#') + 1, brackets.length);
              var altName = stop.match(/\(([^)]+)\)/) ? stop.match(/\(([^)]+)\)/)[1] : '';
              stop = stop.substr(0, stop.indexOf('[')).trim();

              if (!(stopID in stops)) {
                stops[stopID] = {
                  stop_id: stopID,
                  gtfs_id: gtfsID,
                  name: stop,
                  alt_name: altName,
                  direction: directionString
                }
              }

              tuples.push({
                route: route,
                direction: direction,
                stop: stopID
              });
            }

          });

          callback(null);
        });
      }, function() {
        callback(null);
      });
    }, function() {
      console.log('5. Done getting stops');
      callback(null, stops, tuples);
    });
  },

  // Record the stops
  function(stops, tuples, callback) {
    async.eachLimit(stops, 5, function(stop, callback) {
      queryPg("INSERT INTO stops (stop_id, gtfs_id, name, alt_name, direction) VALUES ($1, $2, $3, $4, $5)", [stop.stop_id, stop.gtfs_id, stop.name, stop.alt_name, stop.direction], function(error, result) {
        if (error) {
          error.stop = stop;
          callback(error);
        }
        callback(null);
      })
    }, function(error) {
      if (error) {
        console.log(error);
      }
      console.log('6. Done inserting stops');
      callback(null, tuples);
    });
  },

  // Record the tuples
  function(tuples, callback) {
    async.eachLimit(tuples, 5, function(tuple, callback) {
      queryPg("INSERT INTO route_stop_directions (route_id, direction_id, stop_id) VALUES ($1, $2, $3)", [tuple.route, tuple.direction, tuple.stop], function(error, result) {
        if (error) {
          error.tuple = tuple;
          callback(error);
        }
        callback(null);
      })
    }, function(error) {
      if (error) {
        console.log(error);
      }
      console.log('7. Done inserting tuples');
      callback(null);
    });
  }

], function(error, result) {
  if (error) {
    console.log(error);
  }
  console.log('8. All done!');
  process.exit(0);
});
