var _ = require("lodash");
var os = require("os");
var tcpp = require("tcp-ping");
var mkKRLfn = require("../mkKRLfn");
var Discover = require("node-discover");
var mkKRLaction = require("../mkKRLaction");

var hostname = os.hostname();
// find ip taken from https://gist.github.com/szalishchuk/9054346
var address, // Local ip address that we're trying to calculate
    ifaces = os.networkInterfaces(); // Network interfaces
function getIp(ifaces) {
    for (var dev in ifaces) { // Iterate over interfaces ...
        var iface = ifaces[dev].filter(function(details) { // ... and find the one that matches the criteria
            return details.family === "IPv4" && details.internal === false;
        });
        if (iface.length > 0) address = iface[0].address;
    }
    return address;
}


var config = {
    helloInterval: 500, // How often to broadcast a hello packet in milliseconds
    checkInterval: 2000, // How often to to check for missing nodes in milliseconds
    nodeTimeout: 3000, // Consider a node dead if not seen in this many milliseconds
    masterTimeout: 6000, // Consider a master node dead if not seen in this many milliseconds
    mastersRequired: 1, // The count of master processes that should always be available
    //weight: Math.random(), // A number used to determine the preference for a specific process to become master. Higher numbers win.

    //address: '0.0.0.0', // Address to bind to
    port: 8183, // Port on which to bind and communicate with other node-discovery processes
    //broadcast: '255.255.255.255', // Broadcast address if using broadcast
    //multicast: null, // Multicast address if using multicast (don't use multicast, use broadcast)
    //mulitcastTTL: 1, // Multicast TTL for when using multicast

    //algorithm: 'aes256', // Encryption algorithm for packet broadcasting (must have key to enable)
    //key: null, // Encryption key if your broadcast packets should be encrypted (null means no encryption)
    ignoreProcess: false,
    ignoreInstance: false,
};

var event = {
    eid: "12345",
    domain: "discover",
};

module.exports = function(core) {

    var d, getNodes = function() { return [];}, getSelf = function(){return {};};

    function startD(config, d) {

        d = Discover(config);
        var port = core.port || "8080";
        core.db.listResources(function(err, resources) {
            d.advertise({
                name: "PicoEngine",
                resources: resources,
                //Rx_host: "http://" + getSelf["address"] + ":" + port //core.host
            });
        });

        d.on("added", function(obj) {
            obj.discoverId = obj.id;
            core.db.listObservers(function(err, observers) {
                for (var i = 0; i < observers.length; i++) {
                    event.eci = observers[i];
                    event.type = "engine_found";
                    event.attrs = obj;
                    core.signalEvent(event, function(err, response) { /*if(err) return errResp(res, err); */ });
                }
            });
        });

        d.on("removed", function(obj) {
            //console.log("A node has been removed.");
            core.db.listObservers(function(err, observers) {
                for (var i = 0; i < observers.length; i++) {
                    event.eci = observers[i];
                    event.type = "engine_lost";
                    event.attrs = obj;
                    core.signalEvent(event, function(err, response) { /*if(err) return errResp(res, err); */ });
                }
            });
        });

        getNodes = function() {
            var nodes = [];
            d.eachNode(function(node) {
                nodes.push(node);
            });
            return nodes;
        };

        getSelf = function(){
            var nodes = getNodes();
            var index = _.findIndex(nodes, function(node) { return node["hostName"] == hostname });
            return nodes[index];
        };
    }


    setTimeout(startD, 7000, config, d); // start discover service after engine starts


    return {
        def: {
            alive: mkKRLfn([
                "ip","port"
            ], function(ctx, args, callback) {
              tcpp.probe(args.ip, args.port, function(err, available) { callback(null, available); });
            }),
            ip: mkKRLfn([], function(ctx, args, callback) {
                //callback(null, getSelf()["address"]);
                callback(null, getIp(ifaces));
            }),
            engines: mkKRLfn([], function(ctx, args, callback) {
                //console.log("self",getSelf());
                callback(null, getNodes());
            }),
            resources: mkKRLfn([], function(ctx, args, callback) {
                core.db.listResources(callback);
            }),
            observers: mkKRLfn([], function(ctx, args, callback) {
                core.db.listObservers(callback);
            }),
            addResource: mkKRLaction([
                "key", "value"
            ], function(ctx, args, callback) {
                core.db.addResource(args.key, args.value, callback);
            }),
            removeResource: mkKRLaction([
                "key", "value"
            ], function(ctx, args, callback) {
                core.db.removeResource(args.key, args.value, callback);
            }),
            addObserver: mkKRLaction([
                "did"
            ], function(ctx, args, callback) {
                core.db.addObserver(args.did, callback);
            }),
            removeObserver: mkKRLaction([
                "did"
            ], function(ctx, args, callback) {
                core.db.removeObserver(args.did, callback);
            }),
        }
    };
};