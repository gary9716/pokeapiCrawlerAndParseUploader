module.exports = function() {
    var request = require('request');
    var Q = require('q');
    var utils = require('./utils')();
    var fs = require('fs');

    var retrieveJSONFromUrl = function(url, delayTime) {
        var deferred = Q.defer();

        var doReq = function() {
            request(url, function(err,res,body) {    
                if(err) {
                    deferred.reject(new Error(err));
                }
                else if(res.statusCode !== 200){
                    deferred.reject(new Error("status code was " + res.statusCode));
                }
                else {
                    deferred.resolve(JSON.parse(body));
                }
            });
        }

        if(delayTime) {
            setTimeout(doReq, delayTime);
        }   
        else {
            doReq();
        }     

        return deferred.promise.then(null, function(error) {
            console.log(error);
        });
    };

    var retrieveJSONBasedOnConfig = function(reqConfig) {
        if(reqConfig.useSaved) {
            try {
                fs.accessSync(reqConfig.filePath);
                return utils.readJSON(reqConfig.filePath);
            }
            catch(err) {

            }
        }

        var promise = retrieveJSONFromUrl(reqConfig.url, reqConfig.delayReqTime);

        if(reqConfig.toSave) {
            return promise.then(function(jsonObj) {
                utils.writeJSON(jsonObj, reqConfig.filePath);
                return jsonObj;
            });
        }
        else {
            return promise;
        }
    };

    var getReqConfig = function(useSaved, toSave, filePath, url, delayReqTime) {
        return {
            useSaved: useSaved,
            toSave: toSave,
            filePath: filePath,
            url: url,
            delayReqTime: delayReqTime
        };
    }

    return {
        getReqConfig : getReqConfig,
        retrieveJSONBasedOnConfig : retrieveJSONBasedOnConfig
    };
};