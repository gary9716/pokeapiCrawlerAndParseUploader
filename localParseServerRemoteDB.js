var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var app = express();

var parseConfig = require('./parseConfig.json');
var dbConfig = require('./dbConfig.json');
var api = new ParseServer({
    databaseURI: dbConfig.mongoDBURL, // Connection string for your MongoDB database
    appId: parseConfig.appId,
    masterKey: parseConfig.masterKey, // Keep this key secret!
    serverURL: 'http://localhost:1337/parse' // Don't forget to change to https if needed
});    
app.use('/parse', api);

app.listen(1337, function() {
    console.log('parse-server-example running on port 1337.');
});  


