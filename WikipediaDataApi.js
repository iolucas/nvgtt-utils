var https = require('https');
var Promise = require('promise');
var cheerio = require('cheerio');
var async = require('async');


var wikipediaApiUrl = ".wikipedia.org/w/api.php";

module.exports = {

    getPageNonReverseAbstractLinks: getPageNonReverseAbstractLinks,

    getPageAbstractLinks: getPageAbstractLinks,

    getPageLinks: getPageLinks

}

/*getPageNonReverseAbstractLinks("C%2b%2b").then(function(links) {
    console.log(links);
}, function(err) {
    console.log(err);
})*/


function getPageNonReverseAbstractLinks(page, lang) {

    lang = lang || "en";

    var nonReverseLinks = [];

    return new Promise(function(resolve, reject) {

        //Get the specified page links
        getPageAbstractLinks(page, lang).then(function(result) {

            var page = result['page'];
            var links = result['links'];

            var asyncQueue = async.queue(function(link, callback) {
                //console.log("Processing: " + link)

                getPageAbstractLinks(link, lang).then(function(result) {
                    
                    var childPage = result['page'];
                    var childLinks = result['links'];

                    var nonReverseFlag = true;

                    //Iterate thru all the links
                    for (var i = 0; i < childLinks.length; i++) {
                        //Check if the main page is not in the childLink links
                        if(childLinks[i].toUpperCase() == page.toUpperCase()) { 
                            nonReverseFlag = false; //If it is, so it has a reverse link
                            break;  //top the iteration
                        }                            
                    }

                    if(nonReverseFlag)
                        nonReverseLinks.push(childPage); //If not (nonReverse) add it
                        

                    callback();
                }, function(err) {
                    callback(err);
                });
                
            }, 100);

            //On all the tasks end
            asyncQueue.drain = function() {
                //console.log("Non reverse finished.");
                resolve(nonReverseLinks);
            }

            //Push the links to the queue
            asyncQueue.push(links, function(err) {
                if(err)
                    reject(err);    
            });

        }, reject);

    });
}


function getPageAbstractLinks(page, lang) {

    //Page must already been encoded

    lang = lang || "en";    //If the language was not specified, set en (English)

    return new Promise(function (resolve, reject) {
        
        //If no page specified, return error
        if(!page)
            reject("ERROR: No page specified.");

        var requestUrl = "https://" + lang + ".wikipedia.org/w/api.php?action=parse&redirects&section=0&prop=text&format=json&page=" + page;

        httpsGet(requestUrl).then(function(reqData) {

            //Parse json object that contains only the abstract portion of the page
            var reqObj = JSON.parse(reqData)

            //Check some error
            if(reqObj['error']) {
                //Throw reject error
                reject("ERROR:" + reqObj['error']['code'] + " | " + reqObj['error']['info']);
                return;
            }

            //Get the abstract html data
            htmlData = reqObj['parse']['text']['*']
    
            //Load it on cheerio (jQuery like module)
            $ = cheerio.load(htmlData);

            var links = []

            //Get all the a tags inside the (<p> tags, where the abstract is placed) and put them into the links array
            $('a', 'p').each(function(i, elem) {
                 
                var link = $(this).attr('href');

                //Check the link exists and is a wiki link
                if(link && link.indexOf("/wiki/") == 0) { //Get only wikipedia links
                    var lastPathIndex = link.lastIndexOf("/") + 1;
                    linkName = link.substring(lastPathIndex);

                    //If the link is not in the links array, push it 
                    if(links.indexOf(linkName) == -1)
                        links.push(linkName);
                }                 
            });

            //Check and normalize all the links

            var normalizedLinks = [];

            var asyncQueue = async.queue(function(link, callback) {
                //console.log("Processing: " + link)

                getNormalizeWikiLink(link, lang).then(function(normLink) {
                    
                    //Push if it does not exists
                    if(normalizedLinks.indexOf(normLink) == -1)
                        normalizedLinks.push(normLink);

                    callback();
                }, function(err) {
                    //Dont care about error here
                    callback();
                });
                
            }, 100);

            //On all the tasks end
            asyncQueue.drain = function() {
                //console.log("Normalize finished.");
                resolve({
                    page: page,
                    links: normalizedLinks
                });
            }

            //Push the links to the queue
            asyncQueue.push(links, function(err) {
                if(err)
                    reject(err);    
            });

        }, reject);
    });
}

