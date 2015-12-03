var express = require('express');
var app = express();
var port = process.env.PORT || 3000;        // set our port
var http = require('http');
var file_url = 'https://www.beslist.nl/xml/shoppingcart/shop_orders/?checksum=2daa1c5c1c7638f0c9707a7bb85f1b90&client_id=18132&shop_id=532600&date_from=2015-01-01&date_to=2015-11-15&output_type=test&test_orders=9';
var request = require('request');
var parseString = require('xml2js').parseString;
var util = require('util');
var mysql = require('mysql');
var async = require('async');
var connectionString = {
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'poortvliet'
};
var connection = mysql.createConnection(connectionString);
connection.connect();


async.series([
     function (callback) {

    }, function (callback) {

    }
    ], function(error, results) {

});







request.get(file_url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        parseString(body, function (err, result) {

            //console.log(result.shoppingCart.shopOrders[0].shopOrder);
            result.shoppingCart.shopOrders[0].shopOrder.forEach(function(res) {
                   var sql    = "SELECT COUNT(*) AS countOrder FROM orders WHERE order_number = "+ connection.escape(res.orderNumber[0]['_']);
                   connection.query(sql, function(err, rows, fields) {
                       if (err) {
                           console.log(err);
                       } else {
                           if(rows[0].countOrder == 0 ) {
                               var orderData  =
                               {
                                   order_number:res.orderNumber[0]['_'],
                                   b2b:res.b2b[0],
                                   date_created:res.dateCreated[0],
                                   price:res.price[0],
                                   shipping:res.shipping[0],
                                   transaction_costs:res.transactionCosts[0],
                                   commision:res.commission[0],
                                   numProducts:res.numProducts[0]
                               };
                               connection.query('INSERT INTO orders SET ?', orderData, function(err, result) {
                                   if (err) {
                                       console.log(err);
                                   }
                               });
                           }
                       }
                   });
               }
           );

        });
    }
    }).on('error', function(err) {
        console.log(err)
    });


app.listen(port);
console.log('Magic happens on port ' + port);

