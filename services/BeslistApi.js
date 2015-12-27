var method = BeslistApi.prototype;
var request = require('request');
var config = require('../config');
var apikey;
var hostName = config.beslist_price_api_url;

function BeslistApi() {

}


method.getApiKey = function(){
    return apikey;
};

method.setApiKey = function(val){
    apikey = val;
};




/*
    The delivery time api for beslist.nl
 */

method.deliverytimeApi = function(shopId,productId,deliveryTime,callback) {

    if (typeof method.getApiKey() === 'undefined') {
        throw {name : "Apikey error", message : "A apikey is required!"};
    }
    request(
        {
            url : hostName+"product/v2/shops/"+shopId+"/items/"+productId+"/delivery_time_nl",
            method: 'PUT',
            json: {delivery_time:deliveryTime},
            headers : {
                "apikey" :method.getApiKey()
            }
        },
        function (error, response, body) {
            callback(body);
        }
    );

};

/*
 The update price api for beslist nl
 */

method.updatePriceApi = function(shopId,productId,price,callback) {

    if (typeof method.getApiKey() === 'undefined') {
        throw {name : "Apikey error", message : "A apikey is required!"};
    }
    request(
        {
            url : hostName+"product/v2/shops/"+shopId+"/items/"+productId+"/price",
            method: 'PUT',
            json: {price:price},
            headers : {
                "apikey" :method.getApiKey()
            }
        },
        function (error, response, body) {
            console.log(body);
            callback(body);
        }
    );
};

module.exports = BeslistApi;