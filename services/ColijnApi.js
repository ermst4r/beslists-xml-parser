var method = ColijnApi.prototype;
var request = require('request');
var config = require('../config');
var hostName = config.colijn_customer_url;
function ColijnApi() {

}




/*
 The update price api for beslist nl
 */

method.addCustomer = function(customer_data,checksum,callback) {


    request.post(
        {
            url : hostName,
            form: {i_webclient:config.colijn_webclient,i_customer_data:customer_data,i_checksum:checksum}
        },
        function (error, response, body) {
            callback(body);
        }
    );
};

module.exports = ColijnApi;