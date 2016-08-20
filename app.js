/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

var Promise = require('promise');
var wikipediaDataApi = require("./WikipediaDataApi.js")

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();


app.get('/', function (req, res) {
	res.send("");
});

app.get('/wikipedia-nonreverse-links', function (req, res) {
	var page = req.query['page'];
	var lang = req.query['lang'] || "en";

	if(!page) {
		res.send("Error: Missing page.")
		return;
	}

	page = encodeURIComponent(page);

	wikipediaDataApi.getPageNonReverseAbstractLinks(page, lang).then(function(links) {
		res.send(JSON.stringify(links));
	}, function(err) {
		res.send("Error while getting links.");
	});
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  	// print a message when the server starts listening
  	console.log("server starting on " + appEnv.url);
});