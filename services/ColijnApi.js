var method = ColijnApi.prototype;
var request = require('request');
var config = require('../config');
var querystring = require('querystring');
function ColijnApi() {

}




/*
 Add customer to colijn API
 */

method.addCustomer = function(customer_data,checksum,callback) {


    request.post(
        {
            url : config.colijn_customer_url,
            form: {i_webclient:config.colijn_webclient,i_customer_data:customer_data,i_checksum:checksum}
        },
        function (error, response, body) {
            callback(body);
        }
    );
};

/*
 Add customer to colijn API
 */

method.addOrder = function(order_data,checksum,callback) {


    request.post(
        {
            url : config.colijn_order_url,
            form: {i_webclient:config.colijn_webclient,i_order_data:order_data,i_checksum:checksum}
        },
        function (error, response, body) {
            callback(body);
        }
    );
};

module.exports = ColijnApi;