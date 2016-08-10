var config = require('./config')();
var dataCrawler = require('./JSONCrawler')();
var utils = require('./utils')();
var fs = require('fs');
var Q = require('q');

var parseConfig = require('./parseConfig.json');

var Parse = require('parse/node');
//without setting ACL, you can access DB with only AppId and Server addr provided
Parse.initialize(parseConfig.appId);
Parse.serverURL = parseConfig.serverAddr;

var DataTypes = {
    pokemon: "pokemon",
    move: "move"
};

var pokemonMustExistKeys = ["name","pkdx_id","sp_atk","sp_def","moves","hp","types"];
var moveMustExistKeys = ["id","name","accuracy","description","power","pp"];

var pokemonFieldTest = (jsonObj, keyToTest) => {
    var testResult = true;
       
    keyToTest.forEach((key) => {
        if(!jsonObj.hasOwnProperty(key)) {
            testResult = false;
        }
    });

    return testResult;
}

var isObjEmpty = (obj) => {
    return Object.keys(obj).length === 0;
};

var MoveParseObj = Parse.Object.extend("Move");
var PokemonParseObj = Parse.Object.extend("Pokemon");
var PokeTypeParseObj = Parse.Object.extend("PokemonType");

var setParseObjWithSameKey = (parseObj, jsonObj, keyArray) => {
    keyArray.forEach((key) => {
        if(jsonObj.hasOwnProperty(key)) {
            parseObj.set(key, jsonObj[key]);
        }
        else {
            console.log("error: no key " + key);
        }
    });
}

var needToUploadTypeArray = true;

var fetchDataInSeq = function(concurrency, ids, getFilePath, getUrl, dataType, dataHandler) {
    
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
            return chainingPromise.then(() => {
                var reqConfig = dataCrawler.getReqConfig(true,true,getFilePath(dataType,id),getUrl(dataType,id),0);
                return dataCrawler
                .retrieveJSONBasedOnConfig(reqConfig)
                .then(dataHandler);
            });
                
        }, Q()));
    }

    return Q.allSettled(allPromises);

}

var doPromisesInSeq = (allPromisesGen) => {
    return allPromisesGen.reduce((prePromise, currentPromiseGen) => {
        return prePromise.then(currentPromiseGen);
    }, Q());
}

