var request = require("request");
var builder = require('xmlbuilder');
var async = require('async');
var Generatexml = function () {







    this.productXmlOutput = function (connection) {

        async.series([
            function(callback){

                callback(null,'erwin');

                var sql    = "SELECT * FROM orders As o LEFT JOIN payment As p ON o.order_number = p.fk_order_number LEFT JOIN customers As c ON o.order_number = c.fk_order_number";
                connection.query(sql, function(err, rows, fields) {
                    if (err) {
                        console.log(err);
                    } else {

                        rows.forEach(function(item) {
                            var totalShopAmount = parseFloat(item.price) + parseFloat(item.shipping);
                            totalShopAmount = Math.round(totalShopAmount * 100) / 100;
                            var xml = builder.create('root');
                            var timestamp = new Date(item.date_created);
                            var plainDate = timestamp.getUTCFullYear() + '-' +
                                ('00' + (timestamp.getUTCMonth()+1)).slice(-2) + '-' +
                                ('00' + timestamp.getUTCDate()).slice(-2);
                            xml.ele('customer_nr',item.customer_id);
                            xml.ele('date',plainDate);
                            xml.ele('delivery_date',plainDate);
                            xml.ele('initial_payment_date',timestamp.toISOString().slice(0, 19).replace('T', ' '));
                            xml.ele('delivery_floor');
                            xml.ele('payment_condition',0063); //
                            xml.ele('currency',0);
                            xml.ele('price_type','I');
                            xml.ele('transaction_discount',0);
                            xml.ele('customer_reference',item.order_number);
                            xml.ele('own_reference','-');
                            xml.ele('delivery_date_final','N');
                            xml.ele('transaction_final','J');
                            xml.ele('initial_payment_amount',totalShopAmount.toFixed(4).replace('.',','));
                            if(item.payment_method=='Creditcard') {
                                xml.ele('initial_payment_method',5);
                            }  else if (item.payment_method=='iDEAL') {
                                xml.ele('initial_payment_method',4);
                            }
                            xml.ele('branch'); //navragen luke, kan de branche id niet uit beslist halen
                            var orderRows =  xml.ele('order_rows')
                            /* create the products */
                            var productSql    = "SELECT * FROM products WHERE fk_order_number = "+ connection.escape(item.order_number);
                            connection.query(productSql, function(productErr, productRows, productFields) {
                                var counter = 1;
                                productRows.forEach(function(productItem) {
                                    var orderRow = orderRows.ele('order_row');
                                    orderRow.ele('rownr',counter);
                                    orderRow.ele('row_type','R'); // conditie toevoegen
                                    orderRow.ele('article_nr',productItem.bvb_code);
                                    orderRow.ele('description',productItem.product_name);
                                    orderRow.ele('vat_code',2);
                                    orderRow.ele('price',productItem.price.toFixed(4).replace('.',','));
                                    orderRow.ele('discount','0,0000');
                                    orderRow.ele('quantity',productItem.number_orderd);


                                    // check if zelf montage is ja in the feed
                                    //var sqlCheckCodeExists    = "SELECT *   FROM feed_data WHERE unieke_code = "+ connection.escape('1984071279') + " ";
                                    //connection.query(sqlCheckCodeExists, function(codeErr, codeRows, codeFields) {
                                    //    if (codeErr) throw codeErr;
                                    //    // if entry is found in feed do conditions
                                    //
                                    //    if(codeRows.length > 0 ) {
                                    //        orderRow.ele('warehouse',codeRows[0].warehouse); // conditie toevoegen
                                    //        orderRow.ele('commission_code',codeRows[0].commissiecode); // Navragen Luke
                                    //
                                    //
                                    //    }
                                    //});


                                    // increment by 1
                                    // shipping row
                                    //counter++;
                                    //var shippingRow = orderRows.ele('order_row');
                                    //shippingRow.ele('rownr',counter);
                                    //shippingRow.ele('article_nr',4);
                                    //shippingRow.ele('description','verzendkosten');
                                    //shippingRow.ele('warehouse',5);
                                    //shippingRow.ele('commission_code',1);
                                    //shippingRow.ele('price',productItem.shipping.toFixed(4).replace('.',','));

                                    // increment again by 1
                                    counter++;

                                });

                                //console.log(xml.end({ pretty: true}));

                            });
                        });

                    }
                });






            },
            function(error,results) {
                console.log(results);
            }


        ]);






    }





};


module.exports = function () {
    var instance = new Generatexml();
    return instance;
};