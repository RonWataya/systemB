require('dotenv').config();
const HOST = 'hive.cnm0ouk4axh4.us-east-1.rds.amazonaws.com';
const USER = 'admin';
const PASSWORD = 'hive2022';
const DB = 'moneyhive';
const PORTAWS = '3308';

module.exports = {
    HOST: HOST,
    USER: USER,
    PASSWORD: PASSWORD,
    DB: DB,
    PORTAWS: PORTAWS
};

/*


const HOST = 'srv582.hstgr.io';
const USER = 'u790430628_moneyhive';
const PASSWORD = 'Hive@2023';
const DB = 'u790430628_moneyhive';
const PORTAWS = '3307';

module.exports = {
    HOST: HOST,
    USER: USER,
    PASSWORD: PASSWORD,
    DB: DB
        //  PORTAWS: PORTAWS
};
*/