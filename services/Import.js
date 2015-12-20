var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");
var Apirequests = require("../services/Apirequests");
var moment = require('moment');
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('output.log',{'flags':'a'}));


var Import = function () {


    var parseFeed = function (connection,feedUrl,branch_id,table) {
        request.get(feedUrl, function (error, response, body) {

            if (!error && response.statusCode == 200) {
                parseString(body, function (err, result) {
                   for(var i = 0; i <result.producten.product.length; i ++ ) {
                       if(table =='feed_update_data')  {
                           var productData  =
                           {
                               unieke_code:result.producten.product[i].Unieke_code[0],
                               branch_id:branch_id,
                               prijs:result.producten.product[i].Prijs[0],
                               warehouse:result.producten.product[i].warehouse[0],
                               creation_date:moment().format('YYYY-MM-DD')
                           };
                       } else {
                           var productData  =
                           {
                               unieke_code:result.producten.product[i].Unieke_code[0],
                               branch_id:branch_id,
                               zelfmontage:result.producten.product[i].zelfmontage[0],
                               verzendmethode:result.producten.product[i].verzendmethode[0],
                               commissiecode:result.producten.product[i].commissiecode[0],
                               warehouse:result.producten.product[i].warehouse[0]
                           };

                       }

                       connection.query('INSERT INTO '+table+' SET ?', productData, function(err, result) {
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
               rows.forEach(function(item) {
                   connection.query('DELETE FROM feed_data WHERE branch_id ="'+item.branch_id+'"', function (err, result) {
                       if (err) throw err;
                       console.log('deleted ' + result.affectedRows + ' rows');
                   })

                   console.log('re-add feed data');
                   parseFeed(connection,item.branch_feed,item.branch_id,'feed_data');
               });
            }
        });
    }


    this.parseFeedUpdateShopPrice = function(connection) {

        var branches = new Array();
        var yesterday = moment().subtract(1, 'days');
        var twoDaysAgo =  moment().subtract(2, 'days');
        var today = moment();
        var BeslistPriceApi = new Apirequests();
        async.series([



            // verkrijg de data van de branches
            function(callback) {
                log.info('krijg de data van de branches');
                var sql = "SELECT * FROM branches WHERE  allow_price_update ='1'";
                connection.query(sql, function(err, rows, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        rows.forEach(function(item) {
                            branches.push(item);

                        });
                    }
                    callback();
                });
            },

            // Verwijder de feed van vandaag en voeg deze opniuw toe
            function (callback) {
                console.log('deleted feed');
                branches.forEach(function(brancheItem) {
                    connection.query("DELETE FROM feed_update_data WHERE branche_id ='"+brancheItem.branch_id+"'  AND creation_date='" + today.format('YYYY-MM-DD')+" 00:00:00'", function (err, result) {
                        if (err) throw err;
                        if(err != null) {
                            log.emergency(err);
                        }

                    })
                });
                callback();

            },


            // check de feed versus de database met de datum van gisteren
            function (callback) {
                log.info('vergelijk de feed met de db van gisteren');
                branches.forEach(function(brancheItem) {
                    // controlleer of de feed van gisteren bestaat
                    var checkItemSql = "SELECT COUNT(*) As itemsFound FROM feed_update_data WHERE branch_id='" + brancheItem.branch_id + "' AND creation_date='"+yesterday.format('YYYY-MM-DD')+" 00:00:00'";
                    connection.query(checkItemSql, function(err, rows, fields) {
                        if(err) throw  err;
                        // check of de feed van gisteren bestaat
                        // dmv hoeveel items zijn gevonden
                        if(rows[0].itemsFound > 0) {
                            // Pak de feed van vandaag
                            // Deze is van tevoren in de db geknalt.
                            connection.query("SELECT * FROM feed_update_data  WHERE  creation_date=DATE('"+today.format('YYYY-MM-DD')+"') AND branch_id='" + brancheItem.branch_id + "'   ", function(mainError, mainItems, mainFields) {
                                if (mainError) throw  mainError;
                                mainItems.forEach(function(mainItem) {
                                    // Check de feed van vandaag tegen de feed van gisteren
                                    // En controlleer of de prijs van de feed van gisteren niet veranderd is
                                    var uniekeCode = mainItem.unieke_code;
                                    var prijs = mainItem.prijs;
                                    var warehouse = mainItem.warehouse;
                                    var checkPriceSql = "SELECT COUNT(*) As priceItems FROM feed_update_data WHERE branch_id='" + brancheItem.branch_id + "' AND creation_date='" + yesterday.format('YYYY-MM-DD')+" 00:00:00'";
                                    checkPriceSql +=" AND prijs = '"+prijs+"' AND unieke_code = '"+uniekeCode+"' ";


                                    connection.query(checkPriceSql, function(errItemCheck, itemRows, itemFields) {
                                        if(errItemCheck) throw  errItemCheck;
                                        if(itemRows[0].priceItems  == 0   ) {
                                             //als de prijs veranderd is
                                             //doe dan de update
                                            console.log('Branche '+ brancheItem.branch_name + ' heeft een prijs update: ' +uniekeCode + ' is veranderd, de nieuwe prijs is: ' + prijs);
                                            log.info('Branche '+ brancheItem.branch_name + ' heeft een prijs update: ' +uniekeCode + ' is veranderd, de nieuwe prijs is: ' + prijs);
                                            // Doe PUT request naar beslist
                                            BeslistPriceApi.setApiKey(brancheItem.beslist_api_key);
                                            BeslistPriceApi.updatePriceApi(brancheItem.shop_id,uniekeCode,prijs,function(res) {
                                                if(typeof res ==='undefined') {
                                                    log.emergency(' FOUT. De API  van beslist geeft geen response terug.');
                                                } else {
                                                    if(res.status == 'error') {
                                                        log.emergency(res.message);
                                                    }
                                                    if(res.status == 'success') {
                                                        // Update de prijs van gisteren
                                                        // naar de prijs dat  van vandaag
                                                        connection.query("UPDATE feed_update_data SET updated='1' , prijs='"+prijs+"' WHERE unieke_code='"+uniekeCode+"' AND branch_id='" + brancheItem.branch_id + "'   ", function (updateErr, updateRes) {
                                                            if (updateErr) throw updateErr;
                                                            console.log('updated ' + updateRes.affectedRows + ' rows');
                                                        })
                                                        log.info('SUCCESS!! ' + uniekeCode+ ' is updated to the api and has been fetched to beslist.' + ' The new price is '+ prijs);
                                                    }
                                                }


                                            });
                                        }
                                    });

                                })
                            });
                        }

                    });
                });
                callback();
                // delete here the data from 2 days ago
            }, function (callback) {
                log.info('remove the feed from 2 days ago.. from every branch: so the day to remove is ' + twoDaysAgo.format('YYYY-MM-DD'));
                log.info('The query is ' + "DELETE FROM feed_update_data  WHERE  creation_date='" + twoDaysAgo.format('YYYY-MM-DD')+" 00:00:00' ");
                connection.query("DELETE FROM feed_update_data  WHERE creation_date='" + twoDaysAgo.format('YYYY-MM-DD')+" 00:00:00'", function (err, result) {

                    if (err) throw err;
                    if(err != null) {
                        log.emergency(err);
                    }

                    log.info('deleted ' + result.affectedRows + ' rows');
                })
                callback();
            },



            // controleer of de data van vandaag is toegevoegd,
            // zo niet voeg deze dan toe
            function (callback) {
                branches.forEach(function(brancheItem) {
                    var checkItemSql = "SELECT COUNT(*) As itemsFound FROM feed_update_data WHERE branch_id='"+brancheItem.branch_id+"' AND creation_date=DATE('"+moment().format('YYYY-MM-DD')+"')";
                    connection.query(checkItemSql, function(err, rows, fields) {
                        if(err) throw  err;
                        if(err != null) {
                            log.emergency(err);
                        }

                        // check if the brancheIds exists with the current date
                        if(rows[0].itemsFound == 0 ){
                            parseFeed(connection,brancheItem.branch_feed,brancheItem.branch_id,'feed_update_data');
                             log.info('adding data ' + moment().format('YYYY-MM-DD') + ' for the branch ' + brancheItem.branch_name);
                        }
                    });

                });
                callback();
            }

        ], function(err,res) {
        });




    }








};


module.exports = function () {
    var instance = new Import();
    return instance;
};