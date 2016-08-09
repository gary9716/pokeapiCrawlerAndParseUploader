//create a file call parseConfig.json and 
//put the App ID with property name called "appId" and server address with the name called "serverAddr"
parseConfig = require('./parseConfig.json');
console.log(parseConfig.appId);

var Parse = require('parse/node');
Parse.initialize(parseConfig.appId);
Parse.serverURL = parseConfig.serverAddr;

//Test
var TestObject = Parse.Object.extend("TestObject");
var testObject = new TestObject();
testObject.save({foo: "bar"}, {
  success: function(uploadedData) {
    // Execute any logic that should take place after the object is saved.
    alert('New object created with objectId: ' + uploadedData.id);
  },
  error: function(uploadedData, error) {
    // Execute any logic that should take place if the save fails.
    // error is a Parse.Error with an error code and message.
    alert('Failed to create new object, with error code: ' + error.message);
  }
});