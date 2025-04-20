export var __asyncValues = (this && this.__asyncValues) || function(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (
      o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](),
      i = {},
      verb("next"),
      verb("throw"),
      verb("return"),
      i[Symbol.asyncIterator] = function() { return this; },
      i
    );
    
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(r, j) {
          v = o[n](v), settle(r, j, v.done, v.value);
        });
      };
    }
    
    function settle(r, j, d, v) {
      Promise.resolve(v).then(function(v) {
        r({ value: v, done: d });
      }, j);
    }
  };