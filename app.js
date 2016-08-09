var config = require('./config')();
var dataCrawler = require('./JSONCrawler')();
var utils = require('./utils')();
var fs = require('fs');
var Q = require('q');

parseConfig = require('./parseConfig.json');
console.log(parseConfig.appId);

var Parse = require('parse/node');
//without setting ACL, you can access DB with only AppId and Server addr provided
Parse.initialize(parseConfig.appId);
Parse.serverURL = parseConfig.serverAddr;

var fetchDataInSeq = function(concurrency, ids, getFilePath, getUrl, dataHandler) {
    
    var subArrayCap = ids.length;
    if(concurrency > 1) {
        subArrayCap = Math.floor(ids.length / concurrency);
    }

    var allPromises = [];
    for(var i = 0;i < concurrency;i++) {
        var end = (i+1) * subArrayCap;
        if(end > ids.length) {
            end = ids.length;
        }
        var subIds = ids.slice(i * subArrayCap, end);
        allPromises.push(subIds.reduce(function(chainingPromise, id) { 
            var reqConfig = dataCrawler.getReqConfig(true,true,getFilePath(id),getUrl(id),0);
            return chainingPromise.then(() => {
                return dataCrawler
                .retrieveJSONBasedOnConfig(reqConfig)
                .then(dataHandler);
            });
                
        }, Q()));
    }

    return Q.allSettled(allPromises);

}

utils.createDir(config.dataDirPath) //create dir in order
.then(utils.createDir(config.pokemonDataDirPath))
.then(utils.createDir(config.pokemonMoveDirPath))
.then(function() { //crawling process start
    var reqConfig = dataCrawler.getReqConfig(true, true, config.pokemonIndicesFilePath, config.pokedexResUrl, null);
    dataCrawler
    .retrieveJSONBasedOnConfig(reqConfig)
    .then(function(pokedexJsonObj) {
        var regexForPokemonRes = /^api\/v1\/pokemon\/([0-9]+)\/$/;
        var pokemonResourceIds = pokedexJsonObj.pokemon.map(function(pokemonObj) {
            return pokemonObj.resource_uri.match(regexForPokemonRes)[1];
        });

        var regexForMoveRes = /^\/api\/v1\/move\/([0-9]+)\/$/;
        var moveIdSet = new Set();

        fetchDataInSeq(3, pokemonResourceIds, 
            config.getPokemonDataFilePathUsingId, 
            config.getPokemonUrlUsingId,
            function(dataObj) {
                // console.log(dataObj.pkdx_id);
                dataObj.moves.forEach((moveObj) => {
                    moveIdSet.add(moveObj.resource_uri.match(regexForMoveRes)[1]);
                });
            }
        )
        .then(() => {
            return fetchDataInSeq(3, Array.from(moveIdSet), 
                config.getPokemonMoveFilePathUsingId, 
                config.getMoveUrlUsingId, 
                null);
        })
        .then(() => {
            console.log("finished fetching pokemon and move data from pokeapi.co");
        })
        .then(() => {

        })
        .done();


    })
    .done();
})
.done();
