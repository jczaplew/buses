var api = require("./api"),
    larkin = require("./larkin");

api.route("/")
  .get(require("./root"));

api.route("/stop/:stop_id")
  .get(require("./stop"));

api.route("/stops")
  .get(require("./stops"));

api.route("/route/:route_id")
  .get(require("./route"));

api.route("*")
  .get(require("./catchall"));

api.use(function(err, req, res, next) {
  if(err.status !== 404) {
    return next();
  } else if (err.status === 404) {
    larkin.error(req, res, next, "404: Page not found", 404);
  } else {
    larkin.error(req, res, next, "500: Internal Server Error", 500);
  }
});

module.exports = api;
