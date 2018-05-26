var request = require('request');
var mkKRLfn = require("../mkKRLfn");
var Discover = require("node-discover");
var mkKRLaction = require("../mkKRLaction");

var config = {
    helloInterval: 3000, // How often to broadcast a hello packet in milliseconds
    checkInterval: 6000, // How often to to check for missing nodes in milliseconds
    nodeTimeout: 6000, // Consider a node dead if not seen in this many milliseconds
    masterTimeout: 6000, // Consider a master node dead if not seen in this many milliseconds
    mastersRequired: 0, // The count of master processes that should always be available
    //weight: Math.random(), // A number used to determine the preference for a specific process to become master. Higher numbers win.

    //address: '0.0.0.0', // Address to bind to
    port: 8183, // Port on which to bind and communicate with other node-discovery processes
    //broadcast: '255.255.255.255', // Broadcast address if using broadcast
    //multicast: null, // Multicast address if using multicast (don't use multicast, use broadcast)
    //mulitcastTTL: 1, // Multicast TTL for when using multicast

    //algorithm: 'aes256', // Encryption algorithm for packet broadcasting (must have key to enable)
    //key: null, // Encryption key if your broadcast packets should be encrypted (null means no encryption)

    ignore: 'self', // Which packets to ignore: 'self' means ignore packets from this instance, 'process' means ignore packets from this process
    ignoreDataErrors: true // whether to ignore data errors including parse errors
    };

var event = {eid   : "12345",
             domain: "discover",
            };

module.exports = function(core){

    var d;
    function startD(config,d){

      d = Discover(config);

      core.db.listResources(function(err,resources){
        d.advertise({
          name: "PicoEngine",
          resources: resources,
          _host : core.host
        });
      });
      

      d.on('added', function(obj) {
        console.log('A new node has been added.');
        obj.discoverId = obj.id;
        core.db.listObservers(function(err,observers){
          for (var i = 0; i < observers.length; i++) {
            event.eci = observers[i];
            event.type = "engine_found";
            event.attrs = obj;
            pe.signalEvent(event, function(err, response){ /*if(err) return errResp(res, err); */});

           // request.post(
           // "http://localhost:8080/sky/event/"+observers[i]+"/12345/discover/engine_found",
           // { json: obj },
           // function (error, response, body) { });
          }
        });
      });

      d.on('removed', function(obj) {
        console.log('A node has been removed.');
        core.db.listObservers(function(err,observers){
          for (var i = 0; i < observers.length; i++) { 
            event.eci = observers[i];
            event.type = "engine_lost";
            event.attrs = obj;
            pe.signalEvent(event, function(err, response){ /*if(err) return errResp(res, err); */});

            //request.post(
            //"http://localhost:8080/sky/event/"+observers[i]+"/12345/discover/engine_lost",
            //{ json: obj  },
            //function (error, response, body) { });
          }
        });
      });
    }

    setTimeout(startD, 7000, config, d);// start discover service after engine starts



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

