var config = {};

// Mysql
config.mysql_username = 'root';
config.mysql_password = 'root';
config.mysql_database = 'poortvliet';
config.mysql_hostname =  'localhost';

// De url waar order mee worden ingeschoten
config.beslist_order_url = 'https://www.beslist.nl/xml/shoppingcart/shop_orders/?checksum=2daa1c5c1c7638f0c9707a7bb85f1b90&client_id=18132&shop_id=532600&date_from=2015-01-01&date_to=2015-11-15&output_type=test&test_orders=1';

// De url waarmee we orders naar beslist toe versturen
config.beslist_price_api_url = 'https://test-shopitem.api.beslist.nl/';

// De url waarmee we orders naar Colijn schieten (Klanten)
config.colijn_webclient = '01';
config.colijn_customer_url = 'http://82.176.119.240:8899/webservice/!web_services.upsert_web_customer';
config.colijn_order_url = 'http://82.176.119.240:8899/webservice/!web_services.add_web_order';
//



module.exports = config;