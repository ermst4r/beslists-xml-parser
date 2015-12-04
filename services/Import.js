var request = require("request");
var parseString = require('xml2js').parseString;

var Import = function () {



    var parseFeed = function (connection,feedUrl,branch_id) {
        request.get(feedUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                parseString(body, function (err, result) {
                   for(var i = 0; i <result.producten.product.length; i ++ ) {
                       var productData  =
                       {
                           unieke_code:result.producten.product[i].Unieke_code[0],
                           branch_id:branch_id,
                           zelfmontage:result.producten.product[i].zelfmontage[0],
                           verzendmethode:result.producten.product[i].verzendmethode[0],
                           commissiecode:result.producten.product[i].commissiecode[0],
                           warehouse:result.producten.product[i].warehouse[0]
                       };
                       connection.query('INSERT INTO feed_data SET ?', productData, function(err, result) {
                           if (err) {
                               console.log(err);
                           }
                       });
                   }

                });
            } else {
                console.log("HTTP error " + error);
            }
        }).on('error', function(err) {
            console.log(err)
        });
    }


    this.parseFeedWrapper = function(connection) {
        var sql = "SELECT * FROM branches";
        connection.query(sql, function(err, rows, fields) {
            if (err) {
                console.log(err);
            } else {
               rows.forEach()
            }
        });
    }





};


module.exports = function () {
    var instance = new Import();
    return instance;
};