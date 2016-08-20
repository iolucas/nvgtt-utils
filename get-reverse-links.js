var Promise = require('promise');
var wikipediaDataApi = require("./wikipediaDataApi.js")

console.log("----- Get Reverse Links -----\n")

var page = process.argv[2];
var lang = process.argv[3] || "en";

if(!page) {
    console.error("No page specified.");
    process.exit(1);
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

//Replace bug characters
page = page.replaceAll("%E2%80%93", "-");
page = page.replaceAll("–", "-");

//console.log(page + " | " + lang);
//process.exit(0);

/* Know Issues
Pages that are redirected does not work (I.e. TCP/IP)
Case sensitive links fail on compare (maybe put them all lowcase before compare)
Some chars bug when submitted to search (i.e. model-view-controller), we can replace these chars but them we fail on compare
*/


//Get the main page links
getLinks(page, lang, function(links, error) {

    if(error) {
        console.error(error);
        process.exit(1);
    }

    console.log(links);
    console.log(links.length);

    var iterationAccumulator = links.length;
    var nonReverseLinks = [];

    //Iterate thru links
    for (var i = 0; i < links.length; i++) {
        var link = links[i];

        //Get the links from the respective page 
        getLinks(link, lang, function(links, error, reqPage, lang) {
            //console.log(reqPage + " | " + page);

            //If the page is not present in the target link references (reverse link)
            if(links.indexOf(page) == -1)
                nonReverseLinks.push(reqPage);  //Push it to the buffer           
            
            //Subtracts a unit from the iteration accumulator
            iterationAccumulator--;
            //When the final callback returns
            if(iterationAccumulator == 0) {
                console.log("Iteration complete.");
                console.log(nonReverseLinks);
                console.log(nonReverseLinks.length);
            }
        });  
    }


});





function getLinks(page, lang, callback) {

    wikipediaDataApi.getPageAbstractLinks(page, lang).then(function(links) {

        //Delete non wiki links
        var wikiLinks = [];

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            //Check wiki
            if(link.indexOf("/wiki/") == 0)
                wikiLinks.push(link.substring(6)); //Push the link without the "/wiki/" part        
        }

        callback(wikiLinks, null, page, lang);

    }, function(err) {
         callback(null, err);
    });

}



