(function() {
  var async = require("async");

  var defs = {};
  
  defs["/stop"] = {
    "description": "Optionally provide a type parameter to see it in the response. Doesn't exist in v2.",
    "visible": false,
    "options": {
      "parameters": {
        "type": "text, a random string to return in the output",
        "format": "string, desired output format"
      },
      "output_formats": ["json", "csv"],
      "examples": [
        "/api/types?type=MyFavoriteColorIsGreen",
        "/api/types?type=Cats&format=csv",
      ],
      "fields": [
        "id",
        "type"
      ]
    }
  };

  // This is the primary dictionary for all field definitions
  defs.define = {
    "id": "integer, unique identifier",
    "type": "string, a random user provided string"
  };

  module.exports = defs;
}());
