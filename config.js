var config = {};

// Mysql
config.mysql_username = 'root';
config.mysql_password = '';
config.mysql_database = 'poortvliet';
config.mysql_hostname =  'localhost';

// De url waarmee we orders naar beslist toe versturen
config.beslist_price_api_url = 'https://shopitem.api.beslist.nl/';

// De url waarmee we orders naar Colijn schieten (Klanten)
config.colijn_webclient = '11';
config.colijn_customer_url = 'http://130.62.152.105:8888/webservice/!web_services.upsert_web_customer';
config.colijn_order_url = 'http://130.62.152.105:8888/webservice/!web_services.add_web_order';
//



module.exports = config;