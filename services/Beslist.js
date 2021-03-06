var fs = require('fs');
var async = require("async");
var request = require("request");
var parseString = require('xml2js').parseString;
var config = require('../config');
var file_url = config.beslist_order_url;
var moment = require('moment');
var md5 = require('md5');

var Beslist = function () {



    this.parseOrders = function (connection) {



        var checkItemSql = "SELECT * FROM branches ";
        connection.query(checkItemSql, function(err, rows, fields) {
            if(err) throw err;
            rows.forEach( function(item) {
                var twoDaysAgo =  moment().subtract(2, 'days').format('YYYY-MM-DD');
                var today = moment().format('YYYY-MM-DD');
                var checksum  = String(item.beslist_order_key + item.client_id + item.shop_id + twoDaysAgo + today);
                var file_url = "https://www.beslist.nl/xml/shoppingcart/shop_orders/?checksum="+md5(checksum)+"&client_id="+item.client_id+"&shop_id="+item.shop_id+"&date_from="+twoDaysAgo+"&date_to="+today;
				
                request.get(file_url, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        parseString(body, function (err, result) {
                        	
                        	
                        	if( result.shoppingCart.summary[0].numResults[0] > 0 ) { 
                        		result.shoppingCart.shopOrders[0].shopOrder.forEach(function(res) {
                                    var sql    = "SELECT COUNT(*) AS countOrder FROM orders WHERE order_number = "+ connection.escape(res.orderNumber[0]['_']);
                                    connection.query(sql, function(err, rows, fields) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            if(rows[0].countOrder == 0 ) {
                                                insertOrders(res,connection,item.branch_id);
                                                insertPayments(res,connection,item.branch_id);
                                                insertProducts(res,connection,item.branch_id);
                                                insertClient(res,connection,item.branch_id);
                                            }
                                        }
                                    });
                                });
                    		} else {
                    			console.log('geen nieuwe orders');
                    		}
                            
                                
                                
                                
                            
                        });
                    }
                }).on('error', function(err) {
                    console.log(err)
                });


            });

        });




    }


    var insertPayments = function (res,connection,branch_id) {
        res.payment.forEach(function(payments) {
            var paymentData  =
            {
                payment_method:payments.method[0],
                consumer_name:payments.consumer_name[0],
                status:payments.status[0],
                iban:payments.iban[0],
                bic:payments.bic[0],
                fk_order_number:res.orderNumber[0]['_'],
                fk_branch_id:branch_id

            };
            connection.query('INSERT INTO payment SET ?', paymentData, function(err, result) {
                if(err) throw err;
            });

        });
    }

    var insertOrders= function(res,connection,branch_id) {
        var orderData  =
        {
            order_number:res.orderNumber[0]['_'],
            b2b:res.b2b[0],
            date_created:res.dateCreated[0],
            price:res.price[0],
            shipping:res.shipping[0],
            transaction_costs:res.transactionCosts[0],
            commision:res.commission[0],
            numProducts:res.numProducts[0],
            fk_branch_id:branch_id
        };
        connection.query('INSERT INTO orders SET ?', orderData, function(err, result) {
            if (err) {
                console.log(err);
            }
        });
    }


    var insertProducts= function(res,connection,branch_id) {
        for (var i =0; i< res.products[0].product.length; i ++)  {
            var productData  =
            {
                product_name:res.products[0].product[i].title[0],
                price: res.products[0].product[i].price[0],
                shipping:res.products[0].product[i].shipping[0],
                number_orderd:res.products[0].product[i].numberOrdered[0],
                bvb_code:res.products[0].product[i].bvbCode[0],
                commission_percentage:res.products[0].product[i].commission[0].percentage[0],
                commission_fixed:res.products[0].product[i].commission[0].fixed[0],
                commission_variable:res.products[0].product[i].commission[0].variable[0],
                commission_total:res.products[0].product[i].commission[0].total[0],
                fk_order_number:res.orderNumber[0]['_'],
                fk_branch_id:branch_id
            };

            connection.query('INSERT INTO products SET ?', productData, function(err, result) {
                if (err) {
                    console.log(err);
                }
            });




        }
    }


    var insertClient= function(res,connection,branche_id) {

        var customerData  =
        {
            customer_id:res.customer[0].id[0],
            customer_email:res.customer[0].email[0],
            customer_phone:res.customer[0].phone[0],
            customer_shipping_firstname:res.addresses[0].shipping[0].firstName[0],
            customer_shipping_last_name_insertion:res.addresses[0].shipping[0].lastNameInsertion[0],
            customer_shipping_last_name:res.addresses[0].shipping[0].lastName[0],
            customer_shipping_adress:res.addresses[0].shipping[0].address[0],
            customer_shipping_adress_number:res.addresses[0].shipping[0].addressNumber[0],
            customer_shipping_adress_additional:res.addresses[0].shipping[0].addressNumberAdditional[0],
            customer_shipping_city:res.addresses[0].shipping[0].city[0],
            customer_shipping_zip:res.addresses[0].shipping[0].zip[0],
            customer_shipping_country:res.addresses[0].shipping[0].country[0],
            customer_shipping_sex:res.addresses[0].shipping[0].sex[0],
            customer_invoice_name:res.addresses[0].invoice[0].firstName,
            customer_invoice_last_name_insertion:res.addresses[0].invoice[0].lastNameInsertion,
            customer_invoice_last_name:res.addresses[0].invoice[0].lastName,
            customer_invoice_address:res.addresses[0].invoice[0].address,
            customer_invoice_adress_number:res.addresses[0].invoice[0].addressNumber,
            customer_invoice_adress_number_add:res.addresses[0].invoice[0].addressNumberAdditional,
            customer_invoice_city:res.addresses[0].invoice[0].city,
            customer_invoice_sex:res.addresses[0].invoice[0].sex,
            customer_invoice_zip:res.addresses[0].invoice[0].zip,
            customer_invoice_country:res.addresses[0].invoice[0].country,
            fk_order_number:res.orderNumber[0]['_'],
            fk_branch_id:branche_id
        };
        connection.query('INSERT INTO customers SET ?', customerData, function(err, result) {
            if (err) {
                console.log(err);
            }
        });
    }









};


module.exports = function () {
    var instance = new Beslist();
    return instance;
};