var express = require('express');
var app = express();
var port = process.env.PORT || 3000;        // set our port
var http = require('http');
var util = require('util');
var mysql = require('mysql');
var Beslist = require('./services/Beslist');
var Import = require('./services/Import');
var Generatexml = require('./services/Generatexml');
var schedule = require('node-schedule');
var Beslist = Beslist();
var Generatexml = Generatexml();
var Import = Import();

var connectionString = {
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'poortvliet'
};

var connection = mysql.createConnection(connectionString);
connection.connect();
//Import.parseFeedWrapper(connection);
//Import.parseFeed(connection,'http://sandbox.ermst4r.nl/test.xml',1);



//Generatexml.productXmlOutput(connection);
//Beslist.parseOrders(connection);
app.listen(port);
console.log('Magic happens on port ' + port);

