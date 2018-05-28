ruleset com.SMS.observer {
  meta {
    shares __testing, resources, observers,engines
    use module io.picolabs.subscription alias subscription
    use module io.picolabs.wrangler alias wrangler
  }
  global {
    __testing = { "queries": [ { "name": "__testing" },{ "name": "observers" },{ "name": "resources" },{ "name": "engines" } ],
                  "events": [ 
                  { "domain": "discover", "type": "addResource","attrs": [ "name" ] },
                  { "domain": "discover", "type": "removeResource","attrs": [ "name" ] },
                  { "domain": "discover", "type": "addObserver","attrs": [] },
                      { "domain": "discover", "type": "removeObserver","attrs": [] } ] }
  
  initiate_subscription = defaction(eci, wellKnown, optionalHost){
    every{
      event:send({
        "eci": eci, "eid": "subscription",
        "domain": "wrangler", "type": "subscription",
        "attrs": {
                 "wellKnown_Tx": wellKnown, 
                 "Tx_host"     : meta:host,
                 "engine_Id"   : event:attr("id") } 
      }, host = optionalHost.klog("_host"))
    }
  }
  engines = function(){
    discover:engines();
  }
  observers = function(){
    discover:observers();
  }
  resources = function(){
    discover:resources();
  }

  observerDid = function(){
    wrangler:channel("observer")
  }
  observer_Policy = { 
      "name": "observer",
      "event": {
          "allow": [
              {"domain": "wrangler", "type": "subscription"},
              {"domain": "wrangler", "type": "pending_subscription"},
              {"domain": "wrangler", "type": "pending_subscription_approval"},
              {"domain": "wrangler", "type": "subscription_cancellation"},
              {"domain": "discover", "type": "engine_lost"},
              {"domain": "discover", "type": "engine_found"}
          ]
      }
    }
    
  }
  
  rule create_observer_DID{// ruleset constructor
    select when wrangler ruleset_added where rids >< meta:rid
    pre{ channel = observerDid() }
    if(channel.isnull() || channel{"type"} != "discover") then every{
      engine:newPolicy( observer_Policy ) setting(__observer_Policy)
      engine:newChannel(pico_id   = meta:picoId, 
                        name      = "observer", 
                        type      = "discover", 
                        policy_id = __observer_Policy{"id"}) setting(channel)
      discover:addObserver(channel{"id"});
    }
    fired{
      raise wrangler event "observer_created" attributes event:attrs;
      ent:observer_Policy := __observer_Policy;
    }
    else{
      raise wrangler event "observer_not_created" attributes event:attrs; //exists
    }
  }

  rule remove_observer_DID{// ruleset destructor 
    select when wrangler removing_rulesets where rids >< meta:rid
    pre{ channel = observerDid() }
    if(channel && channel{"type"} == "discover") then every{
      // depending on wrangler to remove the channel.
      discover:removeObserver(channel{"id"});
    }
    fired{
      raise wrangler event "observer_deleted" attributes event:attrs;
      raise discover event "engine_lost" attributes event:attrs; // remove all subscriptions
    }
  }

  rule resource_found{
    select when discover resource_found
      initiate_subscription(event:attr("resource"), 
                            subscription:wellKnown_Rx(){"id"}, 
                            event:attr("_host"));
  }
// example of how to use resource_found
  rule engine_found{
    select when discover engine_found where advertisement{"resources"} >< "Temperature" 
      pre{ attrs = {"resource" : event:attr("advertisement"){"resources"}{"Temperature"},
                   "_host"    : event:attr("advertisement"){"_host"}
               } 
      }
      always{
        raise discover event "resource_found" attributes attrs;
      }
  }

  rule new_resource {
    select when wrangler subscription_added
    if event:attr("engine_Id") then noop();
    fired {
      ent:engine_ids_2_subs_ids := ent:engine_ids_2_subs_ids.defaultsTo({}) 
                .put(event:attr("engine_Id"),
                    ent:engine_ids_2_subs_ids{event:attr("engine_Id")}.defaultsTo([])
                    .append(event:attr("Id"))
                );
      discover:addObserver(meta:eci);  
    }
  }
  
  rule engine_lost{
    select when discover engine_lost
    foreach ent:engine_ids_2_subs_ids{event:attr("id")} setting(id)
    always{
      raise wrangler event "subscription_cancellation" attributes event:attrs.put("Id",id);
      ent:engine_ids_2_subs_ids := ent:engine_ids_2_subs_ids.delete([event:attr("id")]) on final;
    }
  }

  rule addResource {
    select when discover addResource
      discover:addResource(event:attr("name"),subscription:wellKnown_Rx(){"id"});
  }

  rule removeResource {
    select when discover removeResource
      discover:removeResource(event:attr("name"),subscription:wellKnown_Rx(){"id"});
  }

  rule addObserver {
    select when discover addObserver
      discover:addObserver(observerDid(){"id"});
  }
  
  rule removeObserver {
    select when discover removeObserver
      discover:removeObserver(observerDid(){"id"});
  }

  //Accept the incoming subscription requests from other sensors.
  rule auto_accept {
    select when wrangler inbound_pending_subscription_added
    fired {
      raise wrangler event "pending_subscription_approval"
        attributes event:attrs
    }
  }
}