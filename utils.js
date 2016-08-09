module.exports = function() {
    var fs = require('fs');
    var Q = require('q');
    
    return {
        writeJSON : function(jsonObj, filePath) {
            var deferred = Q.defer();
            if(jsonObj) {
                var jsonStr = JSON.stringify(jsonObj);
                fs.writeFile(filePath, jsonStr, function(err) {
                    if(err) {
                        deferred.reject(new Error(err));
                    }
                    else {
                        deferred.resolve(null);
                    }
                });
            }
            else {
                deferred.reject(new Error('json obj didnt exist'));
            }

            return deferred.promise.then(null, function(err) {
                console.log(err);
            });
        },

        readJSONSync : function(filePath) {
            var jsonStr = null;
            try {
                jsonStr = fs.readFileSync(filePath, 'utf8');
            }
            catch (err) {
                return null;
            }

            //if no err
            return JSON.parse(jsonStr);
    
        },

        readJSON : function(filePath) {
            var deferred = Q.defer();
            fs.readFile(filePath, 'utf8', function(err, data) {
                if(err) {
                    deferred.reject(new Error(err));
                }
                else {
                    deferred.resolve(JSON.parse(data));
                }
            });

            return deferred.promise.then(null, function(err) {
                console.log(err);
            });
        },

        createDir : function(filePath) {
            var deferred = Q.defer();
            fs.mkdir(filePath, function(err) {
                if(err && err.code !== 'EEXIST') { //only ignore dir existed error
                    deferred.reject(new Error(err));
                }
                else {
                    deferred.resolve(null);
                }
            });

            return deferred.promise.then(null, function(err) {
                console.log(err);
            });
        }

    };
    
};