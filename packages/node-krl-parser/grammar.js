// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) {return x[0]; }


var echo = function(data, location, reject){
  return {data: data, location: location};
};

var getN = function(n){
  return function(data){
    return data[n];
  };
};

var grammar = {
    ParserRules: [
    {"name": "main", "symbols": ["_", "ruleset", "_"], "postprocess": getN(1)},
    {"name": "ruleset$string$1", "symbols": [{"literal":"r"}, {"literal":"u"}, {"literal":"l"}, {"literal":"e"}, {"literal":"s"}, {"literal":"e"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "ruleset$string$2", "symbols": [{"literal":"{"}, {"literal":"}"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "ruleset", "symbols": ["ruleset$string$1", "__", "symbol", "_", "ruleset$string$2"], "postprocess": 
        function(data, loc){
          return {
            type: 'ruleset',
            loc: loc,
        
            name: data[2].src,
            value: []
          };
        }
        },
    {"name": "symbol$ebnf$1", "symbols": [/[\w]/]},
    {"name": "symbol$ebnf$1", "symbols": [/[\w]/, "symbol$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "symbol", "symbols": ["symbol$ebnf$1"], "postprocess": 
        function(data, loc){
          return {
            type: 'symbol',
            loc: loc,
            src: data[0].join('')
          };
        }
        },
    {"name": "int$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "int$ebnf$1", "symbols": [/[0-9]/, "int$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "int", "symbols": ["int$ebnf$1"], "postprocess": 
        function(data, loc){
          return {
            type: 'int',
            loc: loc,
            src: data[0].join('')
          };
        }
        },
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": [/[\s]/, "_$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(){return null;}},
    {"name": "__$ebnf$1", "symbols": [/[\s]/]},
    {"name": "__$ebnf$1", "symbols": [/[\s]/, "__$ebnf$1"], "postprocess": function arrconcat(d) {return [d[0]].concat(d[1]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(){return null;}}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
