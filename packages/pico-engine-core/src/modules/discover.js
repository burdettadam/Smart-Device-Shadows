var request = require('request');
var mkKRLfn = require("../mkKRLfn");
var Discover = require("node-discover");
var mkKRLaction = require("../mkKRLaction");

var d = Discover({
  //helloInterval: 1000, // How often to broadcast a hello packet in milliseconds
  //checkInterval: 2000, // How often to to check for missing nodes in milliseconds
  //nodeTimeout: 2000, // Consider a node dead if not seen in this many milliseconds
  //masterTimeout: 2000, // Consider a master node dead if not seen in this many milliseconds
  //mastersRequired: 1, // The count of master processes that should always be available
  //weight: Math.random(), // A number used to determine the preference for a specific process to become master. Higher numbers win.
 
  //address: '0.0.0.0', // Address to bind to
  port: 8182, // Port on which to bind and communicate with other node-discovery processes
  //broadcast: '255.255.255.255', // Broadcast address if using broadcast
  //multicast: null, // Multicast address if using multicast (don't use multicast, use broadcast)
  //mulitcastTTL: 1, // Multicast TTL for when using multicast
 
  //algorithm: 'aes256', // Encryption algorithm for packet broadcasting (must have key to enable)
  //key: null, // Encryption key if your broadcast packets should be encrypted (null means no encryption)
 
  //ignore: 'self', // Which packets to ignore: 'self' means ignore packets from this instance, 'process' means ignore packets from this process
  //ignoreDataErrors: true // whether to ignore data errors including parse errors
});

// used example from https://stackoverflow.com/questions/6158933/how-to-make-an-http-post-request-in-node-js
// An object of options to indicate where to post to

var resources = {},dids = [];

d.advertise({
  name: "PicoEngine",
  resources: resources
});

d.on('added', function(obj) {
  console.log('A new node has been added.');
  for (var i = 0; i < dids.length; i++) { 
    request.post(
    "http://localhost:8080/sky/event/"+dids[i]+"/12345/discovery/engine_found",
    { json: obj },
    function (error, response, body) { });
  }

});
 
d.on('removed', function(obj) {
  console.log('A node has been removed.');
  for (var i = 0; i < dids.length; i++) { 
    request.post(
    "http://localhost:8080/sky/event/"+dids[i]+"/12345/discovery/engine_lost",
    { json: obj  },
    function (error, response, body) { });
  }
});


module.exports = function(core){
    return {
      def: {

        resources: mkKRLfn([
            ], function(ctx, args, callback){
                core.db.listResources(callback);
            }),
        observers: mkKRLfn([
            ], function(ctx, args, callback){
                core.db.listObservers(callback);
            }),
        addResource: mkKRLaction([
                "key","value"
            ], function(ctx, args, callback){
                core.db.addResource(args.key,args.value,callback);
            }),
        removeResource: mkKRLaction([
                "key","value"
            ], function(ctx, args, callback){

                core.db.removeResource(args.key, args.value, callback);
            }),
        addObserver: mkKRLaction([
                "did"
            ], function(ctx, args, callback){
                core.db.addObserver(args.did,callback);
            }),
        removeObserver: mkKRLaction([
                "did"
            ], function(ctx, args, callback){
                core.db.removeObserver(args.did,callback);
            }),
      }
    }
  };

