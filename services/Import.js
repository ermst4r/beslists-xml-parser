var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");
var BeslistApi = require("../services/BeslistApi");
var moment = require('moment');
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('logs/priceupdate.log',{'flags':'a'}));


var Import = function () {



    var parseFeed = function (connection,feedUrl,branch_id,table,update,callback) {
        var counter = 0;
        request.get(feedUrl, function (error, response, body) {
            var today = moment();
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

                        if(update == false) {
                            connection.query('INSERT INTO '+table+' SET ?', productData, function(err, result) {
                                if(err) throw err;

                            });



                        } else {

                            var sql = 'UPDATE '+ table+ ' SET prijs = '+ connection.escape(result.producten.product[i].Prijs[0]) + ' WHERE branch_id ='+branch_id+'  AND creation_date=\''+today.format('YYYY-MM-DD')+' 00:00:00\' AND unieke_code = '+connection.escape(productData.unieke_code);
                            connection.query(sql, function(err, result) {
                                if(err) throw err;


                            });
                        }

                    }

                });

            } else {
                console.log("HTTP error " + error);
            }
        }).on('error', function(err) {
            console.log(err)
        });
    }

    var checkIfEntryFromYesterdayExists = function(connection,mainItem,yesterday,callback) {
        var sql = "SELECT COUNT(*) As priceItems FROM feed_update_data WHERE branch_id='" + mainItem.branch_id + "' AND creation_date='" + yesterday.format('YYYY-MM-DD')+" 00:00:00'";
        sql +="  AND unieke_code = '"+mainItem.unieke_code+"'  ";
        connection.query(sql, function(err, rows, fields) {
            if(err) throw err;
            if(rows[0].priceItems == 0 ) {

                var yesterdayData  =
                {
                    unieke_code:mainItem.unieke_code,
                    branch_id:mainItem.branch_id,
                    prijs:mainItem.prijs,
                    warehouse:mainItem.warehouse,
                    creation_date:yesterday.format('YYYY-MM-DD')+' 00:00:00'
                };
                connection.query('INSERT INTO feed_update_data SET ?', yesterdayData, function(iErr, iRes) {
                    if(err) throw err;

                });
                callback(false);
            } else {
                callback(true);
            }
        })
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
                    parseFeed(connection,item.branch_feed,item.branch_id,'feed_data',false,function(res) {
                        console.log(res);
                    });
                });
            }
        });
    }


    this.parseFeedUpdateShopPrice = function(connection) {

        var branches = new Array();
        var yesterday = moment().subtract(1, 'days');
        var twoDaysAgo =  moment().subtract(2, 'days');
        var today = moment();
        var BeslistPriceApi = new BeslistApi();
        async.series([
            /*
             Krijg data van de branches
             En plaats deze in een loop
             */
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


            /*
                 Doe de niet leverbaar check
             */
            function (callback) {
                var teller = 0;
                log.notice("Checked of producten niet meer bestaan in de feed...")
                branches.forEach(function(brancheItem) {
                    var itemYesterday = "SELECT * FROM feed_update_data WHERE branch_id='" + brancheItem.branch_id + "' AND creation_date='" + yesterday.format('YYYY-MM-DD') + " 00:00:00'";

                    connection.query(itemYesterday, function (yesterdayErr, yesterdayRows, fields) {
                        if (yesterdayErr) throw yesterdayErr;
                            yesterdayRows.forEach(function(yesterdayRow) {
                                var itemToday = "SELECT COUNT(*) As itemFound FROM feed_update_data WHERE unieke_code='" + yesterdayRow.unieke_code + "' AND branch_id='" + brancheItem.branch_id + "'  AND creation_date='" + today.format('YYYY-MM-DD') + " 00:00:00'";
                                connection.query(itemToday,function(todayErr,todayRow,todayFields) {
                                    if(todayErr) throw todayErr;
                                    if(todayRow[0].itemFound == 0 ) {
                                        log.notice(yesterdayRow.unieke_code + "bestaat niet meer in de feed");
                                        BeslistPriceApi.setApiKey(brancheItem.beslist_api_key);
                                        BeslistPriceApi.deliverytimeApi(brancheItem.shop_id,yesterdayRow.unieke_code,'niet leverbaar',function(res) {
                                            if(res.status=='success') {
                                                log.info('Beslist niet levertijd Call successvol!' + 'Unieke_code : ' + yesterdayRow.unieke_code + ' Niet leverbaar');
                                            }
                                            if(res.status == 'error') {
                                                log.emergency("Error van beslist API. LEVERBAAR API  : Parameters verzonden: : " +
                                                    " Unieke Code: " + yesterdayRow.unieke_code +
                                                    " shop ID: " + brancheItem.shop_id,
                                                    ' call van Api ' + res.message);
                                            }
                                        });
                                    }
                                } );

                            });

                        if(teller == 1) {
                            callback();
                        }
                        teller++;
                    })
                });

            } ,



            /*
             Doe de matching
             en check of de data overeenkomt
             en schiet de data naar beslist.nl
             */
            function (callback) {
                log.info('vergelijk de feed met de db van gisteren');
                branches.forEach(function(brancheItem) {
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
                                    checkPriceSql +=" AND prijs = '"+prijs+"' AND unieke_code = '"+uniekeCode+"'  ";
                                    connection.query(checkPriceSql, function(errItemCheck, itemRows, itemFields) {
                                        if(errItemCheck) throw  errItemCheck;
                                        if(itemRows[0].priceItems  == 0   ) {
                                            //als de prijs veranderd is
                                            //doe dan de update

                                            // Doe PUT request naar beslist
                                            BeslistPriceApi.setApiKey(brancheItem.beslist_api_key);
                                            // Data zit in een callback
                                            // Doe de foutafhandeling
                                            BeslistPriceApi.updatePriceApi(brancheItem.shop_id,uniekeCode,parseFloat(prijs.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,').replace(",",".")),function(res) {
                                                if(typeof res ==='undefined') {
                                                    log.emergency(' FOUT. De API  van beslist geeft geen response terug.');
                                                } else {
                                                    if(res.status == 'error') {
                                                        log.emergency("Error van beslist API PRIJSUPDATE API : Parameters verzonden: : " +
                                                            " Unieke Code: " + uniekeCode +
                                                            " prijs: " + parseFloat(prijs.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,').replace(",",".")),
                                                            " shop ID: " + brancheItem.shop_id,
                                                            ' call van Api ' + res.message);
                                                    }
                                                    if(res.status == 'success') {
                                                        // Deze callback zorgt ervoor dat er data van gisteren wordt toegevoegd als deze niet bestaat
                                                        // Anders zal er altijd een call naar beslist gedaan worden terwijl dit niet nodig is
                                                        checkIfEntryFromYesterdayExists(connection,mainItem,yesterday,function(entryResult) {
                                                            console.log('Branche '+ brancheItem.branch_name + ' heeft een prijs update: ' +uniekeCode + ' is veranderd, de nieuwe prijs is: ' + prijs);
                                                            log.info('Branche '+ brancheItem.branch_name + ' heeft een prijs update: ' +uniekeCode + ' is veranderd, de nieuwe prijs is: ' + prijs);
                                                            // Update de prijs van gisteren
                                                            // naar de prijs dat  van vandaag
                                                            connection.query("UPDATE feed_update_data SET updated='1' , prijs='"+prijs+"' WHERE unieke_code='"+uniekeCode+"' AND branch_id='" + brancheItem.branch_id + "'   ", function (updateErr, updateRes) {
                                                                if (updateErr) throw updateErr;
                                                                log.info('SUCCESS!! ' + uniekeCode+ ' is updated to the api and has been fetched to beslist.' + ' The new price is '+ prijs);
                                                            })
                                                        });

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
                        log.emergency("Error in delete" + err);
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
                            log.emergency("Error in check data from today" + err);
                        }
                        // check if the brancheIds exists with the current date
                        if(rows[0].itemsFound == 0 ){
                            parseFeed(connection,brancheItem.branch_feed,brancheItem.branch_id,'feed_update_data',false);
                            log.info('adding data ' + moment().format('YYYY-MM-DD') + ' for the branch ' + brancheItem.branch_name);
                        }
                    });

                });
                callback();
            },

            /*
             Update de feed of er nieuwe prijzen zijn
             */
            function (callback) {
                branches.forEach(function(brancheItem) {
                   parseFeed(connection,brancheItem.branch_feed,brancheItem.branch_id,'feed_update_data',true);
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