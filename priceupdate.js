var express = require('express');
var app = express();
var port = process.env.PORT || 3001;        // set our port
var mysql = require('mysql');
var Import = require('./services/Import');
var schedule = require('node-schedule');
var Import = Import();
var dateFormat = require('dateformat');
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('logs/priceupdate.log',{'flags':'a'}));


var connectionString = {
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'poortvliet'
};

var connection = mysql.createConnection(connectionString);
connection.connect();




var CronJob = require('cron').CronJob;
new CronJob('0 */59 * * * *', function() {
    console.log('running cron');
    log.notice('Cronjob has been called');

}, null, true, 'Europe/Amsterdam');





/* Update price API */

Import.parseFeedUpdateShopPrice(connection);
app.listen(port);
console.log('Magic happens on port ' + port);

