var express = require('express');
var app = express();
var port = process.env.PORT || 3000;        // set our port
var http = require('http');
var mysql = require('mysql');
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('logs/colijnApi.log',{'flags':'a'}));
var Beslist = require('./services/Beslist');
var Import = require('./services/Import');
var Generatexml = require('./services/Generatexml');
var config = require('./config');
var schedule = require('node-schedule');
var Beslist = Beslist();
var Generatexml = Generatexml();
var Import = Import();


var connectionString = {
    host     : config.mysql_hostname,
    user     : config.mysql_username,
    password : config.mysql_password,
    database : config.mysql_database
};

var connection = mysql.createConnection(connectionString);
connection.connect();


var CronJob = require('cron').CronJob;
/* Om zes uur in de ochtend laden we de nieuwste feed in */
new CronJob('* 00 06 * * *', function() {
    log.info('Refreshing feeds');
    Import.parseFeedWrapper(connection);
}, null, true, 'Europe/Amsterdam');

/*
  Zorg ervoor dat om de 10 minuten wordt gechecked of er nieuwe data is van beslist
  En schiet deze vervolgens naar Colijn
 */
new CronJob('0 */10 * * * *', function() {
    log.info('Polling for new data...');
    Beslist.parseOrders(connection);
    Generatexml.xmlOrderOutput(connection);
    Generatexml.xmlCustomerOutput(connection);
}, null, true, 'Europe/Amsterdam');


/* TODO
 - waardes veranderen bij orders
 - Zorg ervoor dat de priceupdate gescheiden wordt, dat eerst de data wordt toegevoegd en daarna de price update wordt gedaan
 */





app.listen(port);
console.log('Magic happens on port ' + port);

