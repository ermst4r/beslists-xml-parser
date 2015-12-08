var express = require('express');
var app = express();
var port = process.env.PORT || 3000;        // set our port
var http = require('http');
var util = require('util');
var mysql = require('mysql');
var async = require('async');
var Beslist = require('./services/Beslist');
var Import = require('./services/Import');
var Generatexml = require('./services/Generatexml');
var schedule = require('node-schedule');
var Beslist = Beslist();
var Generatexml = Generatexml();
var Import = Import();
var dateFormat = require('dateformat');



var connectionString = {
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'poortvliet'
};

var connection = mysql.createConnection(connectionString);
connection.connect();





// add the feeds in the database
//Import.parseFeedWrapper(connection);
// generate the xml output
//Generatexml.xmlOrderOutput(connection);
//Generatexml.xmlCustomerOutput(connection);
// add the new order to the database
//Beslist.parseOrders(connection);

/* Update price API */
Import.parseFeedUpdateShopPrice(connection);

//async.series([
//    function(callback) {
//       console.log("import feed");
//    }, function (callback) {
//        console.log("checking");
//    }
//
//], function(err,res) {
//
//});




app.listen(port);
console.log('Magic happens on port ' + port);