utils.createDir(config.dataDirPath) //create dir in order
.then(utils.createDir(config.getDirPath(config.DataTypes.pokemon)))
.then(utils.createDir(config.getDirPath(config.DataTypes.move)))
.then(function() { //crawling process start
    var reqConfig = dataCrawler.getReqConfig(true, true, config.pokemonIndicesFilePath, config.pokedexResUrl, 0);
    dataCrawler
    .retrieveJSONBasedOnConfig(reqConfig)
    .then(function(pokedexJsonObj) {
        var regexForPokemonRes = /^api\/v1\/pokemon\/([0-9]+)\/$/;
        var pokemonIds = pokedexJsonObj.pokemon.map(function(pokemonObj) {
            return pokemonObj.resource_uri.match(regexForPokemonRes)[1];
        });

        var regexForMoveRes = /^\/api\/v1\/move\/([0-9]+)\/$/;
        var moveIdSet = new Set();
        var pokeTypeSet = new Set();
        var pokeTypeDict = {};
        
        var jsonObjs = {};
        var parseObjs = {};
        var parseObjDict = {};
        var objIdDict = {};

        var initDicts = (obj) => {
            for(var key in config.DataTypes) {
                obj.dict[config.DataTypes[key]] = obj.initFunc();
            }
        };

        [{
            dict: jsonObjs,
            initFunc: Array
        },
        {
            dict: parseObjs,
            initFunc: Array
        },
        {
            dict: objIdDict,
            initFunc: Object
        },
        {
            dict: parseObjDict,
            initFunc: Object
        }].forEach(initDicts);

        var startToFetchData = () => {
            console.log("start fetching");
            fetchDataInSeq(3, pokemonIds, 
                config.getFilePathUsingDataTypeAndId, 
                config.getUrlUsingDataTypeAndId,
                config.DataTypes.pokemon,
                function(dataObj) { //pokemon data object
                    // console.log(dataObj.pkdx_id);
                    if(pokemonFieldTest(dataObj, pokemonMustExistKeys)) {
                        dataObj.moves = dataObj.moves.map((moveObj) => {
                            var moveId = String(moveObj.resource_uri.match(regexForMoveRes)[1]);
                            moveIdSet.add(moveId);
                            return moveId;
                        });
                        dataObj.pkdx_id = String(dataObj.pkdx_id);
                        
                        dataObj.types = dataObj.types.map((typeData) => {
                            pokeTypeSet.add(typeData.name);
                            return typeData.name;
                        });
                        jsonObjs[config.DataTypes.pokemon].push(dataObj);
                    }
                }
            )
            .then(() => {
                // console.log(moveIdSet);
                return fetchDataInSeq(3, Array.from(moveIdSet), 
                    config.getFilePathUsingDataTypeAndId, 
                    config.getUrlUsingDataTypeAndId,
                    config.DataTypes.move,
                    (dataObj) => { //move data object
                        if(pokemonFieldTest(dataObj, moveMustExistKeys)) {
                            dataObj.id = String(dataObj.id);
                            if(!parseObjDict[config.DataTypes.move].hasOwnProperty(dataObj.id)) { //didnt contain a obj with the same id
                                var moveParseObj = new MoveParseObj();
                                if(!isObjEmpty(objIdDict[config.DataTypes.move])) {
                                    moveParseObj.id = objIdDict[config.DataTypes.move][dataObj.id];
                                }
                                setParseObjWithSameKey(moveParseObj, dataObj, ["name","accuracy","description","power","pp"]);
                                moveParseObj.set("resId",dataObj.id);
                                
                                parseObjs[config.DataTypes.move].push(moveParseObj);
                                parseObjDict[config.DataTypes.move][dataObj.id] = moveParseObj;
                            }    
                        }
                    })
            })
            .then(() => {
                var uploadDataAndSaveDBId = (parseObjs, dataType) => {
                    var objectIds = {}; //used as the identifer in DB
                    // console.log(parseObjs);
                    var savePromisesGen = parseObjs.map((parseObj) => {
                        return () => {
                            return parseObj.save(null).then(
                                (savedObj) => {
                                    objectIds[savedObj.get("resId")] = savedObj.id;
                                },
                                (obj, error) => {
                                    if(error) {
                                        console.log(error);
                                    }
                                }
                            );
                        };
                    });
                    
                    return doPromisesInSeq(savePromisesGen).then(() => {
                        //save the moveObjectIds
                        return utils.writeJSON(objectIds, config.getObjectIdsFilePath(dataType));
                    });
                };

                var uploadPokemonData = () => {
                    parseObjs[config.DataTypes.pokemon] = jsonObjs[config.DataTypes.pokemon].map((jsonObj) => {
                        var parseObj = new PokemonParseObj();
                        jsonObj.types = jsonObj.types.map((typeName) => {
                            return pokeTypeDict[typeName];
                        });
                        
                        jsonObj.moves = jsonObj.moves.map((moveId) => {
                            return objIdDict[config.DataTypes.move][moveId];
                        });

                        setParseObjWithSameKey(parseObj, jsonObj, ["name","sp_atk","sp_def","hp","types","moves"]); 
                        parseObj.set("resId", jsonObj["pkdx_id"]);
                        if(!isObjEmpty(objIdDict[config.DataTypes.pokemon])) {
                            parseObj.id = objIdDict[config.DataTypes.pokemon][jsonObj["pkdx_id"]];
                        }
                        return parseObj;
                    });
                    
                    uploadDataAndSaveDBId(parseObjs[config.DataTypes.pokemon], config.DataTypes.pokemon);
                };

                if(needToUploadTypeArray) {
                    var typeParseObj = new PokeTypeParseObj();
                    typeParseObj.save({
                        all: Array.from(pokeTypeSet)
                    })
                    .then(
                        (savedObj) => {
                            var typeArray = savedObj.get("all");
                            for(var i = 0;i < typeArray.length;i++) {
                                pokeTypeDict[typeArray[i]] = i;
                            }
                            uploadDataAndSaveDBId(parseObjs[config.DataTypes.move], config.DataTypes.move).then(uploadPokemonData);
                            
                        },
                        (obj, error) => {
                            if(error) {
                                console.log(error);
                                process.exit();
                            }
                        }
                    );
                    
                }
                else {
                    uploadDataAndSaveDBId(parseObjs[config.DataTypes.move], config.DataTypes.move).then(uploadPokemonData);
                }
            })
            .done();
            
        };


        (new Parse.Query(PokeTypeParseObj))
        .first()
        .then(
            (typeObj) => {
                if(!typeObj) {
                    needToUploadTypeArray = true;
                }
                else {
                    needToUploadTypeArray = false;
                    var typeArray = typeObj.get("all");
                    for(var i = 0;i < typeArray.length;i++) {
                        pokeTypeDict[typeArray[i]] = i;
                    }
                }
            },
            (typeObj, error) => {
                if(error)
                    console.log(error);
            }
        )
        // .then(() => {
        //     var promises = [];
        //     for(var type in objIdDict) {
        //         promises.push(
        //             () => {
        //                 return utils.readJSON(config.getObjectIdsFilePath(type))
        //                         .then(
        //                             (idObjs) => {
        //                                 objIdDict[type] = idObjs;
        //                             },
        //                             null
        //                         );
        //             }
        //         );
        //     }
        //     return doPromisesInSeq(promises);
        // })
        .then(() => {
            return utils.readJSON(config.getObjectIdsFilePath(config.DataTypes.move))
                    .then(
                        (idObjs) => {
                            objIdDict[config.DataTypes.move] = idObjs;
                        },
                        null
                    );
        })
        .then(() => {
            return utils.readJSON(config.getObjectIdsFilePath(config.DataTypes.pokemon))
                    .then(
                        (idObjs) => {
                            objIdDict[config.DataTypes.pokemon] = idObjs;
                        },
                        null
                    );
        })
        .then(startToFetchData)
        .done();


    })
    .done();
})
.done();
