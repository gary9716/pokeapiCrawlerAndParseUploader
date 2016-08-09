module.exports = function (){
    var serverAddr = 'http://pokeapi.co';
    var apiVersion = '/api/v1';
    var pokedexRes = '/pokedex/1/'; //use to retrieve all pokemon indices and their name
    var pokemonRes = '/pokemon';
        
    var dataDir = './pokeData';
    var pokemonDataDirPath = dataDir + '/pokemon';
    var pokemonMoveDirPath = dataDir + '/move';
    
    return {
        pokedexResUrl : serverAddr + apiVersion + pokedexRes,
        dataDirPath : dataDir,
        pokemonDataDirPath : pokemonDataDirPath,
        pokemonMoveDirPath : pokemonMoveDirPath,
        pokemonIndicesFilePath : dataDir + '/pokedex.json',
        getPokemonDataFilePathUsingId : function(id) {
            return pokemonDataDirPath + '/' + id + '.json';
        },
        getPokemonMoveFilePathUsingId : function(id) {
            return pokemonMoveDirPath + '/' + id + '.json';
        },
        getPokemonUrlUsingId : function(id) {
            return serverAddr + apiVersion + pokemonRes + "/" + id;
        },
        getMoveUrlUsingId : function(id) {
            return serverAddr + apiVersion + '/move/' + id;
        },
        serverAddr: serverAddr
    };
};