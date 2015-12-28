var express = require('express');
var app = express();
var port = process.env.PORT || 3001;        // set our port
var mysql = require('mysql');
var config = require('./config');
var Import = require('./services/Import');
var schedule = require('node-schedule');
var Import = Import();
var dateFormat = require('dateformat');
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('logs/priceupdate.log',{'flags':'a'}));

var connectionString = {
    host     : config.mysql_hostname,
    user     : config.mysql_username,
    password : config.mysql_password,
    database : config.mysql_database
};

var connection = mysql.createConnection(connectionString);
connection.connect();





var CronJob = require('cron').CronJob;


/*
    Om 5 uur s'ochtend refresh de feeds
 */
new CronJob('0 00 05 * * * *', function() {
    console.log('Adding new products...');
    log.notice('Adding new products...');
    Import.addProductsFromToday(connection);
}, null, true, 'Europe/Amsterdam');


/*
 Om om 06, en om 08 uur doe een price update
 */
new CronJob('0 00 06,08 * * * *', function() {
    log.notice('cronjob called.. price update');
    Import.parseFeedUpdateShopPrice(connection);
}, null, true, 'Europe/Amsterdam');



/* Update price API */
app.listen(port);
console.log('Magic happens on port ' + port);

