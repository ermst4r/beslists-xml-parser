var method = Apirequests.prototype;
var request = require('request');
var apikey;
var hostName = 'https://test-shopitem.api.beslist.nl/';
var fs = require('fs')
    , Log = require('log')
    , log = new Log('debug', fs.createWriteStream('output.log',{'flags':'a'}));

function Apirequests() {

}
method.getApiKey = function(){
    return apikey;
};

method.setApiKey = function(val){
    apikey = val;
};


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
            //if(error != null) {
            //    log.emergency(error);
            //} else {}
            console.log(body);
            callback(body);
        }
    );
};

module.exports = Apirequests;