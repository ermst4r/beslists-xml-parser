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
var config = require('./config');

var schedule = require('node-schedule');
var Beslist = Beslist();
var Generatexml = Generatexml();
var Import = Import();
var dateFormat = require('dateformat');


var connectionString = {
    host     : config.mysql_hostname,
    user     : config.mysql_username,
    password : config.mysql_password,
    database : config.mysql_database
};

var connection = mysql.createConnection(connectionString);
connection.connect();





//var CronJob = require('cron').CronJob;
//new CronJob('*/59 * * * * *', function() {
//
//}, null, true, 'America/Los_Angeles');





// add the feeds in the database
//Import.parseFeedWrapper(connection);
// generate the xml output
Generatexml.xmlOrderOutput(connection);
// add the new order to the database
Beslist.parseOrders(connection);
Generatexml.xmlCustomerOutput(connection);

//Import.parseFeedUpdateShopPrice(connection);





app.listen(port);
console.log('Magic happens on port ' + port);

