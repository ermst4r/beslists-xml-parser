var request = require("request");
var builder = require('xmlbuilder');
var async = require('async');
var Generatexml = function () {








    this.productXmlOutput = function (connection) {

        async.series([

            function(callback){
                var sql    = "SELECT * FROM orders As o LEFT JOIN payment As p ON o.order_number = p.fk_order_number LEFT JOIN customers As c ON o.order_number = c.fk_order_number";
                connection.query(sql, function(err, rows, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        callback(null,rows);

                    }
                });
            }, function (callback) {
                var sqlCheckCodeExists    = "SELECT *   FROM feed_data ";
                connection.query(sqlCheckCodeExists, function(codeErr, codeRows, codeFields) {
                    if (codeErr) throw codeErr;
                    callback(null,codeRows);
                });
            }






        ], function(error, results) {

            //console.log(results);

            results[0].forEach(function(item) {
                var xml = builder.create('root');
                var totalShopAmount = parseFloat(item.price) + parseFloat(item.shipping);
                totalShopAmount = Math.round(totalShopAmount * 100) / 100;

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


                var orderRows =  xml.ele('order_rows')
                /* create the products */

                var productSql    = "SELECT * FROM products WHERE fk_order_number = "+ connection.escape(item.order_number);
                connection.query(productSql, function(productErr, productRows, productFields) {
                    var counter = 1;

                    productRows.forEach(function(productItem) {
                        var wareHouseId = '';
                        var commission_code = '';
                        var zelfMontage = '';
                        var orderRow = orderRows.ele('order_row');
                        orderRow.ele('rownr',counter);
                        orderRow.ele('row_type','R'); // conditie toevoegen
                        orderRow.ele('article_nr',productItem.bvb_code);
                        orderRow.ele('description',productItem.product_name);
                        orderRow.ele('vat_code',2);
                        orderRow.ele('price',productItem.price.toFixed(4).replace('.',','));
                        orderRow.ele('discount','0,0000');
                        orderRow.ele('quantity',productItem.number_orderd);

                        // callback find ordernumber
                        results[1].forEach(function(items) {
                           if(items.unieke_code == '260105484') {
                               wareHouseId = items.warehouse;
                               commission_code = items.commissiecode;
                               zelfMontage = items.zelfmontage;
                           }
                        });

                        if(zelfMontage == 'Ja') {
                            counter++;
                            var zelfMontageRow = orderRows.ele('order_row');
                            zelfMontageRow.ele('rownr',counter);
                            zelfMontageRow.ele('row_type','T');
                            zelfMontageRow.ele('text_line','Zelfmontage');
                            zelfMontageRow.ele('text_line_article_bound','J');
                        }

                        // increment by 1
                        // shipping row
                        counter++;
                        var shippingRow = orderRows.ele('order_row');
                        shippingRow.ele('rownr',counter);
                        shippingRow.ele('article_nr',4);
                        shippingRow.ele('description','verzendkosten');
                        shippingRow.ele('warehouse',wareHouseId);
                        shippingRow.ele('commission_code',commission_code);
                        shippingRow.ele('price',productItem.shipping.toFixed(4).replace('.',','));

                        // increment again by 1
                        counter++;

                    });

                    console.log(xml.end({ pretty: true}));

                    //console.log(xml.end({ pretty: true}));
                });
                /* create the products */

            });





        });






    }





};


module.exports = function () {
    var instance = new Generatexml();
    return instance;
};