var request = require("request");
var builder = require('xmlbuilder');
var async = require('async');
var ColijnApi = require("../services/ColijnApi");
var parseXmlString = require('xml2js').parseString;
var config = require('../config');
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('logs/colijnApi.log',{'flags':'a'}));



var Generatexml = function () {
    var token ='423' // default value, because key is coli, and when we convert this to ascci together its 423
    var webClient=config.colijn_webclient; // change the webclient to any value you wish
    var convertDec = function(input) {

        var output = ''
        var input = input.toString();
        for (var i=0; i < input.length; i++) {
            output += input[i].charCodeAt(0);
        }
        return output;

    }
    var generateCustomerChecksum = function(checksumString) {

        var finalCheckSum = webClient+checksumString;
        var calculationOfAsciiCodes = 0;
     
        
        
        finalCheckSum.split("").forEach(function(row) {
            calculationOfAsciiCodes = calculationOfAsciiCodes + parseInt(row.charCodeAt(0));
        });
        var finalResult = (calculationOfAsciiCodes % token ) * token;
        return convertDec(finalResult);

    }
    var generateOrderChecksum = function(checksumString,customerNr) {
        var finalCheckSum =  webClient + customerNr + checksumString;
        var calculationOfAsciiCodes = 0;
        finalCheckSum.split("").forEach(function(row) {
            calculationOfAsciiCodes = calculationOfAsciiCodes + parseInt(row.charCodeAt(0));
        });
        var finalResult = (calculationOfAsciiCodes % token ) * token;
        return convertDec(finalResult);

    }

    this.xmlCustomerOutput = function(connection) {
        var sql = "SELECT * FROM orders AS o LEFT JOIN customers AS c ON (c.fk_order_number = o.order_number) WHERE c.response_code IS NULL GROUP BY c.fk_order_number,c.fk_branch_id";
        var ColijnApiService = new ColijnApi();

        connection.query(sql, function(err, rows, fields) {
            if (err) throw err;


			
			
            rows.forEach(function(row) {
  
                var checksumString = '';
                var xml = builder.create('root',{encoding:'UTF-8'});
                var customerName = String(row.customer_shipping_firstname);
                xml.ele('first_name',customerName);
                xml.ele('last_name',row.customer_shipping_last_name);
                xml.ele('initials',customerName.charAt(0)+'.');
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
                invoiceAddres.ele('nr',String(row.customer_invoice_adress_number).replace(/\D/g,''));
                if(row.customer_invoice_adress_number_add !='' ) {
                	invoiceAddres.ele('addition','-'+row.customer_invoice_adress_number_add);
                }
                
        
                invoiceAddres.ele('postal_code',String(row.customer_invoice_zip).toUpperCase().replace(/\s+/g, ''));
                invoiceAddres.ele('city',row.customer_invoice_city);
                if(row.customer_invoice_country =='Nederland') {
                    invoiceAddres.ele('country','NL');
                } else  {
                    invoiceAddres.ele('country','BE');
                }
                // shipping address
                var shippingAddress =  addresses.ele('address')
                shippingAddress.ele('seq_nr',1);
                shippingAddress.ele('type','A');
                shippingAddress.ele('street',row.customer_shipping_adress);
                shippingAddress.ele('nr',String(row.customer_shipping_adress_number).replace(/\D/g,''));
                if(row.customer_shipping_adress_additional !='' ) {
                	shippingAddress.ele('addition','-'+row.customer_shipping_adress_additional);
                }
                
                shippingAddress.ele('postal_code',String(row.customer_shipping_zip).toUpperCase().replace(/\s+/g, ''));
                shippingAddress.ele('city',String(row.customer_shipping_city).toUpperCase());
                if(row.customer_shipping_country =='NL') {
                    shippingAddress.ele('country','NL');
                } else  {
                    shippingAddress.ele('country','BE'); 
                }
            checksumString=row.customer_shipping_firstname + row.customer_shipping_last_name + row.customer_phone + row.customer_email;
      
               ColijnApiService.addCustomer(xml.end({ pretty: false}),generateCustomerChecksum(checksumString),function(xml) {
                    parseXmlString(xml, function (err, result) {
                        if(typeof result.root.customer_nr !== 'undefined') {
                            var apiResponse = parseInt(result.root.customer_nr[0]);
                            if(!isNaN(apiResponse)) {
                                log.info("klant toegevoegd, api response : " + apiResponse);
                                connection.query("UPDATE customers SET response_code='"+apiResponse+"' ,error_message=''  WHERE fk_order_number='"+row.order_number+"' AND fk_branch_id='"+row.fk_branch_id+"'", function (updateErr, updateRes) {
                                    if (updateErr) throw updateErr;
                                })
                            } else {
                                log.emergency("Klant niet toegevoerd, waarde blijkt geen numerieke waarde te zijn. Api response: " + apiResponse);
                            }
                        } else {
                            log.emergency("Error opgetreden met toevoegen van klant. De volgende api response terug gekregen : " + result.root.error_message[0]);
                            connection.query("UPDATE customers SET error_message='"+result.root.error_message[0]+"'  WHERE fk_order_number='"+row.order_number+"'  AND fk_branch_id='"+row.fk_branch_id+"'", function (updateErr, updateRes) {
                                if (updateErr) throw updateErr;
                            })

                        }

                    });
                });


            });

        });

    }
    this.xmlOrderOutput = function (connection) {
        var ColijnApiService = new ColijnApi();
        async.series([
            // first load this
            function(callback){
                var sql    = "SELECT  o.fk_branch_id As fk_branch_id, o.date_created As date_created, o.price As price, c.customer_id As customer_id, c.response_code As customer_response_code, " +
                    "o.shipping As shipping, o.order_number As order_number, p.payment_method As payment_method FROM orders As o " +
                    "LEFT JOIN payment As p ON o.order_number = p.fk_order_number " +
                    "LEFT JOIN customers As c ON o.order_number = c.fk_order_number" +
                    " WHERE o.response_code IS NULL" +
                    " GROUP BY o.order_number,o.fk_branch_id";
                connection.query(sql, function(err, rows, fields) {
                    if (err) return next(err);
                    callback(null,rows);
                });
            },
            // then this
            function (callback) {
                var sqlCheckCodeExists    = "SELECT * FROM feed_data";
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
                var plainShippingPrice = item.shipping;
                plainShippingPrice = Math.round(plainShippingPrice * 100) / 100;
                // callback find ordernumber
                var timestamp = new Date(item.date_created);
                var plainDate = ('00' + timestamp.getUTCDate()).slice(-2) + '-' +
                    ('00' + (timestamp.getUTCMonth()+1)).slice(-2) + '-' +
                    timestamp.getUTCFullYear();
                var getMinutes = timestamp.getHours()+':'+timestamp.getMinutes()+':'+timestamp.getSeconds();
                var bezorgCode = 56;
                var klantId = item.customer_response_code;
                xml.ele('customer_nr',klantId);
                xml.ele('date',plainDate);
                xml.ele('delivery_date',plainDate);
                xml.ele('delivery_time',plainDate + ' '+getMinutes);
                xml.ele('initial_payment_date',plainDate);
                xml.ele('delivery_floor');
                xml.ele('payment_condition','0063');
                xml.ele('currency',0);
                xml.ele('price_type','I');
                xml.ele('transaction_discount',0);
                xml.ele('customer_reference',item.order_number);
                xml.ele('own_reference','-');
                xml.ele('delivery_date_final','N');
                xml.ele('transaction_final','J');
                xml.ele('branch',item.fk_branch_id);
                xml.ele('initial_payment_amount',totalShopAmount.toFixed(4).replace('.',','));
                if(item.payment_method=='Creditcard') {
                    xml.ele('initial_payment_method',5);
                }  else if (item.payment_method=='iDEAL') {
                    xml.ele('initial_payment_method',4);
                }  else if (item.payment_method=='Bancontact/Mister Cash') {
					xml.ele('initial_payment_method',5);
				}


                var orderRows =  xml.ele('order_rows')

                /* create the products */
                var productSql    = "SELECT * FROM products WHERE fk_order_number = "+ connection.escape(item.order_number);
                connection.query(productSql, function(productErr, productRows, productFields) {
                    var counter = 1;
                    var priceChecksum='';
                    var wareHouseId = '';
                   
                    productRows.forEach(function(productItem) {

                        // Get some product specs from the feed against the beslist feed
                         var commission_code = '';
                        var zelfMontage = '';
                        var verzendMethode = '';

                        results[1].forEach(function(items) {
                            wareHouseId = items.warehouse;
                            if(items.unieke_code == productItem.bvb_code) { // veranderd bvb code in productie
                                commission_code = items.commissiecode;
                                zelfMontage = items.zelfmontage;
                                verzendMethode = items.verzendMethode;
                            }
                        });
                        
                        /*
                         * Hardcoded
                         * Als methode bezorgservice is 57
                         * anders 56
                         */
						if(item.verzendmethode=='Bezorgservice') {
							bezorgCode = 57;
							
						}
		

                        var orderRow = orderRows.ele('order_row');
                        orderRow.ele('rownr',counter);
                        orderRow.ele('row_type','R'); // conditie toevoegen
                        orderRow.ele('article_nr',productItem.bvb_code);
                        // de bvb code
                        
                        orderRow.ele('description',productItem.product_name);
                        orderRow.ele('vat_code',2);
                        orderRow.ele('price',productItem.price.toFixed(4).replace('.',','));
                        priceChecksum += productItem.price.toFixed(4).replace('.',',');
                        orderRow.ele('discount','0,0000');
                        orderRow.ele('quantity',productItem.number_orderd);
                        orderRow.ele('warehouse',wareHouseId);
                        if(commission_code ==2 ) {
                    	 	orderRow.ele('commission_code',1);
	                    } else {
	                    	 orderRow.ele('commission_code',commission_code);
	                    }
	                    
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
                    shippingRow.ele('warehouse',wareHouseId);
            	 	shippingRow.ele('commission_code',1);
    
                    shippingRow.ele('quantity','1,000');
                    shippingRow.ele('vat_code',2);
                    shippingRow.ele('price',plainShippingPrice.toFixed(4).replace('.',','));
                    xml.ele('delivery_method',bezorgCode);
                    var checkSum = generateOrderChecksum(plainDate+bezorgCode+ priceChecksum+plainShippingPrice.toFixed(4).replace('.',','),klantId);
       
                    // schiet de order naar colijn
                    console.log(xml.end({ pretty: true}));
                    ColijnApiService.addOrder(xml.end({ pretty: false}),checkSum,function(orderRes){
                        parseXmlString(orderRes, function (err, result) {
                            if(typeof result !== 'undefined') {

                                if (typeof result.root.order_nr !== 'undefined') {
                                    var apiResponse = parseInt(result.root.order_nr[0]);
                                    if (!isNaN(apiResponse)) {
                                        log.info("order toegevoegd, api response : " + apiResponse);
                                     
                                        connection.query("UPDATE orders SET response_code='" + apiResponse + "' ,error_message=''  WHERE order_number='" + item.order_number + "' AND fk_branch_id='"+item.fk_branch_id+"'", function (updateErr, updateRes) {
                                            if (updateErr) throw updateErr;

                                        })
                                    }

                                }
                                    if (typeof result.root.error_message !== 'undefined') {
                                        log.emergency("Error opgetreden met toevoegen van order. De volgende api response terug gekregen : " + result.root.error_message[0]);
                                      //  console.log("UPDATE orders SET error_message='" + result.root.error_message[0] + "'  WHERE order_number='" + item.order_number + "' AND fk_branch_id='"+item.fk_branch_id+"'");
                                        connection.query("UPDATE orders SET error_message='" + result.root.error_message[0] + "'  WHERE order_number='" + item.order_number + "' AND fk_branch_id='"+item.fk_branch_id+"'", function (updateErr, updateRes) {
                                            if (updateErr) throw updateErr;
                                        })
                                }
                            }

                        });

                    });

                });

            });


        });

    }
};
module.exports = function () {
    var instance = new Generatexml();
    return instance;
};