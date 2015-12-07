var request = require("request");
var builder = require('xmlbuilder');
var async = require('async');
var Generatexml = function () {



// error ere
    this.xmlCustomerOutput = function(connection) {
        var sql = "SELECT * FROM orders AS O LEFT JOIN customers AS c ON (c.fk_order_number = o.order_number)";
        connection.query(sql, function(err, rows, fields) {
            if (err) return next(err);

            rows.forEach(function(row) {
                var xml = builder.create('root');
                xml.ele('first_name',row.customer_shipping_firstname);
                xml.ele('last_name',row.customer_shipping_last_name);
                xml.ele('initials');
                xml.ele('prefix',row.customer_shipping_last_name_insertion);
                xml.ele('customer_type','P');
                if(row.customer_shipping_sex == 'm') {
                    xml.ele('title','Dhr.');
                } else {
                    xml.ele('title','Mevr.');
                }
                xml.ele('phone',row.customer_phone);
                xml.ele('email',row.customer_email);
                // invoice addres
                var addresses =  xml.ele('addresses')
                var invoiceAddres =  addresses.ele('address')
                invoiceAddres.ele('seq_nr',0);
                invoiceAddres.ele('type','B');
                invoiceAddres.ele('street',row.customer_invoice_address);
                invoiceAddres.ele('nr',row.customer_invoice_adress_number);
                invoiceAddres.ele('addition',row.customer_invoice_adress_number_add);
                invoiceAddres.ele('postal_code',row.customer_invoice_zip);
                invoiceAddres.ele('city',row.customer_invoice_city);
                if(row.customer_invoice_country =='Nederland') {
                    invoiceAddres.ele('country','NL');
                } else  {
                    invoiceAddres.ele('country','BE');
                }
                // shipping address
                var shippingAddress =  addresses.ele('address')
                shippingAddress.ele('seq_nr',0);
                shippingAddress.ele('type','B');
                shippingAddress.ele('street',row.customer_shipping_adress);
                shippingAddress.ele('nr',row.customer_shipping_adress_number);
                shippingAddress.ele('addition',row.customer_shipping_adress_additional);
                shippingAddress.ele('postal_code',row.customer_shipping_zip);
                shippingAddress.ele('city',row.customer_shipping_city);
                if(row.customer_shipping_country =='Nederland') {
                    shippingAddress.ele('country','NL');
                } else  {
                    shippingAddress.ele('country','BE');
                }

                console.log(xml.end({ pretty: true}));

            });

        });

    }

    this.xmlOrderOutput = function (connection) {
        async.series([
            // first load this
            function(callback){
                var sql    = "SELECT * FROM orders As o LEFT JOIN payment As p ON o.order_number = p.fk_order_number LEFT JOIN customers As c ON o.order_number = c.fk_order_number";
                connection.query(sql, function(err, rows, fields) {
                    if (err) return next(err);
                    callback(null,rows);
                });
            },
            // then this
            function (callback) {
                var sqlCheckCodeExists    = "SELECT *   FROM feed_data";
                connection.query(sqlCheckCodeExists, function(codeErr, codeRows, codeFields) {
                    if (codeErr) throw codeErr;
                    callback(null,codeRows);
                });
            }

        ], function(error, results) {
            results[0].forEach(function(item) {
                var xml = builder.create('root');
                var totalShopAmount = parseFloat(item.price) + parseFloat(item.shipping);
                totalShopAmount = Math.round(totalShopAmount * 100) / 100;
                // callback find ordernumber
                var timestamp = new Date(item.date_created);
                var plainDate = timestamp.getUTCFullYear() + '-' +
                    ('00' + (timestamp.getUTCMonth()+1)).slice(-2) + '-' +
                    ('00' + timestamp.getUTCDate()).slice(-2);
                xml.ele('customer_nr',item.customer_id);
                xml.ele('date',plainDate);
                xml.ele('delivery_date',plainDate);
                xml.ele('delivery_time',plainDate);
                xml.ele('initial_payment_date',timestamp.toISOString().slice(0, 19).replace('T', ' '));
                xml.ele('delivery_method',57); //
                xml.ele('delivery_floor');
                xml.ele('payment_condition',0063);
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
                xml.ele('branch',item.branch_id);

                var orderRows =  xml.ele('order_rows')

                /* create the products */
                var productSql    = "SELECT * FROM products WHERE fk_order_number = "+ connection.escape(item.order_number);
                connection.query(productSql, function(productErr, productRows, productFields) {
                    var counter = 1;
                    productRows.forEach(function(productItem) {

                        // Get some product specs from the feed against the beslist feed
                        var wareHouseId = '';
                        var commission_code = '';
                        var zelfMontage = '';
                        var verzendMethode = '';

                        var codeRand = new Array('0112061051','9002759910792','200301951','78009230');
                        var codeCheck = codeRand[Math.floor(Math.random() * codeRand.length) + 1];
                        results[1].forEach(function(items) {
                            if(items.unieke_code == codeCheck) { // change to  the product bvbcode later on
                                wareHouseId = items.warehouse;
                                commission_code = items.commissiecode;
                                zelfMontage = items.zelfmontage;
                                verzendMethode = items.verzendMethode;
                            }
                        });
                        var orderRow = orderRows.ele('order_row');
                        orderRow.ele('rownr',counter);
                        orderRow.ele('row_type','R'); // conditie toevoegen
                        orderRow.ele('article_nr',productItem.bvb_code);
                        orderRow.ele('description',productItem.product_name);
                        orderRow.ele('vat_code',2);
                        orderRow.ele('price',productItem.price.toFixed(4).replace('.',','));
                        orderRow.ele('discount','0,0000');
                        orderRow.ele('quantity',productItem.number_orderd);
                        orderRow.ele('warehouse',wareHouseId);
                        orderRow.ele('commission_code',commission_code);
                        if(zelfMontage == 'Ja') {
                            counter++;
                            var zelfMontageRow = orderRows.ele('order_row');
                            zelfMontageRow.ele('rownr',counter);
                            zelfMontageRow.ele('row_type','T');
                            zelfMontageRow.ele('text_line','Zelfmontage');
                            zelfMontageRow.ele('text_line_article_bound','J');
                            counter++;
                        }  else {
                            counter++;
                        }
                    });

                    var shippingRow = orderRows.ele('order_row');
                    shippingRow.ele('rownr',counter);
                    shippingRow.ele('article_nr',4);
                    shippingRow.ele('description','verzendkosten');
                    shippingRow.ele('warehouse',5);
                    shippingRow.ele('commission_code',1);
                    shippingRow.ele('price',totalShopAmount.toFixed(4).replace('.',','));
                    console.log(xml.end({ pretty: true}));

                });

            });


        });

    }





};


module.exports = function () {
    var instance = new Generatexml();
    return instance;
};