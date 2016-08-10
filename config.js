module.exports = function (){
    var serverAddr = 'http://pokeapi.co';
    var apiVersion = '/api/v1';
    var pokedexRes = '/pokedex/1/'; //use to retrieve all pokemon indices and their name
    var pokemonRes = '/pokemon';
        
    var dataDir = './pokeData';
    var pokemonDataDirPath = dataDir + '/pokemon';
    var pokemonMoveDirPath = dataDir + '/move';
    var DataTypes = {
        pokemon: "pokemon",
        move: "move"
    };
    
    return {
        DataTypes: DataTypes,
        pokedexResUrl : serverAddr + apiVersion + pokedexRes,
        dataDirPath : dataDir,
        getDirPath : (dataType) => {
            return dataDir + '/' + dataType;
        },
        pokemonIndicesFilePath : dataDir + '/pokedex.json',
        
        getFilePathUsingDataTypeAndId : function(dataType, id) {
            return dataDir + '/' + dataType + '/' + id + '.json';
        },

        getUrlUsingDataTypeAndId : function(dataType, id) {
            return serverAddr + apiVersion + '/' + dataType + '/' + id;
        },

        getObjectIdsFilePath : function(dataType) {
            return dataDir + '/' + dataType + '/objectIds'; 
        },
        serverAddr: serverAddr
    };
};