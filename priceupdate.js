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

log.notice('Adding new products...');
var connectionString = {
    host     : config.mysql_hostname,
    user     : config.mysql_username,
    password : config.mysql_password,
    database : config.mysql_database
};

var connection = mysql.createConnection(connectionString);
connection.connect();




Import.parseFeedUpdateShopPrice(connection);
var CronJob = require('cron').CronJob;


/*
 Om 5 uur s'ochtend refresh de feeds
 */

var j = schedule.scheduleJob({hour: 05, minute: 01}, function(){
    console.log('Adding new products...');
    Import.addProductsFromToday(connection);
});

/*
 om 07 uur doe een price update
 */
var i = schedule.scheduleJob({hour: 07, minute: 01}, function(){
    console.log('cronjob called.. price update');
    Import.parseFeedUpdateShopPrice(connection);
});

/* Update price API */
app.listen(port);
console.log('Magic happens on port ' + port);

