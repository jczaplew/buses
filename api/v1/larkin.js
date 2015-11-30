var async = require("async"),
    api = require("./api"),
    pg = require("pg"),
    defs = require("./defs"),
    credentials = require("./credentials");


(function() {
  var larkin = {};

  // If you want to use Postgres
  larkin.queryPg = function(db, sql, params, callback) {
    pg.connect("postgres://" + credentials.pg.user + "@" + credentials.pg.host + "/" + db, function(err, client, done) {
      if (err) {
        this.log("error", "error connecting - " + err);
        callback(err);
      } else {
        var query = client.query(sql, params, function(err, result) {
          done();
          if (err) {
            this.log("error", err);
            callback(err);
          } else {
            callback(null, result);
          }

        }.bind(this));
       // console.log(query);
      }
    }.bind(this));
  };


  // Return data to the client
  larkin.sendData = function(data, res, format, next) {
    if (data.length > 5) {
      res
        .set("Content-type", "application/json; charset=utf-8")
        .send(JSON.stringify({"success": {"v": api.version,"data": data}}, null, 0));
      } else {
        res.json({
          "success": {
            "v": api.version,
            "data": data
          }
        });
      }
   };

   // Identical to sendData, but removes padding
  larkin.sendCompact = function(data, res, format) {
    res
      .set("Content-type", "application/json; charset=utf-8")
      .send(JSON.stringify({"success": {"v": api.version,"data": data}}, null, 0));
  };

  // Identical to sendCompact, but removes standard wrapper
  larkin.sendBare = function(data, res, next) {
    res
      .set("Content-type", "application/json; charset=utf-8")
      .send(JSON.stringify(data, null, 0));
   };


  larkin.info = function(req, res, next) {
    this.defineRoute(req.route.path, function(definition) {
      res.json({
        "success": definition
      });
    });
  };

  // Send an error to the client
  larkin.error = function(req, res, next, message, code) {
    var responseMessage = (message) ? message : "Something went wrong. Please contact the administrator.";
    if (code && code === 500 || code === 404) {
      res
        .status((code) ? code : 200)
        .json({
          "error": {
            "message": responseMessage
          }
        });
    } else {
      this.defineRoute(req.route.path, function(definition) {
        res
          .status((code) ? code : 200)
          .json({
            "error": {
              "v": api.version,
              "message": responseMessage,
              "about": definition
            }
          });
      });
    }

  };

  larkin.log = function(type, message) {
    console.log(type, message);
  };

  // Will return all field definitions
  larkin.defineFields = function(route, callback) {
    var routeDefs = {}
    async.each(defs[route].options.fields, function(field, callback) {
      if (defs.define.hasOwnProperty(field)) {
        routeDefs[field] = defs.define[field];
      } else {
        routeDefs[field] = ""
      }
      callback()
    }, function(error, result) {
      callback(routeDefs);
    });
  };

  // Get the metadata for a given route
  larkin.defineRoute = function(route, callback) {
    this.defineFields(route, function(fields) {
      var routeDefinition = {
        "v": api.version,
        "description": defs[route].description,
        "options": {
          "parameters": defs[route].options.parameters,
          "output_formats": defs[route].options.output_formats,
          "examples": defs[route].options.examples
        }
      };
      routeDefinition.options.fields = fields;
      callback(routeDefinition);
    });
  };


  module.exports = larkin;

}());
