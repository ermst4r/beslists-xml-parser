var request = require("request");
var builder = require('xmlbuilder');

var Generatexml = function () {



    Number.prototype.formatMoney = function(c, d, t){
        var n = this,
            c = isNaN(c = Math.abs(c)) ? 2 : c,
            d = d == undefined ? "." : d,
            t = t == undefined ? "," : t,
            s = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    };

    this.productXmlOutput = function (connection) {
        var sql    = "SELECT * FROM orders As o LEFT JOIN payment As p ON o.order_number = p.fk_order_number LEFT JOIN customers As c ON o.order_number = c.fk_order_number";
        connection.query(sql, function(err, rows, fields) {
            if (err) {
                console.log(err);
            } else {
                rows.forEach(function(item) {
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
                    xml.ele('initial_payment_amount'); // navragen luke
                    if(item.payment_method=='Creditcard') {
                        xml.ele('initial_payment_method',5);
                    }  else if (item.payment_method=='iDEAL') {
                        xml.ele('initial_payment_method',4);
                    }
                    xml.ele('branch'); //navragen luke, kan de branche id niet uit beslist halen
                    var orderRows =  xml.ele('order_rows');
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
                            orderRow.ele('warehouse'); // conditie toevoegen
                            orderRow.ele('commission_code'); // Navragen Luke
                            orderRow.ele('price',productItem.price.formatMoney(2, ',', '.'));
                            orderRow.ele('discount','0,0000');
                            orderRow.ele('quantity',productItem.number_orderd);
                            counter++;
                        });
                        console.log(xml.end({ pretty: true}));
                    });

                });

            }


        });
    }





};


module.exports = function () {
    var instance = new Generatexml();
    return instance;
};