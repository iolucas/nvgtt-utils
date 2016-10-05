var json2csv = require('json2csv');
var http = require('http');

/*var fs = require("fs")
var data = fs.readFileSync("jsonFile.json", {encoding: 'utf-8'});

data = JSON.parse(data).bids;*/

/*try {
  var result = json2csv({ data: data });
  console.log(result);
} catch (err) {
  // Errors are thrown for bad options, or if the data is empty and no fields are provided. 
  // Be sure to provide fields if it is possible that your data array will be empty. 
  console.error(err);
}*/

module.exports = {
	getUrlToCsv: getUrlToCsv
}

/*getUrlToCsv("api.bitvalor.com/v1/order_book.json", function(err, result) {
	console.log(result);

});*/

function getUrlToCsv(url, callback) {

	simpleHttpGet("http://" + url, function(err, data) {
		if(err) {
			callback("ERROR");
			return;
		}

		try {
  			var result = json2csv({ data: JSON.parse(data).bids });
  			callback(null, result);
  			return;
		} catch (err) {
			callback("ERROR");
			return;
		}

	});
}

function simpleHttpGet(url, callback) {

    var recData = '';

    http.get(url, function(res) {
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            recData += chunk;
        });

        res.on('end', function() {
            callback(null, recData);
        });

        res.on('error', function(e) {
            callback(e);		
        });

    }).on('error', (e) => {
        callback(e);
    });
}