function getPageLinks(page, lang) {

    return new Promise(function (resolve, reject) {
        
        //If no page specified, return error
        if(!page)
            reject("ERROR: No page specified.");

        lang = lang || "en";    //If the language was not specified, set en (English)

        var requestUrl = "https://" + lang + ".wikipedia.org/w/api.php?action=query&redirects&pllimit=500&format=json&prop=links&titles=" + page;

        getPartialLinks(requestUrl, function(buffer, err) {
            //If error
            if(err) //reject with error obj
                reject(err);
            else //if no error, resolve with buffer
                resolve(buffer);
        });

    });
}


//Function to return the true link in case of any redirection is present on the page
//Example url: https://en.wikipedia.org/w/api.php?action=opensearch&redirects=resolve&limit=1&format=jsonfm&search=Tibia_(computer_game)
function getNormalizeWikiLink(page, lang) {
    //Page arg must already be encoded

    lang = lang || "en";

    var queryString = "?action=opensearch&redirects=resolve&limit=1&format=json&search=" + page;

    return new Promise(function(resolve, reject) {

        httpsGet("https://" + lang + wikipediaApiUrl + queryString)
            .then(function(reqData) {
                var reqObj = JSON.parse(reqData);
                
                //If some error, reject it
                if(reqObj['error']) {
                    reject(JSON.stringify(reqObj['error']));
                    return;
                }

                //If the third array is empty, reject as no results error
                if(reqObj[3].length == 0) {
                    reject('NormalizeWikiLink ERROR: No results for ' + page);   
                    return;
                }

                //Get the result string
                var resultAddr = reqObj[3][0];
                //Get the last path index
                var lastPathIndex = resultAddr.lastIndexOf("/") + 1;
                //Return the last path (true link)
                resolve(resultAddr.substring(lastPathIndex));
        
            }, function(err) {
                reject(err);
            });
    });

}

function print() {
    return console.log.apply(this, arguments);
}

function getPartialLinks(url, callback, originalUrl, buffer) {

    //Set optional options
    originalUrl = originalUrl || url;   //Original url to be used for continue options
    buffer = buffer || [];  //Buffer to store links

    //Execute get request
    httpsGet(url).then(function(recData) {

        //Parse json result
        recObj = JSON.parse(recData);            

        //Iterate thru the pages
        for(var page in recObj['query']['pages']) {

            var pageObj = recObj['query']['pages'][page];

            //Iterate thru the links on the page
            for(var link in pageObj['links']) {
                var linkObj = pageObj['links'][link];
                buffer.push(linkObj['title']);
            }
        }

        //If we still got results to go
        if(recObj['continue']) {
            //Recurse this function again
            var continueUrl = originalUrl + "plcontinue=" + recObj['continue']["plcontinue"];
            getPartialLinks(continueUrl, callback, originalUrl, buffer);
        } else {
            //If there is no continue (results to gather), resolve the callback
            callback(buffer);
        }

    }, function(err) {
        //If some error, resolve callback with null
        callback(null, err);
    });
}




function simpleHttpsGet(url, callback) {

    var recData = '';

    https.get(url, function(res) {
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

function httpsGet(url) {

	return new Promise(function (resolve, reject) {
		
		var recData = '';

		https.get(url, function(res) {
  			res.setEncoding('utf8');

			res.on('data', (chunk) => {
				recData += chunk;
			});

			res.on('end', () => {

				resolve(recData);	
			});

			res.on('error', (e) => {
				reject(e);		
			});

		}).on('error', (e) => {
  			reject(e);
		});
	});
}