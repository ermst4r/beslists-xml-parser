var request = require("request");
var parseString = require('xml2js').parseString;
var async = require("async");
var moment = require('moment');

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

        async.series([
            // verkrijg de data van de branches
            function(callback) {
                console.log('krijg de data van de branches');
                var sql = "SELECT * FROM branches";
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



            // check de feed versus de database met de datum van gisteren
            function (callback) {
                console.log('vergelijk de feed met de db van gisteren');
                branches.forEach(function(brancheItem) {
                    // controlleer of de feed van gisteren bestaat
                    var checkItemSql = "SELECT COUNT(*) As itemsFound FROM feed_update_data WHERE branch_id='" + brancheItem.branch_id + "' AND creation_date=DATE('" + yesterday.format('YYYY-MM-DD') + "')";
                    connection.query(checkItemSql, function(err, rows, fields) {
                        if(err) throw  err;
                        // check of de feed van gisteren bestaat
                        // dmv hoeveel items zijn gevonden
                        if(rows[0].itemsFound > 0) {

                            // pak nu de xml feed en match deze tegen de feed van gisteren
                            request.get(brancheItem.branch_feed, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    parseString(body, function (err, result) {
                                        if(err) throw  err;
                                        // kijk nu of de data van de xml in de feed bestaat
                                        // als deze waarde niet bestaat doe dan een prijs update
                                        for(var i = 0; i <result.producten.product.length; i ++ ) {
                                            var checkPriceSql = "SELECT COUNT(*) As priceItems FROM feed_update_data WHERE branch_id='" + brancheItem.branch_id + "' AND creation_date=DATE('" + yesterday.format('YYYY-MM-DD') + "') ";
                                            checkPriceSql +=" AND prijs = '"+result.producten.product[i].Prijs[0]+"' AND unieke_code = '"+result.producten.product[i].Unieke_code[0]+"'";
                                            var uniekeCode = result.producten.product[i].Unieke_code[0];
                                            var prijs = result.producten.product[i].Prijs[0];
                                            connection.query(checkPriceSql, function(errItemCheck, itemRows, itemFields) {
                                               if(itemRows[0].priceItems ==0 ) {
                                                   // als de prijs veranderd is
                                                   // doe dan de update
                                                   console.log('Branche '+ brancheItem.branch_name + ' heeft een prijs update' +uniekeCode + ' is veranderd, de nieuwe prijs is' + prijs);
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

                    });
                });
                callback();

                // delete here the data from 2 days ago
            }, function (callback) {
                console.log('remove the feed from 2 days ago.. from every branch' + twoDaysAgo.format('YYYY-MM-DD'));
                connection.query("DELETE FROM feed_update_data  WHERE creation_date= DATE('" + twoDaysAgo.format('YYYY-MM-DD') + "') ", function (err, result) {
                    if (err) throw err;
                    console.log('deleted ' + result.affectedRows + ' rows');
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
                        // check if the brancheIds exists with the current date
                        if(rows[0].itemsFound == 0 ){
                            parseFeed(connection,brancheItem.branch_feed,brancheItem.branch_id,'feed_update_data');
                             console.log('adding data ' + moment().format('YYYY-MM-DD') + ' for the branch ' + brancheItem.branch_name);
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