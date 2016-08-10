var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var app = express();

var parseConfig = require('./parseConfig.json');
var mongodb = require('mongodb-runner');
var fs = require('fs');
var dbPort = 27018;
var DBDir = './MongoDB/';
fs.mkdir(DBDir, function(err) {
    if(err && err.code !== 'EEXIST') { //only ignore dir existed error
        return console.error('cannot create mongo db dir');
    }
    else {
        mongodb(
            {
                port: dbPort, 
                dbpath: DBDir + process.env.JOB_ID + '_standalone'
            }, 
            function(err) {
                if(err) return console.error('Error QAQ:', err);
                console.log('Standalone ready on localhost:' + dbPort);
                var api = new ParseServer({
                    databaseURI: 'mongodb://localhost:' + dbPort + '/test', // Connection string for your MongoDB database
                    appId: parseConfig.appId,
                    masterKey: parseConfig.masterKey, // Keep this key secret!
                    serverURL: 'http://localhost:1337/parse' // Don't forget to change to https if needed
                });    
                app.use('/parse', api);

                app.listen(1337, function() {
                    console.log('parse-server-example running on port 1337.');
                });    
            }
        );
        
        
    }
});


