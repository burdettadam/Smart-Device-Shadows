var _ = require("lodash");
var test = require("tape");
var tokenizer = require("../src/tokenizer");

test("tokenizer", function(t){

  var tst = function(src, expected){
    var tokens = tokenizer(src);
    _.each(tokens, function(tok){
      //assert the loc is right
      t.equals(src.substring(tok.loc.start, tok.loc.end), tok.src);
    })
    t.deepEquals(_.map(tokens, function(tok){
      return "[" + tok.type + "]" + tok.src;
    }), expected);
  };

  tst("\"\"", [
      "[STRING]\"\""
  ]);
  tst("\"str\"", [
      "[STRING]\"str\""
  ]);
  tst("hello \"world\"\"two\"", [
      "[SYMBOL]hello",
      "[WHITESPACE] ",
      "[STRING]\"world\"",
      "[STRING]\"two\""
  ]);
  tst("hello//some comment \"not a string\" ok\nok", [
      "[SYMBOL]hello",
      "[LINE-COMMENT]//some comment \"not a string\" ok\n",
      "[SYMBOL]ok"
  ]);

  tst("hello/* /* wat? * // some comment\n \"not a string\" ok*/ok", [
      "[SYMBOL]hello",
      "[BLOCK-COMMENT]/* /* wat? * // some comment\n \"not a string\" ok*/",
      "[SYMBOL]ok"
  ]);
  tst("1; //some comment\n2/*annother comment*/;3", [
      "[NUMBER]1",
      "[RAW];",
      "[WHITESPACE] ",
      "[LINE-COMMENT]//some comment\n",
      "[NUMBER]2",
      "[BLOCK-COMMENT]/*annother comment*/",
      "[RAW];",
      "[NUMBER]3"
  ]);

  tst("<<some chevron\n\"?\"//string\nok?>>", [
      "[CHEVRON]<<some chevron\n\"?\"//string\nok?>>",
  ]);

  tst("<<This #{x{\"flip\"}} that >\\> >>", [
      "[CHEVRON]<<This #{x{\"flip\"}} that >\\> >>",
  ]);

  tst("<<This #{x{\"flip\"}} that >\\>>>", [
      "[CHEVRON]<<This #{x{\"flip\"}} that >\\>>>",
  ]);

  tst("<<This /* wat */\n//ok\n>>", [
      "[CHEVRON]<<This /* wat */\n//ok\n>>",
  ]);

  //NOTE a chevron in a beesting is not allowed.

  tst("123", [
      "[NUMBER]123",
  ]);
  tst(".1", [
      "[NUMBER].1",
  ]);
  tst("10.25", [
      "[NUMBER]10.25",
  ]);
  tst("10.25.25", [
      "[NUMBER]10.25",
      "[NUMBER].25",
  ]);
  tst("0.0", [
      "[NUMBER]0.0",
  ]);


  tst("re#regex#", [
      "[REGEXP]re#regex#",
  ]);
  tst("re#regex#iok", [
      "[REGEXP]re#regex#i",
      "[SYMBOL]ok",
  ]);
  tst("re#regex#gok", [
      "[REGEXP]re#regex#g",
      "[SYMBOL]ok",
  ]);
  tst("re#regex#igok", [
      "[REGEXP]re#regex#ig",
      "[SYMBOL]ok",
  ]);
  tst("re#regex#giok", [
      "[REGEXP]re#regex#gi",
      "[SYMBOL]ok",
  ]);
  tst("re#\\##", [
      "[REGEXP]re#\\##"
  ]);
  tst("re#\\#\\\\#", [
      "[REGEXP]re#\\#\\\\#"
  ]);


  //testing escapes i.e. \\" is not \"
  tst('"some\\\\"end', [
      "[STRING]\"some\\\\\"",
      "[SYMBOL]end",
  ]);
  tst('"some\\"string"', [
      "[STRING]\"some\\\"string\"",
  ]);
  tst('"some\\n"', [
      "[STRING]\"some\\n\"",
  ]);

  tst("ruleset rs{rule r1{}}", [
      "[SYMBOL]ruleset",
      "[WHITESPACE] ",
      "[SYMBOL]rs",
      "[RAW]{",
      "[SYMBOL]rule",
      "[WHITESPACE] ",
      "[SYMBOL]r1",
      "[RAW]{",
      "[RAW]}",
      "[RAW]}",
  ]);

  t.end();
});