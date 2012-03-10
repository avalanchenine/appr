var global = Function("return this;")()
/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.6'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);
// ender:events.node as events
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  if ('undefined' === typeof process) {
    process = {};
  }
  (function () {
    "use strict";
  
    process.EventEmitter = process.EventEmitter || function () {};
  
  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.
  
  var EventEmitter = exports.EventEmitter = process.EventEmitter;
  var isArray = Array.isArray;
  
  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.
  var defaultMaxListeners = 10;
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (!this._events) this._events = {};
    this._events.maxListeners = n;
  };
  
  
  EventEmitter.prototype.emit = function(type) {
    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      if (!this._events || !this._events.error ||
          (isArray(this._events.error) && !this._events.error.length))
      {
        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }
  
    if (!this._events) return false;
    var handler = this._events[type];
    if (!handler) return false;
  
    if (typeof handler == 'function') {
      switch (arguments.length) {
        // fast cases
        case 1:
          handler.call(this);
          break;
        case 2:
          handler.call(this, arguments[1]);
          break;
        case 3:
          handler.call(this, arguments[1], arguments[2]);
          break;
        // slower
        default:
          var args = Array.prototype.slice.call(arguments, 1);
          handler.apply(this, args);
      }
      return true;
  
    } else if (isArray(handler)) {
      var args = Array.prototype.slice.call(arguments, 1);
  
      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
      return true;
  
    } else {
      return false;
    }
  };
  
  // EventEmitter is defined in src/node_events.cc
  // EventEmitter.prototype.emit() is also defined there.
  EventEmitter.prototype.addListener = function(type, listener) {
    if ('function' !== typeof listener) {
      throw new Error('addListener only takes instances of Function');
    }
  
    if (!this._events) this._events = {};
  
    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);
  
    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    } else if (isArray(this._events[type])) {
  
      // If we've already got an array, just append.
      this._events[type].push(listener);
  
      // Check for listener leak
      if (!this._events[type].warned) {
        var m;
        if (this._events.maxListeners !== undefined) {
          m = this._events.maxListeners;
        } else {
          m = defaultMaxListeners;
        }
  
        if (m && m > 0 && this._events[type].length > m) {
          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    } else {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
  
    return this;
  };
  
  EventEmitter.prototype.on = EventEmitter.prototype.addListener;
  
  EventEmitter.prototype.once = function(type, listener) {
    var self = this;
    function g() {
      self.removeListener(type, g);
      listener.apply(this, arguments);
    };
  
    g.listener = listener;
    self.on(type, g);
  
    return this;
  };
  
  EventEmitter.prototype.removeListener = function(type, listener) {
    if ('function' !== typeof listener) {
      throw new Error('removeListener only takes instances of Function');
    }
  
    // does not use listeners(), so no side effect of creating _events[type]
    if (!this._events || !this._events[type]) return this;
  
    var list = this._events[type];
  
    if (isArray(list)) {
      var position = -1;
      for (var i = 0, length = list.length; i < length; i++) {
        if (list[i] === listener ||
            (list[i].listener && list[i].listener === listener))
        {
          position = i;
          break;
        }
      }
  
      if (position < 0) return this;
      list.splice(position, 1);
      if (list.length == 0)
        delete this._events[type];
    } else if (list === listener ||
               (list.listener && list.listener === listener))
    {
      delete this._events[type];
    }
  
    return this;
  };
  
  EventEmitter.prototype.removeAllListeners = function(type) {
    // does not use listeners(), so no side effect of creating _events[type]
    if (type && this._events && this._events[type]) this._events[type] = null;
    return this;
  };
  
  EventEmitter.prototype.listeners = function(type) {
    if (!this._events) this._events = {};
    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };
  
  }());
  

  provide("events.node", module.exports);
  provide("events", module.exports);
  $.ender(module.exports);
}(global));

// ender:bonzo as bonzo
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * Bonzo: DOM Utility (c) Dustin Diaz 2011
    * https://github.com/ded/bonzo
    * License MIT
    */
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && define.amd) define(name, definition)
    else this[name] = definition()
  }('bonzo', function() {
    var context = this
      , win = window
      , doc = win.document
      , html = doc.documentElement
      , parentNode = 'parentNode'
      , query = null
      , specialAttributes = /^checked|value|selected$/
      , specialTags = /select|fieldset|table|tbody|tfoot|td|tr|colgroup/i
      , table = [ '<table>', '</table>', 1 ]
      , td = [ '<table><tbody><tr>', '</tr></tbody></table>', 3 ]
      , option = [ '<select>', '</select>', 1 ]
      , tagMap = {
          thead: table, tbody: table, tfoot: table, colgroup: table, caption: table
          , tr: [ '<table><tbody>', '</tbody></table>', 2 ]
          , th: td , td: td
          , col: [ '<table><colgroup>', '</colgroup></table>', 2 ]
          , fieldset: [ '<form>', '</form>', 1 ]
          , legend: [ '<form><fieldset>', '</fieldset></form>', 2 ]
          , option: option
          , optgroup: option }
      , stateAttributes = /^checked|selected$/
      , ie = /msie/i.test(navigator.userAgent)
      , hasClass, addClass, removeClass
      , uidMap = {}
      , uuids = 0
      , digit = /^-?[\d\.]+$/
      , dattr = /^data-(.+)$/
      , px = 'px'
      , setAttribute = 'setAttribute'
      , getAttribute = 'getAttribute'
      , byTag = 'getElementsByTagName'
      , features = function() {
          var e = doc.createElement('p')
          e.innerHTML = '<a href="#x">x</a><table style="float:left;"></table>'
          return {
            hrefExtended: e[byTag]('a')[0][getAttribute]('href') != '#x' // IE < 8
          , autoTbody: e[byTag]('tbody').length !== 0 // IE < 8
          , computedStyle: doc.defaultView && doc.defaultView.getComputedStyle
          , cssFloat: e[byTag]('table')[0].style.styleFloat ? 'styleFloat' : 'cssFloat'
          , transform: function () {
              var props = ['webkitTransform', 'MozTransform', 'OTransform', 'msTransform', 'Transform'], i
              for (i = 0; i < props.length; i++) {
                if (props[i] in e.style) return props[i]
              }
            }()
          , classList: 'classList' in e
          }
        }()
      , trimReplace = /(^\s*|\s*$)/g
      , unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 }
      , trim = String.prototype.trim ?
          function (s) {
            return s.trim()
          } :
          function (s) {
            return s.replace(trimReplace, '')
          }
  
    function classReg(c) {
      return new RegExp("(^|\\s+)" + c + "(\\s+|$)")
    }
  
    function each(ar, fn, scope) {
      for (var i = 0, l = ar.length; i < l; i++) fn.call(scope || ar[i], ar[i], i, ar)
      return ar
    }
  
    function deepEach(ar, fn, scope) {
      for (var i = 0, l = ar.length; i < l; i++) {
        if (isNode(ar[i])) {
          deepEach(ar[i].childNodes, fn, scope)
          fn.call(scope || ar[i], ar[i], i, ar)
        }
      }
      return ar
    }
  
    function camelize(s) {
      return s.replace(/-(.)/g, function (m, m1) {
        return m1.toUpperCase()
      })
    }
  
    function decamelize(s) {
      return s ? s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : s
    }
  
    function data(el) {
      el[getAttribute]('data-node-uid') || el[setAttribute]('data-node-uid', ++uuids)
      uid = el[getAttribute]('data-node-uid')
      return uidMap[uid] || (uidMap[uid] = {})
    }
  
    function clearData(el) {
      uid = el[getAttribute]('data-node-uid')
      uid && (delete uidMap[uid])
    }
  
    function dataValue(d) {
      try {
        return d === 'true' ? true : d === 'false' ? false : d === 'null' ? null : !isNaN(d) ? parseFloat(d) : d;
      } catch(e) {}
      return undefined
    }
  
    function isNode(node) {
      return node && node.nodeName && node.nodeType == 1
    }
  
    function some(ar, fn, scope, i) {
      for (i = 0, j = ar.length; i < j; ++i) if (fn.call(scope, ar[i], i, ar)) return true
      return false
    }
  
    function styleProperty(p) {
        (p == 'transform' && (p = features.transform)) ||
          (/^transform-?[Oo]rigin$/.test(p) && (p = features.transform + "Origin")) ||
          (p == 'float' && (p = features.cssFloat))
        return p ? camelize(p) : null
    }
  
    var getStyle = features.computedStyle ?
      function (el, property) {
        var value = null
          , computed = doc.defaultView.getComputedStyle(el, '')
        computed && (value = computed[property])
        return el.style[property] || value
      } :
  
      (ie && html.currentStyle) ?
  
      function (el, property) {
        if (property == 'opacity') {
          var val = 100
          try {
            val = el.filters['DXImageTransform.Microsoft.Alpha'].opacity
          } catch (e1) {
            try {
              val = el.filters('alpha').opacity
            } catch (e2) {}
          }
          return val / 100
        }
        var value = el.currentStyle ? el.currentStyle[property] : null
        return el.style[property] || value
      } :
  
      function (el, property) {
        return el.style[property]
      }
  
    // this insert method is intense
    function insert(target, host, fn) {
      var i = 0, self = host || this, r = []
        // target nodes could be a css selector if it's a string and a selector engine is present
        // otherwise, just use target
        , nodes = query && typeof target == 'string' && target.charAt(0) != '<' ? query(target) : target
      // normalize each node in case it's still a string and we need to create nodes on the fly
      each(normalize(nodes), function (t) {
        each(self, function (el) {
          var n = !el[parentNode] || (el[parentNode] && !el[parentNode][parentNode]) ?
            function () {
              var c = el.cloneNode(true)
              // check for existence of an event cloner
              // preferably https://github.com/fat/bean
              // otherwise Bonzo won't do this for you
              self.$ && self.cloneEvents && self.$(c).cloneEvents(el)
              return c
            }() : el
          fn(t, n)
          r[i] = n
          i++
        })
      }, this)
      each(r, function (e, i) {
        self[i] = e
      })
      self.length = i
      return self
    }
  
    function xy(el, x, y) {
      var $el = bonzo(el)
        , style = $el.css('position')
        , offset = $el.offset()
        , rel = 'relative'
        , isRel = style == rel
        , delta = [parseInt($el.css('left'), 10), parseInt($el.css('top'), 10)]
  
      if (style == 'static') {
        $el.css('position', rel)
        style = rel
      }
  
      isNaN(delta[0]) && (delta[0] = isRel ? 0 : el.offsetLeft)
      isNaN(delta[1]) && (delta[1] = isRel ? 0 : el.offsetTop)
  
      x != null && (el.style.left = x - offset.left + delta[0] + px)
      y != null && (el.style.top = y - offset.top + delta[1] + px)
  
    }
  
    // classList support for class management
    // altho to be fair, the api sucks because it won't accept multiple classes at once,
    // so we have to iterate. bullshit
    if (features.classList) {
      hasClass = function (el, c) {
        return some(c.toString().split(' '), function (c) {
          return el.classList.contains(c)
        })
      }
      addClass = function (el, c) {
        each(c.toString().split(' '), function (c) {
          el.classList.add(c)
        })
      }
      removeClass = function (el, c) { el.classList.remove(c) }
    }
    else {
      hasClass = function (el, c) { return classReg(c).test(el.className) }
      addClass = function (el, c) { el.className = trim(el.className + ' ' + c) }
      removeClass = function (el, c) { el.className = trim(el.className.replace(classReg(c), ' ')) }
    }
  
  
    // this allows method calling for setting values
    // example:
    // bonzo(elements).css('color', function (el) {
    //   return el.getAttribute('data-original-color')
    // })
    function setter(el, v) {
      return typeof v == 'function' ? v(el) : v
    }
  
    function Bonzo(elements) {
      this.length = 0
      if (elements) {
        elements = typeof elements !== 'string' &&
          !elements.nodeType &&
          typeof elements.length !== 'undefined' ?
            elements :
            [elements]
        this.length = elements.length
        for (var i = 0; i < elements.length; i++) {
          this[i] = elements[i]
        }
      }
    }
  
    Bonzo.prototype = {
  
        // indexr method, because jQueriers want this method
        get: function (index) {
          return this[index] || null
        }
  
        // itetators
      , each: function (fn, scope) {
          return each(this, fn, scope)
        }
  
      , deepEach: function (fn, scope) {
          return deepEach(this, fn, scope)
        }
  
      , map: function (fn, reject) {
          var m = [], n, i
          for (i = 0; i < this.length; i++) {
            n = fn.call(this, this[i], i)
            reject ? (reject(n) && m.push(n)) : m.push(n)
          }
          return m
        }
  
      // text and html inserters!
      , html: function (h, text) {
          var method = text ?
            html.textContent === undefined ?
              'innerText' :
              'textContent' :
            'innerHTML', m;
          function append(el) {
            each(normalize(h), function (node) {
              el.appendChild(node)
            })
          }
          return typeof h !== 'undefined' ?
              this.empty().each(function (el) {
                !text && (m = el.tagName.match(specialTags)) ?
                  append(el, m[0]) :
                  !function() {
                    try { (el[method] = h) }
                    catch(e) { append(el) }
                  }();
              }) :
            this[0] ? this[0][method] : ''
        }
  
      , text: function (text) {
          return this.html(text, 1)
        }
  
        // more related insertion methods
      , append: function (node) {
          return this.each(function (el) {
            each(normalize(node), function (i) {
              el.appendChild(i)
            })
          })
        }
  
      , prepend: function (node) {
          return this.each(function (el) {
            var first = el.firstChild
            each(normalize(node), function (i) {
              el.insertBefore(i, first)
            })
          })
        }
  
      , appendTo: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t.appendChild(el)
          })
        }
  
      , prependTo: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t.insertBefore(el, t.firstChild)
          })
        }
  
      , before: function (node) {
          return this.each(function (el) {
            each(bonzo.create(node), function (i) {
              el[parentNode].insertBefore(i, el)
            })
          })
        }
  
      , after: function (node) {
          return this.each(function (el) {
            each(bonzo.create(node), function (i) {
              el[parentNode].insertBefore(i, el.nextSibling)
            })
          })
        }
  
      , insertBefore: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            t[parentNode].insertBefore(el, t)
          })
        }
  
      , insertAfter: function (target, host) {
          return insert.call(this, target, host, function (t, el) {
            var sibling = t.nextSibling
            if (sibling) {
              t[parentNode].insertBefore(el, sibling);
            }
            else {
              t[parentNode].appendChild(el)
            }
          })
        }
  
      , replaceWith: function(html) {
          this.deepEach(clearData)
  
          return this.each(function (el) {
            el.parentNode.replaceChild(bonzo.create(html)[0], el)
          })
        }
  
        // class management
      , addClass: function (c) {
          return this.each(function (el) {
            hasClass(el, setter(el, c)) || addClass(el, setter(el, c))
          })
        }
  
      , removeClass: function (c) {
          return this.each(function (el) {
            hasClass(el, setter(el, c)) && removeClass(el, setter(el, c))
          })
        }
  
      , hasClass: function (c) {
          return some(this, function (el) {
            return hasClass(el, c)
          })
        }
  
      , toggleClass: function (c, condition) {
          return this.each(function (el) {
            typeof condition !== 'undefined' ?
              condition ? addClass(el, c) : removeClass(el, c) :
              hasClass(el, c) ? removeClass(el, c) : addClass(el, c)
          })
        }
  
        // display togglers
      , show: function (type) {
          return this.each(function (el) {
            el.style.display = type || ''
          })
        }
  
      , hide: function () {
          return this.each(function (el) {
            el.style.display = 'none'
          })
        }
  
      , toggle: function (callback, type) {
          this.each(function (el) {
            el.style.display = (el.offsetWidth || el.offsetHeight) ? 'none' : type || ''
          })
          callback && callback()
          return this
        }
  
        // DOM Walkers & getters
      , first: function () {
          return bonzo(this.length ? this[0] : [])
        }
  
      , last: function () {
          return bonzo(this.length ? this[this.length - 1] : [])
        }
  
      , next: function () {
          return this.related('nextSibling')
        }
  
      , previous: function () {
          return this.related('previousSibling')
        }
  
      , parent: function() {
        return this.related('parentNode')
      }
  
      , related: function (method) {
          return this.map(
            function (el) {
              el = el[method]
              while (el && el.nodeType !== 1) {
                el = el[method]
              }
              return el || 0
            },
            function (el) {
              return el
            }
          )
        }
  
        // meh. use with care. the ones in Bean are better
      , focus: function () {
          return this.length > 0 ? this[0].focus() : null
        }
  
      , blur: function () {
          return this.each(function (el) {
            el.blur()
          })
        }
  
        // style getter setter & related methods
      , css: function (o, v, p) {
          // is this a request for just getting a style?
          if (v === undefined && typeof o == 'string') {
            // repurpose 'v'
            v = this[0]
            if (!v) {
              return null
            }
            if (v === doc || v === win) {
              p = (v === doc) ? bonzo.doc() : bonzo.viewport()
              return o == 'width' ? p.width : o == 'height' ? p.height : ''
            }
            return (o = styleProperty(o)) ? getStyle(v, o) : null
          }
          var iter = o
          if (typeof o == 'string') {
            iter = {}
            iter[o] = v
          }
  
          if (ie && iter.opacity) {
            // oh this 'ol gamut
            iter.filter = 'alpha(opacity=' + (iter.opacity * 100) + ')'
            // give it layout
            iter.zoom = o.zoom || 1;
            delete iter.opacity;
          }
  
          function fn(el, p, v) {
            for (var k in iter) {
              if (iter.hasOwnProperty(k)) {
                v = iter[k];
                // change "5" to "5px" - unless you're line-height, which is allowed
                (p = styleProperty(k)) && digit.test(v) && !(p in unitless) && (v += px)
                el.style[p] = setter(el, v)
              }
            }
          }
          return this.each(fn)
        }
  
      , offset: function (x, y) {
          if (typeof x == 'number' || typeof y == 'number') {
            return this.each(function (el) {
              xy(el, x, y)
            })
          }
          if (!this[0]) return {
              top: 0
            , left: 0
            , height: 0
            , width: 0
          }
          var el = this[0]
            , width = el.offsetWidth
            , height = el.offsetHeight
            , top = el.offsetTop
            , left = el.offsetLeft
          while (el = el.offsetParent) {
            top = top + el.offsetTop
            left = left + el.offsetLeft
          }
  
          return {
              top: top
            , left: left
            , height: height
            , width: width
          }
        }
  
      , dim: function () {
          var el = this[0]
            , orig = !el.offsetWidth && !el.offsetHeight ?
               // el isn't visible, can't be measured properly, so fix that
               function (t, s) {
                  s = {
                      position: el.style.position || ''
                    , visibility: el.style.visibility || ''
                    , display: el.style.display || ''
                  }
                  t.first().css({
                      position: 'absolute'
                    , visibility: 'hidden'
                    , display: 'block'
                  })
                  return s
                }(this) : null
            , width = el.offsetWidth
            , height = el.offsetHeight
  
          orig && this.first().css(orig)
          return {
              height: height
            , width: width
          }
        }
  
        // attributes are hard. go shopping
      , attr: function (k, v) {
          var el = this[0]
          if (typeof k != 'string' && !(k instanceof String)) {
            for (var n in k) {
              k.hasOwnProperty(n) && this.attr(n, k[n])
            }
            return this
          }
          return typeof v == 'undefined' ?
            specialAttributes.test(k) ?
              stateAttributes.test(k) && typeof el[k] == 'string' ?
                true : el[k] : (k == 'href' || k =='src') && features.hrefExtended ?
                  el[getAttribute](k, 2) : el[getAttribute](k) :
            this.each(function (el) {
              specialAttributes.test(k) ? (el[k] = setter(el, v)) : el[setAttribute](k, setter(el, v))
            })
        }
  
      , removeAttr: function (k) {
          return this.each(function (el) {
            stateAttributes.test(k) ? (el[k] = false) : el.removeAttribute(k)
          })
        }
  
      , val: function (s) {
          return (typeof s == 'string') ? this.attr('value', s) : this[0].value
        }
  
        // use with care and knowledge. this data() method uses data attributes on the DOM nodes
        // to do this differently costs a lot more code. c'est la vie
      , data: function (k, v) {
          var el = this[0], uid, o, m
          if (typeof v === 'undefined') {
            o = data(el)
            if (typeof k === 'undefined') {
              each(el.attributes, function(a) {
                (m = (''+a.name).match(dattr)) && (o[camelize(m[1])] = dataValue(a.value))
              })
              return o
            } else {
              return typeof o[k] === 'undefined' ?
                (o[k] = dataValue(this.attr('data-' + decamelize(k)))) : o[k]
            }
          } else {
            return this.each(function (el) { data(el)[k] = v })
          }
        }
  
        // DOM detachment & related
      , remove: function () {
          this.deepEach(clearData)
  
          return this.each(function (el) {
            el[parentNode] && el[parentNode].removeChild(el)
          })
        }
  
      , empty: function () {
          return this.each(function (el) {
            deepEach(el.childNodes, clearData)
  
            while (el.firstChild) {
              el.removeChild(el.firstChild)
            }
          })
        }
  
      , detach: function () {
          return this.map(function (el) {
            return el[parentNode].removeChild(el)
          })
        }
  
        // who uses a mouse anyway? oh right.
      , scrollTop: function (y) {
          return scroll.call(this, null, y, 'y')
        }
  
      , scrollLeft: function (x) {
          return scroll.call(this, x, null, 'x')
        }
  
    }
  
    function normalize(node) {
      return typeof node == 'string' ? bonzo.create(node) : isNode(node) ? [node] : node // assume [nodes]
    }
  
    function scroll(x, y, type) {
      var el = this[0]
      if (x == null && y == null) {
        return (isBody(el) ? getWindowScroll() : { x: el.scrollLeft, y: el.scrollTop })[type]
      }
      if (isBody(el)) {
        win.scrollTo(x, y)
      } else {
        x != null && (el.scrollLeft = x)
        y != null && (el.scrollTop = y)
      }
      return this
    }
  
    function isBody(element) {
      return element === win || (/^(?:body|html)$/i).test(element.tagName)
    }
  
    function getWindowScroll() {
      return { x: win.pageXOffset || html.scrollLeft, y: win.pageYOffset || html.scrollTop }
    }
  
    function bonzo(els, host) {
      return new Bonzo(els, host)
    }
  
    bonzo.setQueryEngine = function (q) {
      query = q;
      delete bonzo.setQueryEngine
    }
  
    bonzo.aug = function (o, target) {
      // for those standalone bonzo users. this love is for you.
      for (var k in o) {
        o.hasOwnProperty(k) && ((target || Bonzo.prototype)[k] = o[k])
      }
    }
  
    bonzo.create = function (node) {
      // hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
      return typeof node == 'string' && node !== '' ?
        function () {
          var tag = /^\s*<([^\s>]+)/.exec(node)
            , el = doc.createElement('div')
            , els = []
            , p = tag ? tagMap[tag[1].toLowerCase()] : null
            , dep = p ? p[2] + 1 : 1
            , pn = parentNode
            , tb = features.autoTbody && p && p[0] == '<table>' && !(/<tbody/i).test(node)
  
          el.innerHTML = p ? (p[0] + node + p[1]) : node
          while (dep--) el = el.firstChild
          do {
            // tbody special case for IE<8, creates tbody on any empty table
            // we don't want it if we're just after a <thead>, <caption>, etc.
            if ((!tag || el.nodeType == 1) && (!tb || el.tagName.toLowerCase() != 'tbody')) {
              els.push(el)
            }
          } while (el = el.nextSibling)
          // IE < 9 gives us a parentNode which messes up insert() check for cloning
          // `dep` > 1 can also cause problems with the insert() check (must do this last)
          each(els, function(el) { el[pn] && el[pn].removeChild(el) })
          return els
  
        }() : isNode(node) ? [node.cloneNode(true)] : []
    }
  
    bonzo.doc = function () {
      var vp = bonzo.viewport()
      return {
          width: Math.max(doc.body.scrollWidth, html.scrollWidth, vp.width)
        , height: Math.max(doc.body.scrollHeight, html.scrollHeight, vp.height)
      }
    }
  
    bonzo.firstChild = function (el) {
      for (var c = el.childNodes, i = 0, j = (c && c.length) || 0, e; i < j; i++) {
        if (c[i].nodeType === 1) e = c[j = i]
      }
      return e
    }
  
    bonzo.viewport = function () {
      return {
          width: ie ? html.clientWidth : self.innerWidth
        , height: ie ? html.clientHeight : self.innerHeight
      }
    }
  
    bonzo.isAncestor = 'compareDocumentPosition' in html ?
      function (container, element) {
        return (container.compareDocumentPosition(element) & 16) == 16
      } : 'contains' in html ?
      function (container, element) {
        return container !== element && container.contains(element);
      } :
      function (container, element) {
        while (element = element[parentNode]) {
          if (element === container) {
            return true
          }
        }
        return false
      }
  
    return bonzo
  })
  

  provide("bonzo", module.exports);
  provide("bonzo", module.exports);
  $.ender(module.exports);
}(global));

// ender:bonzo/ender-bridge as bonzo/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
  
    var b =  require('bonzo')
    b.setQueryEngine($)
    $.ender(b)
    $.ender(b(), true)
    $.ender({
      create: function (node) {
        return $(b.create(node))
      }
    })
  
    $.id = function (id) {
      return $([document.getElementById(id)])
    }
  
    function indexOf(ar, val) {
      for (var i = 0; i < ar.length; i++) if (ar[i] === val) return i
      return -1
    }
  
    function uniq(ar) {
      var r = [], i = 0, j = 0, k, item, inIt
      for (; item = ar[i]; ++i) {
        inIt = false
        for (k = 0; k < r.length; ++k) {
          if (r[k] === item) {
            inIt = true; break
          }
        }
        if (!inIt) r[j++] = item
      }
      return r
    }
  
    $.ender({
      parents: function (selector, closest) {
        var collection = $(selector), j, k, p, r = []
        for (j = 0, k = this.length; j < k; j++) {
          p = this[j]
          while (p = p.parentNode) {
            if (~indexOf(collection, p)) {
              r.push(p)
              if (closest) break;
            }
          }
        }
        return $(uniq(r))
      }
  
    , parent: function() {
        return $(uniq(b(this).parent()))
      }
  
    , closest: function (selector) {
        return this.parents(selector, true)
      }
  
    , first: function () {
        return $(this.length ? this[0] : this)
      }
  
    , last: function () {
        return $(this.length ? this[this.length - 1] : [])
      }
  
    , next: function () {
        return $(b(this).next())
      }
  
    , previous: function () {
        return $(b(this).previous())
      }
  
    , appendTo: function (t) {
        return b(this.selector).appendTo(t, this)
      }
  
    , prependTo: function (t) {
        return b(this.selector).prependTo(t, this)
      }
  
    , insertAfter: function (t) {
        return b(this.selector).insertAfter(t, this)
      }
  
    , insertBefore: function (t) {
        return b(this.selector).insertBefore(t, this)
      }
  
    , siblings: function () {
        var i, l, p, r = []
        for (i = 0, l = this.length; i < l; i++) {
          p = this[i]
          while (p = p.previousSibling) p.nodeType == 1 && r.push(p)
          p = this[i]
          while (p = p.nextSibling) p.nodeType == 1 && r.push(p)
        }
        return $(r)
      }
  
    , children: function () {
        var i, el, r = []
        for (i = 0, l = this.length; i < l; i++) {
          if (!(el = b.firstChild(this[i]))) continue;
          r.push(el)
          while (el = el.nextSibling) el.nodeType == 1 && r.push(el)
        }
        return $(uniq(r))
      }
  
    , height: function (v) {
        return dimension(v, this, 'height')
      }
  
    , width: function (v) {
        return dimension(v, this, 'width')
      }
    }, true)
  
    function dimension(v, self, which) {
      return v ?
        self.css(which, v) :
        function (r) {
          if (!self[0]) return 0
          r = parseInt(self.css(which), 10);
          return isNaN(r) ? self[0]['offset' + which.replace(/^\w/, function (m) {return m.toUpperCase()})] : r
        }()
    }
  
  }(ender);
  

  provide("bonzo/ender-bridge", module.exports);
  provide("bonzo/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:bean as bean
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * bean.js - copyright Jacob Thornton 2011
    * https://github.com/fat/bean
    * MIT License
    * special thanks to:
    * dean edwards: http://dean.edwards.name/
    * dperini: https://github.com/dperini/nwevents
    * the entire mootools team: github.com/mootools/mootools-core
    */
  !function (name, context, definition) {
    if (typeof module !== 'undefined') module.exports = definition(name, context);
    else if (typeof define === 'function' && typeof define.amd  === 'object') define(definition);
    else context[name] = definition(name, context);
  }('bean', this, function (name, context) {
    var win = window
      , old = context[name]
      , overOut = /over|out/
      , namespaceRegex = /[^\.]*(?=\..*)\.|.*/
      , nameRegex = /\..*/
      , addEvent = 'addEventListener'
      , attachEvent = 'attachEvent'
      , removeEvent = 'removeEventListener'
      , detachEvent = 'detachEvent'
      , doc = document || {}
      , root = doc.documentElement || {}
      , W3C_MODEL = root[addEvent]
      , eventSupport = W3C_MODEL ? addEvent : attachEvent
      , slice = Array.prototype.slice
      , mouseTypeRegex = /click|mouse(?!(.*wheel|scroll))|menu|drag|drop/i
      , mouseWheelTypeRegex = /mouse.*(wheel|scroll)/i
      , textTypeRegex = /^text/i
      , touchTypeRegex = /^touch|^gesture/i
      , ONE = { one: 1 } // singleton for quick matching making add() do one()
  
      , nativeEvents = (function (hash, events, i) {
          for (i = 0; i < events.length; i++)
            hash[events[i]] = 1
          return hash
        })({}, (
            'click dblclick mouseup mousedown contextmenu ' +                  // mouse buttons
            'mousewheel mousemultiwheel DOMMouseScroll ' +                     // mouse wheel
            'mouseover mouseout mousemove selectstart selectend ' +            // mouse movement
            'keydown keypress keyup ' +                                        // keyboard
            'orientationchange ' +                                             // mobile
            'focus blur change reset select submit ' +                         // form elements
            'load unload beforeunload resize move DOMContentLoaded readystatechange ' + // window
            'error abort scroll ' +                                            // misc
            (W3C_MODEL ? // element.fireEvent('onXYZ'... is not forgiving if we try to fire an event
                         // that doesn't actually exist, so make sure we only do these on newer browsers
              'show ' +                                                          // mouse buttons
              'input invalid ' +                                                 // form elements
              'touchstart touchmove touchend touchcancel ' +                     // touch
              'gesturestart gesturechange gestureend ' +                         // gesture
              'message readystatechange pageshow pagehide popstate ' +           // window
              'hashchange offline online ' +                                     // window
              'afterprint beforeprint ' +                                        // printing
              'dragstart dragenter dragover dragleave drag drop dragend ' +      // dnd
              'loadstart progress suspend emptied stalled loadmetadata ' +       // media
              'loadeddata canplay canplaythrough playing waiting seeking ' +     // media
              'seeked ended durationchange timeupdate play pause ratechange ' +  // media
              'volumechange cuechange ' +                                        // media
              'checking noupdate downloading cached updateready obsolete ' +     // appcache
              '' : '')
          ).split(' ')
        )
  
      , customEvents = (function () {
          var cdp = 'compareDocumentPosition'
          var isAncestor = cdp in root
            ? function (element, container) {
                return container[cdp] && (container[cdp](element) & 16) === 16
              }
            : 'contains' in root
              ? function (element, container) {
                  container = container.nodeType === 9 || container === window ? root : container
                  return container !== element && container.contains(element)
                }
              : function (element, container) {
                  while (element = element.parentNode) if (element === container) return 1
                  return 0
                }
  
          function check(event) {
            var related = event.relatedTarget
            if (!related) return related === null
            return (related !== this && related.prefix !== 'xul' && !/document/.test(this.toString()) && !isAncestor(related, this))
          }
  
          return {
              mouseenter: { base: 'mouseover', condition: check }
            , mouseleave: { base: 'mouseout', condition: check }
            , mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
          }
        })()
  
      , fixEvent = (function () {
          var commonProps = 'altKey attrChange attrName bubbles cancelable ctrlKey currentTarget detail eventPhase getModifierState isTrusted metaKey relatedNode relatedTarget shiftKey srcElement target timeStamp type view which'.split(' ')
            , mouseProps = commonProps.concat('button buttons clientX clientY dataTransfer fromElement offsetX offsetY pageX pageY screenX screenY toElement'.split(' '))
            , mouseWheelProps = mouseProps.concat('wheelDelta wheelDeltaX wheelDeltaY wheelDeltaZ axis'.split(' ')) // 'axis' is FF specific
            , keyProps = commonProps.concat('char charCode key keyCode keyIdentifier keyLocation'.split(' '))
            , textProps = commonProps.concat(['data'])
            , touchProps = commonProps.concat('touches targetTouches changedTouches scale rotation'.split(' '))
            , preventDefault = 'preventDefault'
            , createPreventDefault = function (event) {
                return function () {
                  if (event[preventDefault])
                    event[preventDefault]()
                  else
                    event.returnValue = false
                }
              }
            , stopPropagation = 'stopPropagation'
            , createStopPropagation = function (event) {
                return function () {
                  if (event[stopPropagation])
                    event[stopPropagation]()
                  else
                    event.cancelBubble = true
                }
              }
            , createStop = function (synEvent) {
                return function () {
                  synEvent[preventDefault]()
                  synEvent[stopPropagation]()
                  synEvent.stopped = true
                }
              }
            , copyProps = function (event, result, props) {
                var i, p
                for (i = props.length; i--;) {
                  p = props[i]
                  if (!(p in result) && p in event) result[p] = event[p]
                }
              }
  
          return function (event, isNative) {
            var result = { originalEvent: event, isNative: isNative }
            if (!event)
              return result
  
            var props
              , type = event.type
              , target = event.target || event.srcElement
  
            result[preventDefault] = createPreventDefault(event)
            result[stopPropagation] = createStopPropagation(event)
            result.stop = createStop(result)
            result.target = target && target.nodeType === 3 ? target.parentNode : target
  
            if (isNative) { // we only need basic augmentation on custom events, the rest is too expensive
              if (type.indexOf('key') !== -1) {
                props = keyProps
                result.keyCode = event.which || event.keyCode
              } else if (mouseTypeRegex.test(type)) {
                props = mouseProps
                result.rightClick = event.which === 3 || event.button === 2
                result.pos = { x: 0, y: 0 }
                if (event.pageX || event.pageY) {
                  result.clientX = event.pageX
                  result.clientY = event.pageY
                } else if (event.clientX || event.clientY) {
                  result.clientX = event.clientX + doc.body.scrollLeft + root.scrollLeft
                  result.clientY = event.clientY + doc.body.scrollTop + root.scrollTop
                }
                if (overOut.test(type))
                  result.relatedTarget = event.relatedTarget || event[(type === 'mouseover' ? 'from' : 'to') + 'Element']
              } else if (touchTypeRegex.test(type)) {
                props = touchProps
              } else if (mouseWheelTypeRegex.test(type)) {
                props = mouseWheelProps
              } else if (textTypeRegex.test(type)) {
                props = textProps
              }
              copyProps(event, result, props || commonProps)
            }
            return result
          }
        })()
  
        // if we're in old IE we can't do onpropertychange on doc or win so we use doc.documentElement for both
      , targetElement = function (element, isNative) {
          return !W3C_MODEL && !isNative && (element === doc || element === win) ? root : element
        }
  
        // we use one of these per listener, of any type
      , RegEntry = (function () {
          function entry(element, type, handler, original, namespaces) {
            this.element = element
            this.type = type
            this.handler = handler
            this.original = original
            this.namespaces = namespaces
            this.custom = customEvents[type]
            this.isNative = nativeEvents[type] && element[eventSupport]
            this.eventType = W3C_MODEL || this.isNative ? type : 'propertychange'
            this.customType = !W3C_MODEL && !this.isNative && type
            this.target = targetElement(element, this.isNative)
            this.eventSupport = this.target[eventSupport]
          }
  
          entry.prototype = {
              // given a list of namespaces, is our entry in any of them?
              inNamespaces: function (checkNamespaces) {
                var i, j
                if (!checkNamespaces)
                  return true
                if (!this.namespaces)
                  return false
                for (i = checkNamespaces.length; i--;) {
                  for (j = this.namespaces.length; j--;) {
                    if (checkNamespaces[i] === this.namespaces[j])
                      return true
                  }
                }
                return false
              }
  
              // match by element, original fn (opt), handler fn (opt)
            , matches: function (checkElement, checkOriginal, checkHandler) {
                return this.element === checkElement &&
                  (!checkOriginal || this.original === checkOriginal) &&
                  (!checkHandler || this.handler === checkHandler)
              }
          }
  
          return entry
        })()
  
      , registry = (function () {
          // our map stores arrays by event type, just because it's better than storing
          // everything in a single array. uses '$' as a prefix for the keys for safety
          var map = {}
  
            // generic functional search of our registry for matching listeners,
            // `fn` returns false to break out of the loop
            , forAll = function (element, type, original, handler, fn) {
                if (!type || type === '*') {
                  // search the whole registry
                  for (var t in map) {
                    if (t.charAt(0) === '$')
                      forAll(element, t.substr(1), original, handler, fn)
                  }
                } else {
                  var i = 0, l, list = map['$' + type], all = element === '*'
                  if (!list)
                    return
                  for (l = list.length; i < l; i++) {
                    if (all || list[i].matches(element, original, handler))
                      if (!fn(list[i], list, i, type))
                        return
                  }
                }
              }
  
            , has = function (element, type, original) {
                // we're not using forAll here simply because it's a bit slower and this
                // needs to be fast
                var i, list = map['$' + type]
                if (list) {
                  for (i = list.length; i--;) {
                    if (list[i].matches(element, original, null))
                      return true
                  }
                }
                return false
              }
  
            , get = function (element, type, original) {
                var entries = []
                forAll(element, type, original, null, function (entry) { return entries.push(entry) })
                return entries
              }
  
            , put = function (entry) {
                (map['$' + entry.type] || (map['$' + entry.type] = [])).push(entry)
                return entry
              }
  
            , del = function (entry) {
                forAll(entry.element, entry.type, null, entry.handler, function (entry, list, i) {
                  list.splice(i, 1)
                  if (list.length === 0)
                    delete map['$' + entry.type]
                  return false
                })
              }
  
              // dump all entries, used for onunload
            , entries = function () {
                var t, entries = []
                for (t in map) {
                  if (t.charAt(0) === '$')
                    entries = entries.concat(map[t])
                }
                return entries
              }
  
          return { has: has, get: get, put: put, del: del, entries: entries }
        })()
  
        // add and remove listeners to DOM elements
      , listener = W3C_MODEL ? function (element, type, fn, add) {
          element[add ? addEvent : removeEvent](type, fn, false)
        } : function (element, type, fn, add, custom) {
          if (custom && add && element['_on' + custom] === null)
            element['_on' + custom] = 0
          element[add ? attachEvent : detachEvent]('on' + type, fn)
        }
  
      , nativeHandler = function (element, fn, args) {
          var beanDel = fn.__beanDel
            , handler = function (event) {
            event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event, true)
            if (beanDel) // delegated event, fix the fix
              event.currentTarget = beanDel.ft(event.target, element)
            return fn.apply(element, [event].concat(args))
          }
          handler.__beanDel = beanDel
          return handler
        }
  
      , customHandler = function (element, fn, type, condition, args, isNative) {
          var beanDel = fn.__beanDel
            , handler = function (event) {
            var target = beanDel ? beanDel.ft(event.target, element) : this // deleated event
            if (condition ? condition.apply(target, arguments) : W3C_MODEL ? true : event && event.propertyName === '_on' + type || !event) {
              if (event) {
                event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event, isNative)
                event.currentTarget = target
              }
              fn.apply(element, event && (!args || args.length === 0) ? arguments : slice.call(arguments, event ? 0 : 1).concat(args))
            }
          }
          handler.__beanDel = beanDel
          return handler
        }
  
      , once = function (rm, element, type, fn, originalFn) {
          // wrap the handler in a handler that does a remove as well
          return function () {
            rm(element, type, originalFn)
            fn.apply(this, arguments)
          }
        }
  
      , removeListener = function (element, orgType, handler, namespaces) {
          var i, l, entry
            , type = (orgType && orgType.replace(nameRegex, ''))
            , handlers = registry.get(element, type, handler)
  
          for (i = 0, l = handlers.length; i < l; i++) {
            if (handlers[i].inNamespaces(namespaces)) {
              if ((entry = handlers[i]).eventSupport)
                listener(entry.target, entry.eventType, entry.handler, false, entry.type)
              // TODO: this is problematic, we have a registry.get() and registry.del() that
              // both do registry searches so we waste cycles doing this. Needs to be rolled into
              // a single registry.forAll(fn) that removes while finding, but the catch is that
              // we'll be splicing the arrays that we're iterating over. Needs extra tests to
              // make sure we don't screw it up. @rvagg
              registry.del(entry)
            }
          }
        }
  
      , addListener = function (element, orgType, fn, originalFn, args) {
          var entry
            , type = orgType.replace(nameRegex, '')
            , namespaces = orgType.replace(namespaceRegex, '').split('.')
  
          if (registry.has(element, type, fn))
            return element // no dupe
          if (type === 'unload')
            fn = once(removeListener, element, type, fn, originalFn) // self clean-up
          if (customEvents[type]) {
            if (customEvents[type].condition)
              fn = customHandler(element, fn, type, customEvents[type].condition, args, true)
            type = customEvents[type].base || type
          }
          entry = registry.put(new RegEntry(element, type, fn, originalFn, namespaces[0] && namespaces))
          entry.handler = entry.isNative ?
            nativeHandler(element, entry.handler, args) :
            customHandler(element, entry.handler, type, false, args, false)
          if (entry.eventSupport)
            listener(entry.target, entry.eventType, entry.handler, true, entry.customType)
        }
  
      , del = function (selector, fn, $) {
          var findTarget = function (target, root) {
                var i, array = typeof selector === 'string' ? $(selector, root) : selector
                for (; target && target !== root; target = target.parentNode) {
                  for (i = array.length; i--;) {
                    if (array[i] === target)
                      return target
                  }
                }
              }
            , handler = function (e) {
                var match = findTarget(e.target, this)
                if (match)
                  fn.apply(match, arguments)
              }
  
          handler.__beanDel = {
              ft: findTarget // attach it here for customEvents to use too
            , selector: selector
            , $: $
          }
          return handler
        }
  
      , remove = function (element, typeSpec, fn) {
          var k, m, type, namespaces, i
            , rm = removeListener
            , isString = typeSpec && typeof typeSpec === 'string'
  
          if (isString && typeSpec.indexOf(' ') > 0) {
            // remove(el, 't1 t2 t3', fn) or remove(el, 't1 t2 t3')
            typeSpec = typeSpec.split(' ')
            for (i = typeSpec.length; i--;)
              remove(element, typeSpec[i], fn)
            return element
          }
          type = isString && typeSpec.replace(nameRegex, '')
          if (type && customEvents[type])
            type = customEvents[type].type
          if (!typeSpec || isString) {
            // remove(el) or remove(el, t1.ns) or remove(el, .ns) or remove(el, .ns1.ns2.ns3)
            if (namespaces = isString && typeSpec.replace(namespaceRegex, ''))
              namespaces = namespaces.split('.')
            rm(element, type, fn, namespaces)
          } else if (typeof typeSpec === 'function') {
            // remove(el, fn)
            rm(element, null, typeSpec)
          } else {
            // remove(el, { t1: fn1, t2, fn2 })
            for (k in typeSpec) {
              if (typeSpec.hasOwnProperty(k))
                remove(element, k, typeSpec[k])
            }
          }
          return element
        }
  
      , add = function (element, events, fn, delfn, $) {
          var type, types, i, args
            , originalFn = fn
            , isDel = fn && typeof fn === 'string'
  
          if (events && !fn && typeof events === 'object') {
            for (type in events) {
              if (events.hasOwnProperty(type))
                add.apply(this, [ element, type, events[type] ])
            }
          } else {
            args = arguments.length > 3 ? slice.call(arguments, 3) : []
            types = (isDel ? fn : events).split(' ')
            isDel && (fn = del(events, (originalFn = delfn), $)) && (args = slice.call(args, 1))
            // special case for one()
            this === ONE && (fn = once(remove, element, events, fn, originalFn))
            for (i = types.length; i--;) addListener(element, types[i], fn, originalFn, args)
          }
          return element
        }
  
      , one = function () {
          return add.apply(ONE, arguments)
        }
  
      , fireListener = W3C_MODEL ? function (isNative, type, element) {
          var evt = doc.createEvent(isNative ? 'HTMLEvents' : 'UIEvents')
          evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, win, 1)
          element.dispatchEvent(evt)
        } : function (isNative, type, element) {
          element = targetElement(element, isNative)
          // if not-native then we're using onpropertychange so we just increment a custom property
          isNative ? element.fireEvent('on' + type, doc.createEventObject()) : element['_on' + type]++
        }
  
      , fire = function (element, type, args) {
          var i, j, l, names, handlers
            , types = type.split(' ')
  
          for (i = types.length; i--;) {
            type = types[i].replace(nameRegex, '')
            if (names = types[i].replace(namespaceRegex, ''))
              names = names.split('.')
            if (!names && !args && element[eventSupport]) {
              fireListener(nativeEvents[type], type, element)
            } else {
              // non-native event, either because of a namespace, arguments or a non DOM element
              // iterate over all listeners and manually 'fire'
              handlers = registry.get(element, type)
              args = [false].concat(args)
              for (j = 0, l = handlers.length; j < l; j++) {
                if (handlers[j].inNamespaces(names))
                  handlers[j].handler.apply(element, args)
              }
            }
          }
          return element
        }
  
      , clone = function (element, from, type) {
          var i = 0
            , handlers = registry.get(from, type)
            , l = handlers.length
            , args, beanDel
  
          for (;i < l; i++) {
            if (handlers[i].original) {
              beanDel = handlers[i].handler.__beanDel
              if (beanDel) {
                args = [ element, beanDel.selector, handlers[i].type, handlers[i].original, beanDel.$]
              } else
                args = [ element, handlers[i].type, handlers[i].original ]
              add.apply(null, args)
            }
          }
          return element
        }
  
      , bean = {
            add: add
          , one: one
          , remove: remove
          , clone: clone
          , fire: fire
          , noConflict: function () {
              context[name] = old
              return this
            }
        }
  
    if (win[attachEvent]) {
      // for IE, clean up on unload to avoid leaks
      var cleanup = function () {
        var i, entries = registry.entries()
        for (i in entries) {
          if (entries[i].type && entries[i].type !== 'unload')
            remove(entries[i].element, entries[i].type)
        }
        win[detachEvent]('onunload', cleanup)
        win.CollectGarbage && win.CollectGarbage()
      }
      win[attachEvent]('onunload', cleanup)
    }
  
    return bean
  })
  

  provide("bean", module.exports);
  provide("bean", module.exports);
  $.ender(module.exports);
}(global));

// ender:bean/ender-bridge as bean/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
    var b =  require('bean')
      , integrate = function (method, type, method2) {
          var _args = type ? [type] : []
          return function () {
            for (var args, i = 0, l = this.length; i < l; i++) {
              args = [this[i]].concat(_args, Array.prototype.slice.call(arguments, 0))
              args.length == 4 && args.push($)
              !arguments.length && method == 'add' && type && (method = 'fire')
              b[method].apply(this, args)
            }
            return this
          }
        }
      , add = integrate('add')
      , remove = integrate('remove')
      , fire = integrate('fire')
  
      , methods = {
            on: add // NOTE: .on() is likely to change in the near future, don't rely on this as-is see https://github.com/fat/bean/issues/55
          , addListener: add
          , bind: add
          , listen: add
          , delegate: add
  
          , one: integrate('one')
  
          , off: remove
          , unbind: remove
          , unlisten: remove
          , removeListener: remove
          , undelegate: remove
  
          , emit: fire
          , trigger: fire
  
          , cloneEvents: integrate('clone')
  
          , hover: function (enter, leave, i) { // i for internal
              for (i = this.length; i--;) {
                b.add.call(this, this[i], 'mouseenter', enter)
                b.add.call(this, this[i], 'mouseleave', leave)
              }
              return this
            }
        }
  
      , shortcuts = [
            'blur', 'change', 'click', 'dblclick', 'error', 'focus', 'focusin'
          , 'focusout', 'keydown', 'keypress', 'keyup', 'load', 'mousedown'
          , 'mouseenter', 'mouseleave', 'mouseout', 'mouseover', 'mouseup', 'mousemove'
          , 'resize', 'scroll', 'select', 'submit', 'unload'
        ]
  
    for (var i = shortcuts.length; i--;) {
      methods[shortcuts[i]] = integrate('add', shortcuts[i])
    }
  
    $.ender(methods, true)
  }(ender)
  

  provide("bean/ender-bridge", module.exports);
  provide("bean/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:qwery as qwery
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * Qwery - A Blazing Fast query selector engine
    * https://github.com/ded/qwery
    * copyright Dustin Diaz & Jacob Thornton 2011
    * MIT License
    */
  
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
    else this[name] = definition()
  }('qwery', function () {
    var doc = document
      , html = doc.documentElement
      , byClass = 'getElementsByClassName'
      , byTag = 'getElementsByTagName'
      , qSA = 'querySelectorAll'
      , useNativeQSA = 'useNativeQSA'
      , tagName = 'tagName'
      , nodeType = 'nodeType'
      , select // main select() method, assign later
  
      // OOOOOOOOOOOOH HERE COME THE ESSSXXSSPRESSSIONSSSSSSSS!!!!!
      , id = /#([\w\-]+)/
      , clas = /\.[\w\-]+/g
      , idOnly = /^#([\w\-]+)$/
      , classOnly = /^\.([\w\-]+)$/
      , tagOnly = /^([\w\-]+)$/
      , tagAndOrClass = /^([\w]+)?\.([\w\-]+)$/
      , splittable = /(^|,)\s*[>~+]/
      , normalizr = /^\s+|\s*([,\s\+\~>]|$)\s*/g
      , splitters = /[\s\>\+\~]/
      , splittersMore = /(?![\s\w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^'"]*\]|[\s\w\+\-]*\))/
      , specialChars = /([.*+?\^=!:${}()|\[\]\/\\])/g
      , simple = /^(\*|[a-z0-9]+)?(?:([\.\#]+[\w\-\.#]+)?)/
      , attr = /\[([\w\-]+)(?:([\|\^\$\*\~]?\=)['"]?([ \w\-\/\?\&\=\:\.\(\)\!,@#%<>\{\}\$\*\^]+)["']?)?\]/
      , pseudo = /:([\w\-]+)(\(['"]?([^()]+)['"]?\))?/
      , easy = new RegExp(idOnly.source + '|' + tagOnly.source + '|' + classOnly.source)
      , dividers = new RegExp('(' + splitters.source + ')' + splittersMore.source, 'g')
      , tokenizr = new RegExp(splitters.source + splittersMore.source)
      , chunker = new RegExp(simple.source + '(' + attr.source + ')?' + '(' + pseudo.source + ')?')
      , walker = {
          ' ': function (node) {
            return node && node !== html && node.parentNode
          }
        , '>': function (node, contestant) {
            return node && node.parentNode == contestant.parentNode && node.parentNode
          }
        , '~': function (node) {
            return node && node.previousSibling
          }
        , '+': function (node, contestant, p1, p2) {
            if (!node) return false
            return (p1 = previous(node)) && (p2 = previous(contestant)) && p1 == p2 && p1
          }
        }
  
    function cache() {
      this.c = {}
    }
    cache.prototype = {
      g: function (k) {
        return this.c[k] || undefined
      }
    , s: function (k, v, r) {
        v = r ? new RegExp(v) : v
        return (this.c[k] = v)
      }
    }
  
    var classCache = new cache()
      , cleanCache = new cache()
      , attrCache = new cache()
      , tokenCache = new cache()
  
    function classRegex(c) {
      return classCache.g(c) || classCache.s(c, '(^|\\s+)' + c + '(\\s+|$)', 1)
    }
  
    // not quite as fast as inline loops in older browsers so don't use liberally
    function each(a, fn) {
      var i = 0, l = a.length
      for (; i < l; i++) fn(a[i])
    }
  
    function flatten(ar) {
      for (var r = [], i = 0, l = ar.length; i < l; ++i) arrayLike(ar[i]) ? (r = r.concat(ar[i])) : (r[r.length] = ar[i])
      return r
    }
  
    function arrayify(ar) {
      var i = 0, l = ar.length, r = []
      for (; i < l; i++) r[i] = ar[i]
      return r
    }
  
    function previous(n) {
      while (n = n.previousSibling) if (n[nodeType] == 1) break;
      return n
    }
  
    function q(query) {
      return query.match(chunker)
    }
  
    // called using `this` as element and arguments from regex group results.
    // given => div.hello[title="world"]:foo('bar')
    // div.hello[title="world"]:foo('bar'), div, .hello, [title="world"], title, =, world, :foo('bar'), foo, ('bar'), bar]
    function interpret(whole, tag, idsAndClasses, wholeAttribute, attribute, qualifier, value, wholePseudo, pseudo, wholePseudoVal, pseudoVal) {
      var i, m, k, o, classes
      if (this[nodeType] !== 1) return false
      if (tag && tag !== '*' && this[tagName] && this[tagName].toLowerCase() !== tag) return false
      if (idsAndClasses && (m = idsAndClasses.match(id)) && m[1] !== this.id) return false
      if (idsAndClasses && (classes = idsAndClasses.match(clas))) {
        for (i = classes.length; i--;) if (!classRegex(classes[i].slice(1)).test(this.className)) return false
      }
      if (pseudo && qwery.pseudos[pseudo] && !qwery.pseudos[pseudo](this, pseudoVal)) return false
      if (wholeAttribute && !value) { // select is just for existance of attrib
        o = this.attributes
        for (k in o) {
          if (Object.prototype.hasOwnProperty.call(o, k) && (o[k].name || k) == attribute) {
            return this
          }
        }
      }
      if (wholeAttribute && !checkAttr(qualifier, getAttr(this, attribute) || '', value)) {
        // select is for attrib equality
        return false
      }
      return this
    }
  
    function clean(s) {
      return cleanCache.g(s) || cleanCache.s(s, s.replace(specialChars, '\\$1'))
    }
  
    function checkAttr(qualify, actual, val) {
      switch (qualify) {
      case '=':
        return actual == val
      case '^=':
        return actual.match(attrCache.g('^=' + val) || attrCache.s('^=' + val, '^' + clean(val), 1))
      case '$=':
        return actual.match(attrCache.g('$=' + val) || attrCache.s('$=' + val, clean(val) + '$', 1))
      case '*=':
        return actual.match(attrCache.g(val) || attrCache.s(val, clean(val), 1))
      case '~=':
        return actual.match(attrCache.g('~=' + val) || attrCache.s('~=' + val, '(?:^|\\s+)' + clean(val) + '(?:\\s+|$)', 1))
      case '|=':
        return actual.match(attrCache.g('|=' + val) || attrCache.s('|=' + val, '^' + clean(val) + '(-|$)', 1))
      }
      return 0
    }
  
    // given a selector, first check for simple cases then collect all base candidate matches and filter
    function _qwery(selector, _root) {
      var r = [], ret = [], i, l, m, token, tag, els, intr, item, root = _root
        , tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
        , dividedTokens = selector.match(dividers)
  
      if (!tokens.length) return r
  
      token = (tokens = tokens.slice(0)).pop() // copy cached tokens, take the last one
      if (tokens.length && (m = tokens[tokens.length - 1].match(idOnly))) root = byId(_root, m[1])
      if (!root) return r
  
      intr = q(token)
      // collect base candidates to filter
      els = root !== _root && root[nodeType] !== 9 && dividedTokens && /^[+~]$/.test(dividedTokens[dividedTokens.length - 1]) ?
        function (r) {
          while (root = root.nextSibling) {
            root[nodeType] == 1 && (intr[1] ? intr[1] == root[tagName].toLowerCase() : 1) && (r[r.length] = root)
          }
          return r
        }([]) :
        root[byTag](intr[1] || '*')
      // filter elements according to the right-most part of the selector
      for (i = 0, l = els.length; i < l; i++) {
        if (item = interpret.apply(els[i], intr)) r[r.length] = item
      }
      if (!tokens.length) return r
  
      // filter further according to the rest of the selector (the left side)
      each(r, function(e) { if (ancestorMatch(e, tokens, dividedTokens)) ret[ret.length] = e })
      return ret
    }
  
    // compare element to a selector
    function is(el, selector, root) {
      if (isNode(selector)) return el == selector
      if (arrayLike(selector)) return !!~flatten(selector).indexOf(el) // if selector is an array, is el a member?
  
      var selectors = selector.split(','), tokens, dividedTokens
      while (selector = selectors.pop()) {
        tokens = tokenCache.g(selector) || tokenCache.s(selector, selector.split(tokenizr))
        dividedTokens = selector.match(dividers)
        tokens = tokens.slice(0) // copy array
        if (interpret.apply(el, q(tokens.pop())) && (!tokens.length || ancestorMatch(el, tokens, dividedTokens, root))) {
          return true
        }
      }
      return false
    }
  
    // given elements matching the right-most part of a selector, filter out any that don't match the rest
    function ancestorMatch(el, tokens, dividedTokens, root) {
      var cand
      // recursively work backwards through the tokens and up the dom, covering all options
      function crawl(e, i, p) {
        while (p = walker[dividedTokens[i]](p, e)) {
          if (isNode(p) && (interpret.apply(p, q(tokens[i])))) {
            if (i) {
              if (cand = crawl(p, i - 1, p)) return cand
            } else return p
          }
        }
      }
      return (cand = crawl(el, tokens.length - 1, el)) && (!root || isAncestor(cand, root))
    }
  
    function isNode(el, t) {
      return el && typeof el === 'object' && (t = el[nodeType]) && (t == 1 || t == 9)
    }
  
    function uniq(ar) {
      var a = [], i, j
      o: for (i = 0; i < ar.length; ++i) {
        for (j = 0; j < a.length; ++j) if (a[j] == ar[i]) continue o
        a[a.length] = ar[i]
      }
      return a
    }
  
    function arrayLike(o) {
      return (typeof o === 'object' && isFinite(o.length))
    }
  
    function normalizeRoot(root) {
      if (!root) return doc
      if (typeof root == 'string') return qwery(root)[0]
      if (!root[nodeType] && arrayLike(root)) return root[0]
      return root
    }
  
    function byId(root, id, el) {
      // if doc, query on it, else query the parent doc or if a detached fragment rewrite the query and run on the fragment
      return root[nodeType] === 9 ? root.getElementById(id) :
        root.ownerDocument &&
          (((el = root.ownerDocument.getElementById(id)) && isAncestor(el, root) && el) ||
            (!isAncestor(root, root.ownerDocument) && select('[id="' + id + '"]', root)[0]))
    }
  
    function qwery(selector, _root) {
      var m, el, root = normalizeRoot(_root)
  
      // easy, fast cases that we can dispatch with simple DOM calls
      if (!root || !selector) return []
      if (selector === window || isNode(selector)) {
        return !_root || (selector !== window && isNode(root) && isAncestor(selector, root)) ? [selector] : []
      }
      if (selector && arrayLike(selector)) return flatten(selector)
      if (m = selector.match(easy)) {
        if (m[1]) return (el = byId(root, m[1])) ? [el] : []
        if (m[2]) return arrayify(root[byTag](m[2]))
        if (hasByClass && m[3]) return arrayify(root[byClass](m[3]))
      }
  
      return select(selector, root)
    }
  
    // where the root is not document and a relationship selector is first we have to
    // do some awkward adjustments to get it to work, even with qSA
    function collectSelector(root, collector) {
      return function(s) {
        var oid, nid
        if (splittable.test(s)) {
          if (root[nodeType] !== 9) {
           // make sure the el has an id, rewrite the query, set root to doc and run it
           if (!(nid = oid = root.getAttribute('id'))) root.setAttribute('id', nid = '__qwerymeupscotty')
           s = '[id="' + nid + '"]' + s // avoid byId and allow us to match context element
           collector(root.parentNode || root, s, true)
           oid || root.removeAttribute('id')
          }
          return;
        }
        s.length && collector(root, s, false)
      }
    }
  
    var isAncestor = 'compareDocumentPosition' in html ?
      function (element, container) {
        return (container.compareDocumentPosition(element) & 16) == 16
      } : 'contains' in html ?
      function (element, container) {
        container = container[nodeType] === 9 || container == window ? html : container
        return container !== element && container.contains(element)
      } :
      function (element, container) {
        while (element = element.parentNode) if (element === container) return 1
        return 0
      }
    , getAttr = function() {
        // detect buggy IE src/href getAttribute() call
        var e = doc.createElement('p')
        return ((e.innerHTML = '<a href="#x">x</a>') && e.firstChild.getAttribute('href') != '#x') ?
          function(e, a) {
            return a === 'class' ? e.className : (a === 'href' || a === 'src') ?
              e.getAttribute(a, 2) : e.getAttribute(a)
          } :
          function(e, a) { return e.getAttribute(a) }
     }()
    , hasByClass = !!doc[byClass]
      // has native qSA support
    , hasQSA = doc.querySelector && doc[qSA]
      // use native qSA
    , selectQSA = function (selector, root) {
        var result = [], ss, e
        try {
          if (root[nodeType] === 9 || !splittable.test(selector)) {
            // most work is done right here, defer to qSA
            return arrayify(root[qSA](selector))
          }
          // special case where we need the services of `collectSelector()`
          each(ss = selector.split(','), collectSelector(root, function(ctx, s) {
            e = ctx[qSA](s)
            if (e.length == 1) result[result.length] = e.item(0)
            else if (e.length) result = result.concat(arrayify(e))
          }))
          return ss.length > 1 && result.length > 1 ? uniq(result) : result
        } catch(ex) { }
        return selectNonNative(selector, root)
      }
      // no native selector support
    , selectNonNative = function (selector, root) {
        var result = [], items, m, i, l, r, ss
        selector = selector.replace(normalizr, '$1')
        if (m = selector.match(tagAndOrClass)) {
          r = classRegex(m[2])
          items = root[byTag](m[1] || '*')
          for (i = 0, l = items.length; i < l; i++) {
            if (r.test(items[i].className)) result[result.length] = items[i]
          }
          return result
        }
        // more complex selector, get `_qwery()` to do the work for us
        each(ss = selector.split(','), collectSelector(root, function(ctx, s, rewrite) {
          r = _qwery(s, ctx)
          for (i = 0, l = r.length; i < l; i++) {
            if (ctx[nodeType] === 9 || rewrite || isAncestor(r[i], root)) result[result.length] = r[i]
          }
        }))
        return ss.length > 1 && result.length > 1 ? uniq(result) : result
      }
    , configure = function (options) {
        // configNativeQSA: use fully-internal selector or native qSA where present
        if (typeof options[useNativeQSA] !== 'undefined')
          select = !options[useNativeQSA] ? selectNonNative : hasQSA ? selectQSA : selectNonNative
      }
  
    configure({ useNativeQSA: true })
  
    qwery.configure = configure
    qwery.uniq = uniq
    qwery.is = is
    qwery.pseudos = {}
  
    return qwery
  })
  

  provide("qwery", module.exports);
  provide("qwery", module.exports);
  $.ender(module.exports);
}(global));

// ender:qwery/ender-bridge as qwery/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function (doc, $) {
    var q =  require('qwery')
  
    $.pseudos = q.pseudos
  
    $._select = function (s, r) {
      // detect if sibling module 'bonzo' is available at run-time
      // rather than load-time since technically it's not a dependency and
      // can be loaded in any order
      // hence the lazy function re-definition
      return ($._select = (function(b) {
        try {
          b = require('bonzo')
          return function (s, r) {
            return /^\s*</.test(s) ? b.create(s, r) : q(s, r)
          }
        } catch (e) { }
        return q
      })())(s, r)
    }
  
    $.ender({
        find: function (s) {
          var r = [], i, l, j, k, els
          for (i = 0, l = this.length; i < l; i++) {
            els = q(s, this[i])
            for (j = 0, k = els.length; j < k; j++) r.push(els[j])
          }
          return $(q.uniq(r))
        }
      , and: function (s) {
          var plus = $(s)
          for (var i = this.length, j = 0, l = this.length + plus.length; i < l; i++, j++) {
            this[i] = plus[j]
          }
          return this
        }
      , is: function(s, r) {
          var i, l
          for (i = 0, l = this.length; i < l; i++) {
            if (q.is(this[i], s, r)) {
              return true
            }
          }
          return false
        }
    }, true)
  }(document, ender);
  

  provide("qwery/ender-bridge", module.exports);
  provide("qwery/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:domready as domready
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * domready (c) Dustin Diaz 2012 - License MIT
    */
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
    else this[name] = definition()
  }('domready', function (ready) {
  
    var fns = [], fn, f = false
      , doc = document
      , testEl = doc.documentElement
      , hack = testEl.doScroll
      , domContentLoaded = 'DOMContentLoaded'
      , addEventListener = 'addEventListener'
      , onreadystatechange = 'onreadystatechange'
      , readyState = 'readyState'
      , loaded = /^loade|c/.test(doc[readyState])
  
    function flush(f) {
      loaded = 1
      while (f = fns.shift()) f()
    }
  
    doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
      doc.removeEventListener(domContentLoaded, fn, f)
      flush()
    }, f)
  
  
    hack && doc.attachEvent(onreadystatechange, fn = function () {
      if (/^c/.test(doc[readyState])) {
        doc.detachEvent(onreadystatechange, fn)
        flush()
      }
    })
  
    return (ready = hack ?
      function (fn) {
        self != top ?
          loaded ? fn() : fns.push(fn) :
          function () {
            try {
              testEl.doScroll('left')
            } catch (e) {
              return setTimeout(function() { ready(fn) }, 50)
            }
            fn()
          }()
      } :
      function (fn) {
        loaded ? fn() : fns.push(fn)
      })
  })

  provide("domready", module.exports);
  provide("domready", module.exports);
  $.ender(module.exports);
}(global));

// ender:domready/ender-bridge as domready/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
    var ready =  require('domready')
    $.ender({domReady: ready})
    $.ender({
      ready: function (f) {
        ready(f)
        return this
      }
    }, true)
  }(ender);

  provide("domready/ender-bridge", module.exports);
  provide("domready/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:reqwest as reqwest
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  /*!
    * Reqwest! A general purpose XHR connection manager
    * (c) Dustin Diaz 2011
    * https://github.com/ded/reqwest
    * license MIT
    */
  !function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition()
    else if (typeof define == 'function' && define.amd) define(name, definition)
    else this[name] = definition()
  }('reqwest', function () {
  
    var context = this
      , win = window
      , doc = document
      , old = context.reqwest
      , twoHundo = /^20\d$/
      , byTag = 'getElementsByTagName'
      , readyState = 'readyState'
      , contentType = 'Content-Type'
      , requestedWith = 'X-Requested-With'
      , head = doc[byTag]('head')[0]
      , uniqid = 0
      , lastValue // data stored by the most recent JSONP callback
      , xmlHttpRequest = 'XMLHttpRequest'
      , defaultHeaders = {
            contentType: 'application/x-www-form-urlencoded'
          , accept: {
                '*':  'text/javascript, text/html, application/xml, text/xml, */*'
              , xml:  'application/xml, text/xml'
              , html: 'text/html'
              , text: 'text/plain'
              , json: 'application/json, text/javascript'
              , js:   'application/javascript, text/javascript'
            }
          , requestedWith: xmlHttpRequest
        }
      , xhr = (xmlHttpRequest in win) ?
          function () {
            return new XMLHttpRequest()
          } :
          function () {
            return new ActiveXObject('Microsoft.XMLHTTP')
          }
  
    function handleReadyState(o, success, error) {
      return function () {
        if (o && o[readyState] == 4) {
          if (twoHundo.test(o.status)) {
            success(o)
          } else {
            error(o)
          }
        }
      }
    }
  
    function setHeaders(http, o) {
      var headers = o.headers || {}
      headers.Accept = headers.Accept || defaultHeaders.accept[o.type] || defaultHeaders.accept['*']
      // breaks cross-origin requests with legacy browsers
      if (!o.crossOrigin && !headers[requestedWith]) headers[requestedWith] = defaultHeaders.requestedWith
      if (!headers[contentType]) headers[contentType] = o.contentType || defaultHeaders.contentType
      for (var h in headers) {
        headers.hasOwnProperty(h) && http.setRequestHeader(h, headers[h])
      }
    }
  
    function generalCallback(data) {
      lastValue = data
    }
  
    function urlappend(url, s) {
      return url + (/\?/.test(url) ? '&' : '?') + s
    }
  
    function handleJsonp(o, fn, err, url) {
      var reqId = uniqid++
        , cbkey = o.jsonpCallback || 'callback' // the 'callback' key
        , cbval = o.jsonpCallbackName || ('reqwest_' + reqId) // the 'callback' value
        , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
        , match = url.match(cbreg)
        , script = doc.createElement('script')
        , loaded = 0
  
      if (match) {
        if (match[3] === '?') {
          url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
        } else {
          cbval = match[3] // provided callback func name
        }
      } else {
        url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
      }
  
      win[cbval] = generalCallback
  
      script.type = 'text/javascript'
      script.src = url
      script.async = true
      if (typeof script.onreadystatechange !== 'undefined') {
          // need this for IE due to out-of-order onreadystatechange(), binding script
          // execution to an event listener gives us control over when the script
          // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
          script.event = 'onclick'
          script.htmlFor = script.id = '_reqwest_' + reqId
      }
  
      script.onload = script.onreadystatechange = function () {
        if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
          return false
        }
        script.onload = script.onreadystatechange = null
        script.onclick && script.onclick()
        // Call the user callback with the last value stored and clean up values and scripts.
        o.success && o.success(lastValue)
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
  
      // Add the script to the DOM head
      head.appendChild(script)
    }
  
    function getRequest(o, fn, err) {
      var method = (o.method || 'GET').toUpperCase()
        , url = typeof o === 'string' ? o : o.url
        // convert non-string objects to query-string form unless o.processData is false
        , data = (o.processData !== false && o.data && typeof o.data !== 'string')
          ? reqwest.toQueryString(o.data)
          : (o.data || null);
  
      // if we're working on a GET request and we have data then we should append
      // query string to end of URL and not post data
      (o.type == 'jsonp' || method == 'GET')
        && data
        && (url = urlappend(url, data))
        && (data = null)
  
      if (o.type == 'jsonp') return handleJsonp(o, fn, err, url)
  
      var http = xhr()
      http.open(method, url, true)
      setHeaders(http, o)
      http.onreadystatechange = handleReadyState(http, fn, err)
      o.before && o.before(http)
      http.send(data)
      return http
    }
  
    function Reqwest(o, fn) {
      this.o = o
      this.fn = fn
      init.apply(this, arguments)
    }
  
    function setType(url) {
      var m = url.match(/\.(json|jsonp|html|xml)(\?|$)/)
      return m ? m[1] : 'js'
    }
  
    function init(o, fn) {
      this.url = typeof o == 'string' ? o : o.url
      this.timeout = null
      var type = o.type || setType(this.url)
        , self = this
      fn = fn || function () {}
  
      if (o.timeout) {
        this.timeout = setTimeout(function () {
          self.abort()
        }, o.timeout)
      }
  
      function complete(resp) {
        o.timeout && clearTimeout(self.timeout)
        self.timeout = null
        o.complete && o.complete(resp)
      }
  
      function success(resp) {
        var r = resp.responseText
        if (r) {
          switch (type) {
          case 'json':
            try {
              resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
            } catch(err) {
              return error(resp, 'Could not parse JSON in response', err)
            }
            break;
          case 'js':
            resp = eval(r)
            break;
          case 'html':
            resp = r
            break;
          }
        }
  
        fn(resp)
        o.success && o.success(resp)
  
        complete(resp)
      }
  
      function error(resp, msg, t) {
        o.error && o.error(resp, msg, t)
        complete(resp)
      }
  
      this.request = getRequest(o, success, error)
    }
  
    Reqwest.prototype = {
      abort: function () {
        this.request.abort()
      }
  
    , retry: function () {
        init.call(this, this.o, this.fn)
      }
    }
  
    function reqwest(o, fn) {
      return new Reqwest(o, fn)
    }
  
    // normalize newline variants according to spec -> CRLF
    function normalize(s) {
      return s ? s.replace(/\r?\n/g, '\r\n') : ''
    }
  
    var isArray = typeof Array.isArray == 'function' ? Array.isArray : function(a) {
      return a instanceof Array
    }
  
    function serial(el, cb) {
      var n = el.name
        , t = el.tagName.toLowerCase()
        , optCb = function(o) {
            // IE gives value="" even where there is no value attribute
            // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
            if (o && !o.disabled)
              cb(n, normalize(o.attributes.value && o.attributes.value.specified ? o.value : o.text))
          }
  
      // don't serialize elements that are disabled or without a name
      if (el.disabled || !n) return;
  
      switch (t) {
      case 'input':
        if (!/reset|button|image|file/i.test(el.type)) {
          var ch = /checkbox/i.test(el.type)
            , ra = /radio/i.test(el.type)
            , val = el.value;
          // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
          (!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
        }
        break;
      case 'textarea':
        cb(n, normalize(el.value))
        break;
      case 'select':
        if (el.type.toLowerCase() === 'select-one') {
          optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
        } else {
          for (var i = 0; el.length && i < el.length; i++) {
            el.options[i].selected && optCb(el.options[i])
          }
        }
        break;
      }
    }
  
    // collect up all form elements found from the passed argument elements all
    // the way down to child elements; pass a '<form>' or form fields.
    // called with 'this'=callback to use for serial() on each element
    function eachFormElement() {
      var cb = this
        , e, i, j
        , serializeSubtags = function(e, tags) {
          for (var i = 0; i < tags.length; i++) {
            var fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }
  
      for (i = 0; i < arguments.length; i++) {
        e = arguments[i]
        if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
        serializeSubtags(e, [ 'input', 'select', 'textarea' ])
      }
    }
  
    // standard query string style serialization
    function serializeQueryString() {
      return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
    }
  
    // { 'name': 'value', ... } style serialization
    function serializeHash() {
      var hash = {}
      eachFormElement.apply(function (name, value) {
        if (name in hash) {
          hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
          hash[name].push(value)
        } else hash[name] = value
      }, arguments)
      return hash
    }
  
    // [ { name: 'name', value: 'value' }, ... ] style serialization
    reqwest.serializeArray = function () {
      var arr = []
      eachFormElement.apply(function(name, value) {
        arr.push({name: name, value: value})
      }, arguments)
      return arr
    }
  
    reqwest.serialize = function () {
      if (arguments.length === 0) return ''
      var opt, fn
        , args = Array.prototype.slice.call(arguments, 0)
  
      opt = args.pop()
      opt && opt.nodeType && args.push(opt) && (opt = null)
      opt && (opt = opt.type)
  
      if (opt == 'map') fn = serializeHash
      else if (opt == 'array') fn = reqwest.serializeArray
      else fn = serializeQueryString
  
      return fn.apply(null, args)
    }
  
    reqwest.toQueryString = function (o) {
      var qs = '', i
        , enc = encodeURIComponent
        , push = function (k, v) {
            qs += enc(k) + '=' + enc(v) + '&'
          }
  
      if (isArray(o)) {
        for (i = 0; o && i < o.length; i++) push(o[i].name, o[i].value)
      } else {
        for (var k in o) {
          if (!Object.hasOwnProperty.call(o, k)) continue;
          var v = o[k]
          if (isArray(v)) {
            for (i = 0; i < v.length; i++) push(k, v[i])
          } else push(k, o[k])
        }
      }
  
      // spaces should be + according to spec
      return qs.replace(/&$/, '').replace(/%20/g,'+')
    }
  
    // jQuery and Zepto compatibility, differences can be remapped here so you can call
    // .ajax.compat(options, callback)
    reqwest.compat = function (o, fn) {
      if (o) {
        o.type && (o.method = o.type) && delete o.type
        o.dataType && (o.type = o.dataType)
        o.jsonpCallback && (o.jsonpCallbackName = o.jsonpCallback) && delete o.jsonpCallback
        o.jsonp && (o.jsonpCallback = o.jsonp)
      }
      return new Reqwest(o, fn)
    }
  
    reqwest.noConflict = function () {
      context.reqwest = old
      return this
    }
  
    return reqwest
  })
  

  provide("reqwest", module.exports);
  provide("reqwest", module.exports);
  $.ender(module.exports);
}(global));

// ender:reqwest/ender-bridge as reqwest/ender-bridge
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  !function ($) {
    var r =  require('reqwest')
      , integrate = function(method) {
        return function() {
          var args = (this && this.length > 0 ? this : []).concat(Array.prototype.slice.call(arguments, 0))
          return r[method].apply(null, args)
        }
      }
      , s = integrate('serialize')
      , sa = integrate('serializeArray')
  
    $.ender({
        ajax: r
      , serialize: s
      , serializeArray: sa
      , toQueryString: r.toQueryString
    })
  
    $.ender({
        serialize: s
      , serializeArray: sa
    }, true)
  }(ender);
  

  provide("reqwest/ender-bridge", module.exports);
  provide("reqwest/ender-bridge", module.exports);
  $.ender(module.exports);
}(global));

// ender:underscore as underscore
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  //     Underscore.js 1.3.1
  //     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
  //     Underscore is freely distributable under the MIT license.
  //     Portions of Underscore are inspired or borrowed from Prototype,
  //     Oliver Steele's Functional, and John Resig's Micro-Templating.
  //     For all details and documentation:
  //     http://documentcloud.github.com/underscore
  
  (function() {
  
    // Baseline setup
    // --------------
  
    // Establish the root object, `window` in the browser, or `global` on the server.
    var root = this;
  
    // Save the previous value of the `_` variable.
    var previousUnderscore = root._;
  
    // Establish the object that gets returned to break out of a loop iteration.
    var breaker = {};
  
    // Save bytes in the minified (but not gzipped) version:
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
  
    // Create quick reference variables for speed access to core prototypes.
    var slice            = ArrayProto.slice,
        unshift          = ArrayProto.unshift,
        toString         = ObjProto.toString,
        hasOwnProperty   = ObjProto.hasOwnProperty;
  
    // All **ECMAScript 5** native function implementations that we hope to use
    // are declared here.
    var
      nativeForEach      = ArrayProto.forEach,
      nativeMap          = ArrayProto.map,
      nativeReduce       = ArrayProto.reduce,
      nativeReduceRight  = ArrayProto.reduceRight,
      nativeFilter       = ArrayProto.filter,
      nativeEvery        = ArrayProto.every,
      nativeSome         = ArrayProto.some,
      nativeIndexOf      = ArrayProto.indexOf,
      nativeLastIndexOf  = ArrayProto.lastIndexOf,
      nativeIsArray      = Array.isArray,
      nativeKeys         = Object.keys,
      nativeBind         = FuncProto.bind;
  
    // Create a safe reference to the Underscore object for use below.
    var _ = function(obj) { return new wrapper(obj); };
  
    // Export the Underscore object for **Node.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `_` as a global object via a string identifier,
    // for Closure Compiler "advanced" mode.
    if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = _;
      }
      exports._ = _;
    } else {
      root['_'] = _;
    }
  
    // Current version.
    _.VERSION = '1.3.1';
  
    // Collection Functions
    // --------------------
  
    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles objects with the built-in `forEach`, arrays, and raw objects.
    // Delegates to **ECMAScript 5**'s native `forEach` if available.
    var each = _.each = _.forEach = function(obj, iterator, context) {
      if (obj == null) return;
      if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
        }
      } else {
        for (var key in obj) {
          if (_.has(obj, key)) {
            if (iterator.call(context, obj[key], key, obj) === breaker) return;
          }
        }
      }
    };
  
    // Return the results of applying the iterator to each element.
    // Delegates to **ECMAScript 5**'s native `map` if available.
    _.map = _.collect = function(obj, iterator, context) {
      var results = [];
      if (obj == null) return results;
      if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
      each(obj, function(value, index, list) {
        results[results.length] = iterator.call(context, value, index, list);
      });
      if (obj.length === +obj.length) results.length = obj.length;
      return results;
    };
  
    // **Reduce** builds up a single result from a list of values, aka `inject`,
    // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
    _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
      var initial = arguments.length > 2;
      if (obj == null) obj = [];
      if (nativeReduce && obj.reduce === nativeReduce) {
        if (context) iterator = _.bind(iterator, context);
        return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
      }
      each(obj, function(value, index, list) {
        if (!initial) {
          memo = value;
          initial = true;
        } else {
          memo = iterator.call(context, memo, value, index, list);
        }
      });
      if (!initial) throw new TypeError('Reduce of empty array with no initial value');
      return memo;
    };
  
    // The right-associative version of reduce, also known as `foldr`.
    // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
    _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
      var initial = arguments.length > 2;
      if (obj == null) obj = [];
      if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
        if (context) iterator = _.bind(iterator, context);
        return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
      }
      var reversed = _.toArray(obj).reverse();
      if (context && !initial) iterator = _.bind(iterator, context);
      return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
    };
  
    // Return the first value which passes a truth test. Aliased as `detect`.
    _.find = _.detect = function(obj, iterator, context) {
      var result;
      any(obj, function(value, index, list) {
        if (iterator.call(context, value, index, list)) {
          result = value;
          return true;
        }
      });
      return result;
    };
  
    // Return all the elements that pass a truth test.
    // Delegates to **ECMAScript 5**'s native `filter` if available.
    // Aliased as `select`.
    _.filter = _.select = function(obj, iterator, context) {
      var results = [];
      if (obj == null) return results;
      if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
      each(obj, function(value, index, list) {
        if (iterator.call(context, value, index, list)) results[results.length] = value;
      });
      return results;
    };
  
    // Return all the elements for which a truth test fails.
    _.reject = function(obj, iterator, context) {
      var results = [];
      if (obj == null) return results;
      each(obj, function(value, index, list) {
        if (!iterator.call(context, value, index, list)) results[results.length] = value;
      });
      return results;
    };
  
    // Determine whether all of the elements match a truth test.
    // Delegates to **ECMAScript 5**'s native `every` if available.
    // Aliased as `all`.
    _.every = _.all = function(obj, iterator, context) {
      var result = true;
      if (obj == null) return result;
      if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
      each(obj, function(value, index, list) {
        if (!(result = result && iterator.call(context, value, index, list))) return breaker;
      });
      return result;
    };
  
    // Determine if at least one element in the object matches a truth test.
    // Delegates to **ECMAScript 5**'s native `some` if available.
    // Aliased as `any`.
    var any = _.some = _.any = function(obj, iterator, context) {
      iterator || (iterator = _.identity);
      var result = false;
      if (obj == null) return result;
      if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
      each(obj, function(value, index, list) {
        if (result || (result = iterator.call(context, value, index, list))) return breaker;
      });
      return !!result;
    };
  
    // Determine if a given value is included in the array or object using `===`.
    // Aliased as `contains`.
    _.include = _.contains = function(obj, target) {
      var found = false;
      if (obj == null) return found;
      if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
      found = any(obj, function(value) {
        return value === target;
      });
      return found;
    };
  
    // Invoke a method (with arguments) on every item in a collection.
    _.invoke = function(obj, method) {
      var args = slice.call(arguments, 2);
      return _.map(obj, function(value) {
        return (_.isFunction(method) ? method || value : value[method]).apply(value, args);
      });
    };
  
    // Convenience version of a common use case of `map`: fetching a property.
    _.pluck = function(obj, key) {
      return _.map(obj, function(value){ return value[key]; });
    };
  
    // Return the maximum element or (element-based computation).
    _.max = function(obj, iterator, context) {
      if (!iterator && _.isArray(obj)) return Math.max.apply(Math, obj);
      if (!iterator && _.isEmpty(obj)) return -Infinity;
      var result = {computed : -Infinity};
      each(obj, function(value, index, list) {
        var computed = iterator ? iterator.call(context, value, index, list) : value;
        computed >= result.computed && (result = {value : value, computed : computed});
      });
      return result.value;
    };
  
    // Return the minimum element (or element-based computation).
    _.min = function(obj, iterator, context) {
      if (!iterator && _.isArray(obj)) return Math.min.apply(Math, obj);
      if (!iterator && _.isEmpty(obj)) return Infinity;
      var result = {computed : Infinity};
      each(obj, function(value, index, list) {
        var computed = iterator ? iterator.call(context, value, index, list) : value;
        computed < result.computed && (result = {value : value, computed : computed});
      });
      return result.value;
    };
  
    // Shuffle an array.
    _.shuffle = function(obj) {
      var shuffled = [], rand;
      each(obj, function(value, index, list) {
        if (index == 0) {
          shuffled[0] = value;
        } else {
          rand = Math.floor(Math.random() * (index + 1));
          shuffled[index] = shuffled[rand];
          shuffled[rand] = value;
        }
      });
      return shuffled;
    };
  
    // Sort the object's values by a criterion produced by an iterator.
    _.sortBy = function(obj, iterator, context) {
      return _.pluck(_.map(obj, function(value, index, list) {
        return {
          value : value,
          criteria : iterator.call(context, value, index, list)
        };
      }).sort(function(left, right) {
        var a = left.criteria, b = right.criteria;
        return a < b ? -1 : a > b ? 1 : 0;
      }), 'value');
    };
  
    // Groups the object's values by a criterion. Pass either a string attribute
    // to group by, or a function that returns the criterion.
    _.groupBy = function(obj, val) {
      var result = {};
      var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
      each(obj, function(value, index) {
        var key = iterator(value, index);
        (result[key] || (result[key] = [])).push(value);
      });
      return result;
    };
  
    // Use a comparator function to figure out at what index an object should
    // be inserted so as to maintain order. Uses binary search.
    _.sortedIndex = function(array, obj, iterator) {
      iterator || (iterator = _.identity);
      var low = 0, high = array.length;
      while (low < high) {
        var mid = (low + high) >> 1;
        iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
      }
      return low;
    };
  
    // Safely convert anything iterable into a real, live array.
    _.toArray = function(iterable) {
      if (!iterable)                return [];
      if (iterable.toArray)         return iterable.toArray();
      if (_.isArray(iterable))      return slice.call(iterable);
      if (_.isArguments(iterable))  return slice.call(iterable);
      return _.values(iterable);
    };
  
    // Return the number of elements in an object.
    _.size = function(obj) {
      return _.toArray(obj).length;
    };
  
    // Array Functions
    // ---------------
  
    // Get the first element of an array. Passing **n** will return the first N
    // values in the array. Aliased as `head`. The **guard** check allows it to work
    // with `_.map`.
    _.first = _.head = function(array, n, guard) {
      return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
    };
  
    // Returns everything but the last entry of the array. Especcialy useful on
    // the arguments object. Passing **n** will return all the values in
    // the array, excluding the last N. The **guard** check allows it to work with
    // `_.map`.
    _.initial = function(array, n, guard) {
      return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
    };
  
    // Get the last element of an array. Passing **n** will return the last N
    // values in the array. The **guard** check allows it to work with `_.map`.
    _.last = function(array, n, guard) {
      if ((n != null) && !guard) {
        return slice.call(array, Math.max(array.length - n, 0));
      } else {
        return array[array.length - 1];
      }
    };
  
    // Returns everything but the first entry of the array. Aliased as `tail`.
    // Especially useful on the arguments object. Passing an **index** will return
    // the rest of the values in the array from that index onward. The **guard**
    // check allows it to work with `_.map`.
    _.rest = _.tail = function(array, index, guard) {
      return slice.call(array, (index == null) || guard ? 1 : index);
    };
  
    // Trim out all falsy values from an array.
    _.compact = function(array) {
      return _.filter(array, function(value){ return !!value; });
    };
  
    // Return a completely flattened version of an array.
    _.flatten = function(array, shallow) {
      return _.reduce(array, function(memo, value) {
        if (_.isArray(value)) return memo.concat(shallow ? value : _.flatten(value));
        memo[memo.length] = value;
        return memo;
      }, []);
    };
  
    // Return a version of the array that does not contain the specified value(s).
    _.without = function(array) {
      return _.difference(array, slice.call(arguments, 1));
    };
  
    // Produce a duplicate-free version of the array. If the array has already
    // been sorted, you have the option of using a faster algorithm.
    // Aliased as `unique`.
    _.uniq = _.unique = function(array, isSorted, iterator) {
      var initial = iterator ? _.map(array, iterator) : array;
      var result = [];
      _.reduce(initial, function(memo, el, i) {
        if (0 == i || (isSorted === true ? _.last(memo) != el : !_.include(memo, el))) {
          memo[memo.length] = el;
          result[result.length] = array[i];
        }
        return memo;
      }, []);
      return result;
    };
  
    // Produce an array that contains the union: each distinct element from all of
    // the passed-in arrays.
    _.union = function() {
      return _.uniq(_.flatten(arguments, true));
    };
  
    // Produce an array that contains every item shared between all the
    // passed-in arrays. (Aliased as "intersect" for back-compat.)
    _.intersection = _.intersect = function(array) {
      var rest = slice.call(arguments, 1);
      return _.filter(_.uniq(array), function(item) {
        return _.every(rest, function(other) {
          return _.indexOf(other, item) >= 0;
        });
      });
    };
  
    // Take the difference between one array and a number of other arrays.
    // Only the elements present in just the first array will remain.
    _.difference = function(array) {
      var rest = _.flatten(slice.call(arguments, 1));
      return _.filter(array, function(value){ return !_.include(rest, value); });
    };
  
    // Zip together multiple lists into a single array -- elements that share
    // an index go together.
    _.zip = function() {
      var args = slice.call(arguments);
      var length = _.max(_.pluck(args, 'length'));
      var results = new Array(length);
      for (var i = 0; i < length; i++) results[i] = _.pluck(args, "" + i);
      return results;
    };
  
    // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
    // we need this function. Return the position of the first occurrence of an
    // item in an array, or -1 if the item is not included in the array.
    // Delegates to **ECMAScript 5**'s native `indexOf` if available.
    // If the array is large and already in sort order, pass `true`
    // for **isSorted** to use binary search.
    _.indexOf = function(array, item, isSorted) {
      if (array == null) return -1;
      var i, l;
      if (isSorted) {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
      if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
      for (i = 0, l = array.length; i < l; i++) if (i in array && array[i] === item) return i;
      return -1;
    };
  
    // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
    _.lastIndexOf = function(array, item) {
      if (array == null) return -1;
      if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
      var i = array.length;
      while (i--) if (i in array && array[i] === item) return i;
      return -1;
    };
  
    // Generate an integer Array containing an arithmetic progression. A port of
    // the native Python `range()` function. See
    // [the Python documentation](http://docs.python.org/library/functions.html#range).
    _.range = function(start, stop, step) {
      if (arguments.length <= 1) {
        stop = start || 0;
        start = 0;
      }
      step = arguments[2] || 1;
  
      var len = Math.max(Math.ceil((stop - start) / step), 0);
      var idx = 0;
      var range = new Array(len);
  
      while(idx < len) {
        range[idx++] = start;
        start += step;
      }
  
      return range;
    };
  
    // Function (ahem) Functions
    // ------------------
  
    // Reusable constructor function for prototype setting.
    var ctor = function(){};
  
    // Create a function bound to a given object (assigning `this`, and arguments,
    // optionally). Binding with arguments is also known as `curry`.
    // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
    // We check for `func.bind` first, to fail fast when `func` is undefined.
    _.bind = function bind(func, context) {
      var bound, args;
      if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
      if (!_.isFunction(func)) throw new TypeError;
      args = slice.call(arguments, 2);
      return bound = function() {
        if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
        ctor.prototype = func.prototype;
        var self = new ctor;
        var result = func.apply(self, args.concat(slice.call(arguments)));
        if (Object(result) === result) return result;
        return self;
      };
    };
  
    // Bind all of an object's methods to that object. Useful for ensuring that
    // all callbacks defined on an object belong to it.
    _.bindAll = function(obj) {
      var funcs = slice.call(arguments, 1);
      if (funcs.length == 0) funcs = _.functions(obj);
      each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
      return obj;
    };
  
    // Memoize an expensive function by storing its results.
    _.memoize = function(func, hasher) {
      var memo = {};
      hasher || (hasher = _.identity);
      return function() {
        var key = hasher.apply(this, arguments);
        return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
      };
    };
  
    // Delays a function for the given number of milliseconds, and then calls
    // it with the arguments supplied.
    _.delay = function(func, wait) {
      var args = slice.call(arguments, 2);
      return setTimeout(function(){ return func.apply(func, args); }, wait);
    };
  
    // Defers a function, scheduling it to run after the current call stack has
    // cleared.
    _.defer = function(func) {
      return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
    };
  
    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time.
    _.throttle = function(func, wait) {
      var context, args, timeout, throttling, more;
      var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
      return function() {
        context = this; args = arguments;
        var later = function() {
          timeout = null;
          if (more) func.apply(context, args);
          whenDone();
        };
        if (!timeout) timeout = setTimeout(later, wait);
        if (throttling) {
          more = true;
        } else {
          func.apply(context, args);
        }
        whenDone();
        throttling = true;
      };
    };
  
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds.
    _.debounce = function(func, wait) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };
  
    // Returns a function that will be executed at most one time, no matter how
    // often you call it. Useful for lazy initialization.
    _.once = function(func) {
      var ran = false, memo;
      return function() {
        if (ran) return memo;
        ran = true;
        return memo = func.apply(this, arguments);
      };
    };
  
    // Returns the first function passed as an argument to the second,
    // allowing you to adjust arguments, run code before and after, and
    // conditionally execute the original function.
    _.wrap = function(func, wrapper) {
      return function() {
        var args = [func].concat(slice.call(arguments, 0));
        return wrapper.apply(this, args);
      };
    };
  
    // Returns a function that is the composition of a list of functions, each
    // consuming the return value of the function that follows.
    _.compose = function() {
      var funcs = arguments;
      return function() {
        var args = arguments;
        for (var i = funcs.length - 1; i >= 0; i--) {
          args = [funcs[i].apply(this, args)];
        }
        return args[0];
      };
    };
  
    // Returns a function that will only be executed after being called N times.
    _.after = function(times, func) {
      if (times <= 0) return func();
      return function() {
        if (--times < 1) { return func.apply(this, arguments); }
      };
    };
  
    // Object Functions
    // ----------------
  
    // Retrieve the names of an object's properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`
    _.keys = nativeKeys || function(obj) {
      if (obj !== Object(obj)) throw new TypeError('Invalid object');
      var keys = [];
      for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
      return keys;
    };
  
    // Retrieve the values of an object's properties.
    _.values = function(obj) {
      return _.map(obj, _.identity);
    };
  
    // Return a sorted list of the function names available on the object.
    // Aliased as `methods`
    _.functions = _.methods = function(obj) {
      var names = [];
      for (var key in obj) {
        if (_.isFunction(obj[key])) names.push(key);
      }
      return names.sort();
    };
  
    // Extend a given object with all the properties in passed-in object(s).
    _.extend = function(obj) {
      each(slice.call(arguments, 1), function(source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      });
      return obj;
    };
  
    // Fill in a given object with default properties.
    _.defaults = function(obj) {
      each(slice.call(arguments, 1), function(source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      });
      return obj;
    };
  
    // Create a (shallow-cloned) duplicate of an object.
    _.clone = function(obj) {
      if (!_.isObject(obj)) return obj;
      return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };
  
    // Invokes interceptor with the obj, and then returns obj.
    // The primary purpose of this method is to "tap into" a method chain, in
    // order to perform operations on intermediate results within the chain.
    _.tap = function(obj, interceptor) {
      interceptor(obj);
      return obj;
    };
  
    // Internal recursive comparison function.
    function eq(a, b, stack) {
      // Identical objects are equal. `0 === -0`, but they aren't identical.
      // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
      if (a === b) return a !== 0 || 1 / a == 1 / b;
      // A strict comparison is necessary because `null == undefined`.
      if (a == null || b == null) return a === b;
      // Unwrap any wrapped objects.
      if (a._chain) a = a._wrapped;
      if (b._chain) b = b._wrapped;
      // Invoke a custom `isEqual` method if one is provided.
      if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
      if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
      // Compare `[[Class]]` names.
      var className = toString.call(a);
      if (className != toString.call(b)) return false;
      switch (className) {
        // Strings, numbers, dates, and booleans are compared by value.
        case '[object String]':
          // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
          // equivalent to `new String("5")`.
          return a == String(b);
        case '[object Number]':
          // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
          // other numeric values.
          return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
        case '[object Date]':
        case '[object Boolean]':
          // Coerce dates and booleans to numeric primitive values. Dates are compared by their
          // millisecond representations. Note that invalid dates with millisecond representations
          // of `NaN` are not equivalent.
          return +a == +b;
        // RegExps are compared by their source patterns and flags.
        case '[object RegExp]':
          return a.source == b.source &&
                 a.global == b.global &&
                 a.multiline == b.multiline &&
                 a.ignoreCase == b.ignoreCase;
      }
      if (typeof a != 'object' || typeof b != 'object') return false;
      // Assume equality for cyclic structures. The algorithm for detecting cyclic
      // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
      var length = stack.length;
      while (length--) {
        // Linear search. Performance is inversely proportional to the number of
        // unique nested structures.
        if (stack[length] == a) return true;
      }
      // Add the first object to the stack of traversed objects.
      stack.push(a);
      var size = 0, result = true;
      // Recursively compare objects and arrays.
      if (className == '[object Array]') {
        // Compare array lengths to determine if a deep comparison is necessary.
        size = a.length;
        result = size == b.length;
        if (result) {
          // Deep compare the contents, ignoring non-numeric properties.
          while (size--) {
            // Ensure commutative equality for sparse arrays.
            if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
          }
        }
      } else {
        // Objects with different constructors are not equivalent.
        if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
        // Deep compare objects.
        for (var key in a) {
          if (_.has(a, key)) {
            // Count the expected number of properties.
            size++;
            // Deep compare each member.
            if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
          }
        }
        // Ensure that both objects contain the same number of properties.
        if (result) {
          for (key in b) {
            if (_.has(b, key) && !(size--)) break;
          }
          result = !size;
        }
      }
      // Remove the first object from the stack of traversed objects.
      stack.pop();
      return result;
    }
  
    // Perform a deep comparison to check if two objects are equal.
    _.isEqual = function(a, b) {
      return eq(a, b, []);
    };
  
    // Is a given array, string, or object empty?
    // An "empty" object has no enumerable own-properties.
    _.isEmpty = function(obj) {
      if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
      for (var key in obj) if (_.has(obj, key)) return false;
      return true;
    };
  
    // Is a given value a DOM element?
    _.isElement = function(obj) {
      return !!(obj && obj.nodeType == 1);
    };
  
    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    _.isArray = nativeIsArray || function(obj) {
      return toString.call(obj) == '[object Array]';
    };
  
    // Is a given variable an object?
    _.isObject = function(obj) {
      return obj === Object(obj);
    };
  
    // Is a given variable an arguments object?
    _.isArguments = function(obj) {
      return toString.call(obj) == '[object Arguments]';
    };
    if (!_.isArguments(arguments)) {
      _.isArguments = function(obj) {
        return !!(obj && _.has(obj, 'callee'));
      };
    }
  
    // Is a given value a function?
    _.isFunction = function(obj) {
      return toString.call(obj) == '[object Function]';
    };
  
    // Is a given value a string?
    _.isString = function(obj) {
      return toString.call(obj) == '[object String]';
    };
  
    // Is a given value a number?
    _.isNumber = function(obj) {
      return toString.call(obj) == '[object Number]';
    };
  
    // Is the given value `NaN`?
    _.isNaN = function(obj) {
      // `NaN` is the only value for which `===` is not reflexive.
      return obj !== obj;
    };
  
    // Is a given value a boolean?
    _.isBoolean = function(obj) {
      return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
    };
  
    // Is a given value a date?
    _.isDate = function(obj) {
      return toString.call(obj) == '[object Date]';
    };
  
    // Is the given value a regular expression?
    _.isRegExp = function(obj) {
      return toString.call(obj) == '[object RegExp]';
    };
  
    // Is a given value equal to null?
    _.isNull = function(obj) {
      return obj === null;
    };
  
    // Is a given variable undefined?
    _.isUndefined = function(obj) {
      return obj === void 0;
    };
  
    // Has own property?
    _.has = function(obj, key) {
      return hasOwnProperty.call(obj, key);
    };
  
    // Utility Functions
    // -----------------
  
    // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
    // previous owner. Returns a reference to the Underscore object.
    _.noConflict = function() {
      root._ = previousUnderscore;
      return this;
    };
  
    // Keep the identity function around for default iterators.
    _.identity = function(value) {
      return value;
    };
  
    // Run a function **n** times.
    _.times = function (n, iterator, context) {
      for (var i = 0; i < n; i++) iterator.call(context, i);
    };
  
    // Escape a string for HTML interpolation.
    _.escape = function(string) {
      return (''+string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
    };
  
    // Add your own custom functions to the Underscore object, ensuring that
    // they're correctly added to the OOP wrapper as well.
    _.mixin = function(obj) {
      each(_.functions(obj), function(name){
        addToWrapper(name, _[name] = obj[name]);
      });
    };
  
    // Generate a unique integer id (unique within the entire client session).
    // Useful for temporary DOM ids.
    var idCounter = 0;
    _.uniqueId = function(prefix) {
      var id = idCounter++;
      return prefix ? prefix + id : id;
    };
  
    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    _.templateSettings = {
      evaluate    : /<%([\s\S]+?)%>/g,
      interpolate : /<%=([\s\S]+?)%>/g,
      escape      : /<%-([\s\S]+?)%>/g
    };
  
    // When customizing `templateSettings`, if you don't want to define an
    // interpolation, evaluation or escaping regex, we need one that is
    // guaranteed not to match.
    var noMatch = /.^/;
  
    // Within an interpolation, evaluation, or escaping, remove HTML escaping
    // that had been previously added.
    var unescape = function(code) {
      return code.replace(/\\\\/g, '\\').replace(/\\'/g, "'");
    };
  
    // JavaScript micro-templating, similar to John Resig's implementation.
    // Underscore templating handles arbitrary delimiters, preserves whitespace,
    // and correctly escapes quotes within interpolated code.
    _.template = function(str, data) {
      var c  = _.templateSettings;
      var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
        'with(obj||{}){__p.push(\'' +
        str.replace(/\\/g, '\\\\')
           .replace(/'/g, "\\'")
           .replace(c.escape || noMatch, function(match, code) {
             return "',_.escape(" + unescape(code) + "),'";
           })
           .replace(c.interpolate || noMatch, function(match, code) {
             return "'," + unescape(code) + ",'";
           })
           .replace(c.evaluate || noMatch, function(match, code) {
             return "');" + unescape(code).replace(/[\r\n\t]/g, ' ') + ";__p.push('";
           })
           .replace(/\r/g, '\\r')
           .replace(/\n/g, '\\n')
           .replace(/\t/g, '\\t')
           + "');}return __p.join('');";
      var func = new Function('obj', '_', tmpl);
      if (data) return func(data, _);
      return function(data) {
        return func.call(this, data, _);
      };
    };
  
    // Add a "chain" function, which will delegate to the wrapper.
    _.chain = function(obj) {
      return _(obj).chain();
    };
  
    // The OOP Wrapper
    // ---------------
  
    // If Underscore is called as a function, it returns a wrapped object that
    // can be used OO-style. This wrapper holds altered versions of all the
    // underscore functions. Wrapped objects may be chained.
    var wrapper = function(obj) { this._wrapped = obj; };
  
    // Expose `wrapper.prototype` as `_.prototype`
    _.prototype = wrapper.prototype;
  
    // Helper function to continue chaining intermediate results.
    var result = function(obj, chain) {
      return chain ? _(obj).chain() : obj;
    };
  
    // A method to easily add functions to the OOP wrapper.
    var addToWrapper = function(name, func) {
      wrapper.prototype[name] = function() {
        var args = slice.call(arguments);
        unshift.call(args, this._wrapped);
        return result(func.apply(_, args), this._chain);
      };
    };
  
    // Add all of the Underscore functions to the wrapper object.
    _.mixin(_);
  
    // Add all mutator Array functions to the wrapper.
    each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
      var method = ArrayProto[name];
      wrapper.prototype[name] = function() {
        var wrapped = this._wrapped;
        method.apply(wrapped, arguments);
        var length = wrapped.length;
        if ((name == 'shift' || name == 'splice') && length === 0) delete wrapped[0];
        return result(wrapped, this._chain);
      };
    });
  
    // Add all accessor Array functions to the wrapper.
    each(['concat', 'join', 'slice'], function(name) {
      var method = ArrayProto[name];
      wrapper.prototype[name] = function() {
        return result(method.apply(this._wrapped, arguments), this._chain);
      };
    });
  
    // Start chaining a wrapped Underscore object.
    wrapper.prototype.chain = function() {
      this._chain = true;
      return this;
    };
  
    // Extracts the result from a wrapped and chained object.
    wrapper.prototype.value = function() {
      return this._wrapped;
    };
  
  }).call(this);
  

  provide("underscore", module.exports);
  provide("underscore", module.exports);
  $.ender(module.exports);
}(global));

// ender:eventhub as eventhub
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
  	'use strict';
  
  	var events,
  		EventEmitter,
  		generalPurpose = '_eventHub';
  
  	try {
  		events = require('events');
  	} catch (e) {
  		events = require('events.node');
  	}
  
  	EventEmitter = events.EventEmitter;
  
  	/*
  	 * No dependencies, generic event hub.
  	 * This allows event emitters to be managed globally, without having a global.
  	 */
  	function EventHub() {
  		this.emitters = {};
  		this.emitters[generalPurpose] = new EventEmitter();
  	}
  
  	/*
  	 * Listens to a resource for a specified event.
  	 * If no resource is specified (null, or left out), global is assumed
  	 *
  	 * addListener([resource,] event, cb, [once=false])
  	 *
  	 * @param resource- the resource to listen to (optional)
  	 * @param event- the event to listen to (required)
  	 * @param cb- callback to call when the event has fired (required)
  	 * @param once- true if the callback should be called only once; (optional)
  	 * @return false if resource doesn't exist or true if success
  	 */
  	EventHub.prototype.addListener = function (resource, event, cb, once) {
  		if (typeof event === 'function') {
  			once = cb;
  			cb = event;
  			event = resource;
  			resource = generalPurpose;
  		}
  
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		if (!this.emitters[resource]) {
  			return false;
  		}
  
  		if (once) {
  			this.emitters[resource].once(event, cb);
  		} else {
  			this.emitters[resource].on(event, cb);
  		}
  
  		return true;
  	};
  	EventHub.prototype.on = EventHub.prototype.addListener;
  
  	EventHub.prototype.once = function (resource, event, cb) {
  		if (typeof event === 'function') {
  			cb = event;
  			event = resource;
  			resource = generalPurpose;
  		}
  
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		return this.addListener(resource, event, cb, true);
  	};
  
  	/*
  	 * Remove a listener. This is only valid for permanent listeners.
  	 * 
  	 * removeListener([resource,] event, listener)
  	 *
  	 * @param resource- resource to remove listener from; defaults to the global listener
  	 * @param event- event listened to
  	 * @param listener- callback given to addListener
  	 * @return false if no resource exists, true otherwise
  	 */
  	EventHub.prototype.removeListener = function (resource, event, listener) {
  		if (arguments.length < 3) {
  			listener = event;
  			event = resource;
  			resource = generalPurpose;
  		}
  
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		if (!this.emitters[resource]) {
  			return false;
  		}
  
  		this.emitters[resource].removeListener(event, listener);
  		return true;
  	};
  
  	EventHub.prototype.removeAllListeners = function (resource, event) {
  		if (!event) {
  			event = resource;
  			resource = generalPurpose;
  		}
  
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		this.emitters[resource].removeAllListeners(event);
  	};
  
  	EventHub.prototype.setMaxListeners = function (resource, n) {
  		if (arguments.length > 1) {
  			n = resource;
  			resource = generalPurpose;
  		}
  
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		this.emitters[resource].setMaxListeners(n);
  	};
  
  	EventHub.prototype.listeners = function (resource, event) {
  		if (!event) {
  			event = resource;
  			resource = generalPurpose;
  		}
  
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		return this.emitters[resource].listeners(event);
  	};
  
  	/*
  	 * Registers an EventEmitter.
  	 * 
  	 * @param resource- the resource being watched (string)
  	 * @param emitter- an EventEmitter that can accept events
  	 * @return false if the resource exists or true if success
  	 */
  	EventHub.prototype.register = function (resource, emitter) {
  		if (this.emitters[resource]) {
  			return false;
  		}
  
  		this.emitters[resource] = emitter;
  
  		this.emit('newResource', resource, emitter);
  		return true;
  	};
  
  	EventHub.prototype.remove = function (resource) {
  		if (this.emitters[resource]) {
  			delete this.emitters[resource];
  		}
  	};
  
  	/*
  	 * Emits an general event.
  	 */
  	EventHub.prototype.emit = function () {
  		var emitter = this.emitters[generalPurpose];
  		
  		emitter.emit.apply(emitter, arguments);
  	};
  
  	EventHub.prototype.get = function (resource) {
  		if (!resource) {
  			resource = generalPurpose;
  		}
  
  		return this.emitters[resource];
  	};
  
  	module.exports = new EventHub();
  }());
  

  provide("eventhub", module.exports);
  provide("eventhub", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/utm/help as coordinator/lib/utm/help
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS = {};
  
      /*
       * Finds the set for a given zone.
       *
       * There are six unique sets, corresponding to individual grid numbers in 
       * sets 1-6, 7-12, 13-18, etc. Set 1 is the same as sets 7, 13, ..; Set 2 
       * is the same as sets 8, 14, ..
       *
       * See p. 10 of the "United States National Grid" white paper.
       */
      function findSet (zoneNum) {
          var tReturn;
  
          zoneNum = parseInt(zoneNum, 10);
          zoneNum = zoneNum % 6;
  
          switch (zoneNum) {
              case 0:
                  tReturn = 6;
                  break;
  
              case 1:
                  tReturn = 1; 
                  break;
  
              case 2:
                  tReturn = 2;
                  break;
  
              case 3:
                  tReturn = 3;
                  break;
  
              case 4:
                  tReturn = 4;
                  break;
  
              case 5:
                  tReturn = 5;
                  break;
  
              default:
                  tReturn = -1;
                  break;
          }
  
          return tReturn;
      }
  
      /*
       * Retrieve the Square Identification (two-character letter code), for the
       * given row, column and set identifier (set refers to the zone set: 
       * zones 1-6 have a unique set of square identifiers; these identifiers are 
       * repeated for zones 7-12, etc.) 
  
       * See p. 10 of the "United States National Grid" white paper for a diagram
       * of the zone sets.
       */
      function lettersHelper(set, row, col) {
          var l1, l2;
  
          // handle case of last row
          if (row === 0) {
              row = CONSTANTS.GRIDSQUARE_SET_ROW_SIZE - 1;
          } else {
              row -= 1;
          }
  
          // handle case of last column
          if (col === 0) {
              col = CONSTANTS.GRIDSQUARE_SET_COL_SIZE - 1;
          } else {
              col -= 1;
          }
  
          switch (set) {
              case 1:
                  l1 = "ABCDEFGH";              // column ids
                  l2 = "ABCDEFGHJKLMNPQRSTUV";  // row ids
                  break;
  
              case 2:
                  l1 = "JKLMNPQR";
                  l2 = "FGHJKLMNPQRSTUVABCDE";
                  break;
  
              case 3:
                  l1 = "STUVWXYZ";
                  l2 = "ABCDEFGHJKLMNPQRSTUV";
                  break;
  
              case 4:
                  l1 = "ABCDEFGH";
                  l2 = "FGHJKLMNPQRSTUVABCDE";
                  break;
  
              case 5:
                  l1 = "JKLMNPQR";
                  l2 = "ABCDEFGHJKLMNPQRSTUV";
                   break;
  
              case 6:
                  l1 = "STUVWXYZ";
                  l2 = "FGHJKLMNPQRSTUVABCDE";
                  break;
          }
  
          return l1.charAt(col) + l2.charAt(row);
      }
  
      /*
       * Retrieves the square identification for a given coordinate pair & zone.
       * See "lettersHelper" function documentation for more details.
       */
      function findGridLetters(zoneNum, northing, easting) {
          var north_1m, east_1m, row, col;
  
          zoneNum  = parseInt(zoneNum, 10);
          northing = parseFloat(northing);
          easting  = parseFloat(easting);
          row = 1;
  
          // northing coordinate to single-meter precision
          north_1m = Math.round(northing);
  
          // Get the row position for the square identifier that contains the point
          while (north_1m >= CONSTANTS.BLOCK_SIZE) {
              north_1m = north_1m - CONSTANTS.BLOCK_SIZE;
              row += 1;
          }
  
          // cycle repeats (wraps) after 20 rows
          row = row % CONSTANTS.GRIDSQUARE_SET_ROW_SIZE;
          col = 0;
  
          // easting coordinate to single-meter precision
          east_1m = Math.round(easting);
  
          // Get the column position for the square identifier that contains the point
          while (east_1m >= CONSTANTS.BLOCK_SIZE){
              east_1m = east_1m - CONSTANTS.BLOCK_SIZE;
              col += 1;
          }
  
          // cycle repeats (wraps) after 8 columns
          col = col % CONSTANTS.GRIDSQUARE_SET_COL_SIZE;
  
          return lettersHelper(findSet(zoneNum), row, col);
      }
  
      module.exports = function (constants) {
          CONSTANTS = constants;
  
          return {
              findGridLetters: findGridLetters
          };
      };
  }());
  

  provide("coordinator/lib/utm/help", module.exports);
  provide("coordinator/lib/utm/help", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/constants as coordinator/lib/constants
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var DEG_2_RAD = Math.PI / 180,
          RAD_2_DEG = 180.0 / Math.PI,
          EQUATORIAL_RADIUS,
          ECC_SQUARED,
          ECC_PRIME_SQUARED,
          IS_NAD83_DATUM = true,
          EASTING_OFFSET = 500000.0,
          NORTHING_OFFSET = 10000000.0,
          GRIDSQUARE_SET_COL_SIZE = 8,  // column width of grid square set
          GRIDSQUARE_SET_ROW_SIZE = 20, // row height of grid square set
          BLOCK_SIZE  = 100000, // size of square identifier (within grid zone designation),
          E1,
          k0 = 0.9996; // scale factor of central meridian
  
      // check for NAD83
      if (IS_NAD83_DATUM) {
          EQUATORIAL_RADIUS = 6378137.0; // GRS80 ellipsoid (meters)
          ECC_SQUARED = 0.006694380023; 
      } else {
          // else NAD27 datum is assumed
          EQUATORIAL_RADIUS = 6378206.4; // Clarke 1866 ellipsoid (meters)
          ECC_SQUARED = 0.006768658;
      }
  
      // variable used in inverse formulas (UTMtoLL function)
      E1 = (1 - Math.sqrt(1 - ECC_SQUARED)) / (1 + Math.sqrt(1 - ECC_SQUARED));
  
      ECC_PRIME_SQUARED = ECC_SQUARED / (1 - ECC_SQUARED);
  
      module.exports.DEG_2_RAD = DEG_2_RAD;
      module.exports.RAD_2_DEG = RAD_2_DEG;
      module.exports.EQUATORIAL_RADIUS = EQUATORIAL_RADIUS;
      module.exports.ECC_SQUARED = ECC_SQUARED;
      module.exports.ECC_PRIME_SQUARED = ECC_PRIME_SQUARED;
      module.exports.EASTING_OFFSET = EASTING_OFFSET;
      module.exports.NORTHING_OFFSET = NORTHING_OFFSET;
      module.exports.GRIDSQUARE_SET_COL_SIZE = GRIDSQUARE_SET_COL_SIZE;
      module.exports.GRIDSQUARE_SET_ROW_SIZE = GRIDSQUARE_SET_ROW_SIZE;
      module.exports.BLOCK_SIZE = BLOCK_SIZE;
      module.exports.E1 = E1;
      module.exports.k0 = k0;
  }());
  

  provide("coordinator/lib/constants", module.exports);
  provide("coordinator/lib/constants", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/utm/utmToLatLong as coordinator/lib/utm/utmToLatLong
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS = {};
  
      /*
       * Converts UTM coordinates to decimal degrees.
       *
       * Equations from USGS Bulletin 1532 (or USGS Professional Paper 1395)
       * East Longitudes are positive, West longitudes are negative. 
       * North latitudes are positive, South latitudes are negative.
       *
       * @param UTMNorthing- northing-m (numeric), eg. 432001.8  
       * @param UTMEasting- easting-m  (numeric), eg. 4000000.0
       * @param UTMZoneNumber- 6-deg longitudinal zone (numeric), eg. 18
       * @return Property with two properties, lat & lon
       */
      function utmToLatLong(UTMNorthing, UTMEasting, UTMZoneNumber) {
          var xUTM,
              yUTM,
              zoneNumber,
              lonOrigin,
              M, // M is the "true distance along the central meridian from the Equator to phi (latitude)
              mu,
              phi1Rad,
              phi1,
              N1,
              T1,
              C1,
              R1,
              D,
              lat,
              lon,
              ret = {};
  
          // remove 500,000 meter offset for longitude
          xUTM = parseFloat(UTMEasting) - CONSTANTS.EASTING_OFFSET; 
          yUTM = parseFloat(UTMNorthing);
          zoneNumber = parseInt(UTMZoneNumber, 10);
  
          // origin longitude for the zone (+3 puts origin in zone center) 
          lonOrigin = (zoneNumber - 1) * 6 - 180 + 3; 
  
          M = yUTM / CONSTANTS.k0;
          mu = M / ( CONSTANTS.EQUATORIAL_RADIUS * (1 - CONSTANTS.ECC_SQUARED / 4 - 3 * CONSTANTS.ECC_SQUARED * 
                          CONSTANTS.ECC_SQUARED / 64 - 5 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 256 ));
  
          // phi1 is the "footprint latitude" or the latitude at the central meridian which
          // has the same y coordinate as that of the point (phi (lat), lambda (lon) ).
          phi1Rad = mu + (3 * CONSTANTS.E1 / 2 - 27 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 / 32 ) * Math.sin( 2 * mu) + ( 21 * CONSTANTS.E1 * CONSTANTS.E1 / 16 - 55 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 / 32) * Math.sin( 4 * mu) + (151 * CONSTANTS.E1 * CONSTANTS.E1 * CONSTANTS.E1 / 96) * Math.sin(6 * mu);
          phi1 = phi1Rad * CONSTANTS.RAD_2_DEG;
  
          // Terms used in the conversion equations
          N1 = CONSTANTS.EQUATORIAL_RADIUS / Math.sqrt( 1 - CONSTANTS.ECC_SQUARED * Math.sin(phi1Rad) * 
                      Math.sin(phi1Rad));
          T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
          C1 = CONSTANTS.ECC_PRIME_SQUARED * Math.cos(phi1Rad) * Math.cos(phi1Rad);
          R1 = CONSTANTS.EQUATORIAL_RADIUS * (1 - CONSTANTS.ECC_SQUARED) / Math.pow(1 - CONSTANTS.ECC_SQUARED * 
                        Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
          D = xUTM / (N1 * CONSTANTS.k0);
  
          // Calculate latitude, in decimal degrees
          lat = phi1Rad - ( N1 * Math.tan(phi1Rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10
                * C1 - 4 * C1 * C1 - 9 * CONSTANTS.ECC_PRIME_SQUARED) * D * D * D * D / 24 + (61 + 90 * 
                  T1 + 298 * C1 + 45 * T1 * T1 - 252 * CONSTANTS.ECC_PRIME_SQUARED - 3 * C1 * C1) * D * D *
                  D * D * D * D / 720);
          lat = lat * CONSTANTS.RAD_2_DEG;
  
          // Calculate longitude, in decimal degrees
          lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * 
                    C1 * C1 + 8 * CONSTANTS.ECC_PRIME_SQUARED + 24 * T1 * T1) * D * D * D * D * D / 120) /
                    Math.cos(phi1Rad);
  
          lon = lonOrigin + lon * CONSTANTS.RAD_2_DEG;
  
          ret.latitude = lat;
          ret.longitude = lon;
  
          return ret;
      }
  
      module.exports = function (constants) {
          CONSTANTS = constants;
  
          return utmToLatLong;
      };
  }());
  

  provide("coordinator/lib/utm/utmToLatLong", module.exports);
  provide("coordinator/lib/utm/utmToLatLong", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/utm/utmToUsng as coordinator/lib/utm/utmToUsng
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var helpers =  require('coordinator/lib/utm/help'),
          CONSTANTS = {};
  
      /*
       * Converts a UTM coordinate to USNG:
       * 
       * @param coords- object with parts of a UTM coordinate
       * @param precision- How many decimal places (1-5) in USNG (default 5)
       * @param output- Format to output. Options include: 'string' and 'object'
       * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
       */
      function utmToUsng(coords, precision, output) {
          var utmEasting,
              utmNorthing,
              letters,
              usngNorthing,
              usngEasting,
              usng,
              i;
  
          if (typeof precision === 'string') {
              precision = parseInt(precision, 10);
          }
  
          precision = precision ? precision : 5;
  
          utmEasting = coords.easting;
          utmNorthing = coords.northing;
  
          // southern hemisphere case
          if (coords.hemisphere === 'S') {
              // Use offset for southern hemisphere
              utmNorthing += CONSTANTS.NORTHING_OFFSET; 
          }
  
          letters  = helpers.findGridLetters(coords.zoneNumber, utmNorthing, utmEasting);
          usngNorthing = Math.round(utmNorthing) % CONSTANTS.BLOCK_SIZE;
          usngEasting  = Math.round(utmEasting)  % CONSTANTS.BLOCK_SIZE;
  
          // added... truncate digits to achieve specified precision
          usngNorthing = Math.floor(usngNorthing / Math.pow(10,(5-precision)));
          usngEasting = Math.floor(usngEasting / Math.pow(10,(5-precision)));
  
          // REVISIT: Modify to incorporate dynamic precision ?
          for (i = String(usngEasting).length; i < precision; i += 1) {
               usngEasting = "0" + usngEasting;
          }
  
          for (i = String(usngNorthing).length; i < precision; i += 1) {
              usngNorthing = "0" + usngNorthing;
          }
  
          if (typeof output === 'string' && output === 'object') {
              usng = {
                  zone: coords.zoneNumber + coords.zoneLetter,
                  square: letters,
                  easting: usngEasting,
                  northing: usngNorthing
              };
          } else {
              usng = coords.zoneNumber + coords.zoneLetter + " " + letters + " " + 
                    usngEasting + " " + usngNorthing;
          }
  
          return usng;
      }
  
      module.exports = function (constants) {
          CONSTANTS = constants;
  
          helpers = helpers(constants);
  
          return utmToUsng;
      };
  }());
  

  provide("coordinator/lib/utm/utmToUsng", module.exports);
  provide("coordinator/lib/utm/utmToUsng", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/latlong/helpers as coordinator/lib/latlong/helpers
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS = {};
  
      /*
       * Finds the set for a given zone.
       *
       * There are six unique sets, corresponding to individual grid numbers in 
       * sets 1-6, 7-12, 13-18, etc. Set 1 is the same as sets 7, 13, ..; Set 2 
       * is the same as sets 8, 14, ..
       *
       * See p. 10 of the "United States National Grid" white paper.
       */
      function findSet (zoneNum) {
          var tReturn;
  
          zoneNum = parseInt(zoneNum, 10);
          zoneNum = zoneNum % 6;
  
          switch (zoneNum) {
              case 0:
                  tReturn = 6;
                  break;
  
              case 1:
                  tReturn = 1; 
                  break;
  
              case 2:
                  tReturn = 2;
                  break;
  
              case 3:
                  tReturn = 3;
                  break;
  
              case 4:
                  tReturn = 4;
                  break;
  
              case 5:
                  tReturn = 5;
                  break;
  
              default:
                  tReturn = -1;
                  break;
          }
  
          return tReturn;
      }
  
      /*
       * Retrieve the Square Identification (two-character letter code), for the
       * given row, column and set identifier (set refers to the zone set: 
       * zones 1-6 have a unique set of square identifiers; these identifiers are 
       * repeated for zones 7-12, etc.) 
  
       * See p. 10 of the "United States National Grid" white paper for a diagram
       * of the zone sets.
       */
      function lettersHelper(set, row, col) {
          var l1, l2;
  
          // handle case of last row
          if (row === 0) {
              row = CONSTANTS.GRIDSQUARE_SET_ROW_SIZE - 1;
          } else {
              row -= 1;
          }
  
          // handle case of last column
          if (col === 0) {
              col = CONSTANTS.GRIDSQUARE_SET_COL_SIZE - 1;
          } else {
              col -= 1;
          }
  
          switch (set) {
              case 1:
                  l1 = "ABCDEFGH";              // column ids
                  l2 = "ABCDEFGHJKLMNPQRSTUV";  // row ids
                  break;
  
              case 2:
                  l1 = "JKLMNPQR";
                  l2 = "FGHJKLMNPQRSTUVABCDE";
                  break;
  
              case 3:
                  l1 = "STUVWXYZ";
                  l2 = "ABCDEFGHJKLMNPQRSTUV";
                  break;
  
              case 4:
                  l1 = "ABCDEFGH";
                  l2 = "FGHJKLMNPQRSTUVABCDE";
                  break;
  
              case 5:
                  l1 = "JKLMNPQR";
                  l2 = "ABCDEFGHJKLMNPQRSTUV";
                   break;
  
              case 6:
                  l1 = "STUVWXYZ";
                  l2 = "FGHJKLMNPQRSTUVABCDE";
                  break;
          }
  
          return l1.charAt(col) + l2.charAt(row);
      }
  
      /*
       * Retrieves the square identification for a given coordinate pair & zone.
       * See "lettersHelper" function documentation for more details.
       */
      function findGridLetters(zoneNum, northing, easting) {
          var north_1m, east_1m, row, col;
  
          zoneNum  = parseInt(zoneNum, 10);
          northing = parseFloat(northing);
          easting  = parseFloat(easting);
          row = 1;
  
          // northing coordinate to single-meter precision
          north_1m = Math.round(northing);
  
          // Get the row position for the square identifier that contains the point
          while (north_1m >= CONSTANTS.BLOCK_SIZE) {
              north_1m = north_1m - CONSTANTS.BLOCK_SIZE;
              row += 1;
          }
  
          // cycle repeats (wraps) after 20 rows
          row = row % CONSTANTS.GRIDSQUARE_SET_ROW_SIZE;
          col = 0;
  
          // easting coordinate to single-meter precision
          east_1m = Math.round(easting);
  
          // Get the column position for the square identifier that contains the point
          while (east_1m >= CONSTANTS.BLOCK_SIZE){
              east_1m = east_1m - CONSTANTS.BLOCK_SIZE;
              col += 1;
          }
  
          // cycle repeats (wraps) after 8 columns
          col = col % CONSTANTS.GRIDSQUARE_SET_COL_SIZE;
  
          return lettersHelper(findSet(zoneNum), row, col);
      }
  
      /*
       * Retrieves grid zone designator letter.
       *
       * This routine determines the correct UTM letter designator for the given 
       * latitude returns 'Z' if latitude is outside the UTM limits of 84N to 80S
       *
       * Returns letter designator for a given latitude. 
       * Letters range from C (-80 lat) to X (+84 lat), with each zone spanning
       * 8 degrees of latitude.
       */
      function utmLetterDesignator(lat) {
          var letterDesignator;
  
          lat = parseFloat(lat);
  
          if ((84 >= lat) && (lat >= 72)) {
              letterDesignator = 'X';
          } else if ((72 > lat) && (lat >= 64)) {
              letterDesignator = 'W';
          } else if ((64 > lat) && (lat >= 56)) {
              letterDesignator = 'V';
          } else if ((56 > lat) && (lat >= 48)) {
              letterDesignator = 'U';
          } else if ((48 > lat) && (lat >= 40)) {
              letterDesignator = 'T';
          } else if ((40 > lat) && (lat >= 32)) {
              letterDesignator = 'S';
          } else if ((32 > lat) && (lat >= 24)) {
              letterDesignator = 'R';
          } else if ((24 > lat) && (lat >= 16)) {
              letterDesignator = 'Q';
          } else if ((16 > lat) && (lat >= 8)) {
              letterDesignator = 'P';
          } else if (( 8 > lat) && (lat >= 0)) {
              letterDesignator = 'N';
          } else if (( 0 > lat) && (lat >= -8)) {
              letterDesignator = 'M';
          } else if ((-8> lat) && (lat >= -16)) {
              letterDesignator = 'L';
          } else if ((-16 > lat) && (lat >= -24)) {
              letterDesignator = 'K';
          } else if ((-24 > lat) && (lat >= -32)) {
              letterDesignator = 'J';
          } else if ((-32 > lat) && (lat >= -40)) {
              letterDesignator = 'H';
          } else if ((-40 > lat) && (lat >= -48)) {
              letterDesignator = 'G';
          } else if ((-48 > lat) && (lat >= -56)) {
              letterDesignator = 'F';
          } else if ((-56 > lat) && (lat >= -64)) {
              letterDesignator = 'E';
          } else if ((-64 > lat) && (lat >= -72)) {
              letterDesignator = 'D';
          } else if ((-72 > lat) && (lat >= -80)) {
              letterDesignator = 'C';
          } else {
              letterDesignator = 'Z'; // This is here as an error flag to show 
                                    // that the latitude is outside the UTM limits
          }
          
          return letterDesignator;
      }
  
      /*
       * Verifies a coordinate object by following these steps:
       * - converts string members (degrees, minutes, seconds) to numbers
       * - if direction is present, makes degree positive or negative accordingly
       * 
       * @param coord- object with at least degrees, minutes, and seconds
       * @return New, cleaned object (doesn't have direction)
       */
      function dmsVerify(coord) {
          var newCoord = {};
  
          if (typeof coord !== 'object' || !coord.degrees || !coord.minutes || !coord.seconds) {
              return false;
          }
  
          if (typeof coord.degrees === 'string') {
              newCoord.degrees = parseInt(coord.degrees, 10);
          } else {
              newCoord.degrees = coord.degrees;
          }
  
          if (coord.direction) {
              if (coord.direction === 'S' || coord.direction === 'W') {
                  newCoord.degrees *= -Math.abs(newCoord.degrees);
              } else {
                  newCoord.degrees *= Math.abs(newCoord.degrees);
              }
          }
  
          if (typeof coord.minutes === 'string') {
              newCoord.minutes = Math.abs(parseInt(coord.minutes, 10));
          } else {
              newCoord.minutes = Math.abs(coord.minutes);
          }
  
          if (typeof coord.seconds === 'string') {
              newCoord.seconds = Math.abs(parseInt(coord.seconds, 10));
          } else {
              newCoord.seconds = Math.abs(coord.seconds);
          }
      }
  
      function dmsToDecimal(angle) {
          var reg = /^[NSEW\-]?\d{1,3}[° ]\d{1,2}[' ]\d{1,2}(\.\d{1,3})?[" ][NSEW]?$/,
              regSplit = /-?\d+(\.\d+)?/g,
              dms = {},
              tmp,
              ret;
  
          if (typeof angle === 'object') {
              dms = dmsVerify(angle);
          } else {
              if (!reg.test(angle)) {
                  throw "Angle not formatted correctly: " + angle;
              }
              tmp = angle.match(regSplit);
               
              dms.degrees = parseInt(tmp[0], 10);
              dms.minutes = parseInt(tmp[1], 10);
              dms.seconds = parseFloat(tmp[2]);
          }
  
          tmp = String(dms.minutes / 60 + dms.seconds / 3600);
          ret = dms.degrees + '.' + tmp.substring(tmp.indexOf('.') + 1);
  
          return parseFloat(ret);
      }
  
      /*
       * Retrieves zone number from latitude and longitude.
       *
       * Zone numbers range from 1 - 60 over the range [-180 to +180]. Each
       * range is 6 degrees wide. Special cases for points outside normal
       * [-80 to +84] latitude zone.
       */
      function getZoneNumber(lat, lon) {
          var zoneNumber;
  
          lat = parseFloat(lat);
          lon = parseFloat(lon);
  
          // sanity check on input, remove for production
          if (lon > 360 || lon < -180 || lat > 90 || lat < -90) {
              throw "Bad input. lat: " + lat + " lon: " + lon;
          }
  
          zoneNumber = parseInt((lon + 180) / 6, 10) + 1;
  
          // Handle special case of west coast of Norway
          if (lat >= 56.0 && lat < 64.0 && lon >= 3.0 && lon < 12.0) {
              zoneNumber = 32;
          }
  
          // Special zones for Svalbard
          if (lat >= 72.0 && lat < 84.0) {
              if (lon >= 0.0  && lon <  9.0) {
                  zoneNumber = 31;
              } else if (lon >= 9.0  && lon < 21.0) {
                  zoneNumber = 33;
              } else if (lon >= 21.0 && lon < 33.0) {
                  zoneNumber = 35;
              } else if (lon >= 33.0 && lon < 42.0) {
                  zoneNumber = 37;
              }
          }
  
          return zoneNumber;  
      }
  
      module.exports = function (constants) {
          // set global functions
          CONSTANTS = constants;
  
          return {
              dmsVerify: dmsVerify,
              dmsToDecimal: dmsToDecimal,
              getZoneNumber: getZoneNumber,
              utmLetterDesignator: utmLetterDesignator,
              findGridLetters: findGridLetters
          };
      };
  }());
  

  provide("coordinator/lib/latlong/helpers", module.exports);
  provide("coordinator/lib/latlong/helpers", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/usng/usngToUtm as coordinator/lib/usng/usngToUtm
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      /*
       * Converts USNG to UTM.
       *
       * @param usngStr- string representing a USNG string
       * @return Returns an object with zoneNumber, zoneLetter, easting and northing
       */ 
      function usngToUtm(usng) { 
          var zoneBase,
              segBase,
              eSqrs,
              appxEast,
              appxNorth,
              letNorth,
              nSqrs,
              zoneStart,
              USNGSqEast = "ABCDEFGHJKLMNPQRSTUVWXYZ",
              ret = {},
              usng;
  
          //Starts (southern edge) of N-S zones in millons of meters
          zoneBase = [
              1.1, 2.0, 2.8, 3.7, 4.6, 5.5, 6.4, 7.3, 8.2, 9.1,
              0, 0.8, 1.7, 2.6, 3.5, 4.4, 5.3, 6.2, 7.0, 7.9
          ];
  
          //Starts of 2 million meter segments, indexed by zone 
          segBase = [
              0, 2, 2, 2, 4, 4, 6, 6, 8, 8,
              0, 0, 0, 2, 2, 4, 4, 6, 6, 6
          ];
  
          // convert easting to UTM
          eSqrs = USNGSqEast.indexOf(usng.sq1);          
          appxEast = 1 + eSqrs % 8; 
  
          // convert northing to UTM
          letNorth = "CDEFGHJKLMNPQRSTUVWX".indexOf(usng.zoneLetter);
          if (usng.zoneNumber % 2) {
              //odd number zone
              nSqrs = "ABCDEFGHJKLMNPQRSTUV".indexOf(usng.sq2);
          } else {
              // even number zone
              nSqrs = "FGHJKLMNPQRSTUVABCDE".indexOf(usng.sq2);
          }
  
          zoneStart = zoneBase[letNorth];
          appxNorth = segBase[letNorth] + nSqrs / 10;
          if (appxNorth < zoneStart) {
              appxNorth += 2;
          }
  
          ret.northing = appxNorth * 1000000 + usng.north * Math.pow(10, 5 - String(usng.north).length);
          ret.easting = appxEast * 100000 + usng.east * Math.pow(10, 5 - String(usng.east).length);
          ret.zoneNumber = usng.zoneNumber;
          ret.zoneLetter = usng.zoneLetter;
  
          return ret;
      }
  
      module.exports = function () {
          return usngToUtm;
      };
  }());
  

  provide("coordinator/lib/usng/usngToUtm", module.exports);
  provide("coordinator/lib/usng/usngToUtm", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/usng/parseUsng as coordinator/lib/usng/parseUsng
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      /*
       * Converts lower-case characters to upper case, removes spaces, and 
       * separates the string into logical parts.
       */
      function parseUsng(usngStr_input) {
          var j = 0,
              k,
              usngStr = [],
              usngStr_temp = [],
              parts = {};
  
          usngStr_temp = usngStr_input.toUpperCase();
  
          // put usgn string in 'standard' form with no space delimiters
          usngStr = usngStr_temp.replace(/%20/g, "");
          usngStr = usngStr_temp.replace(/ /g, "");
  
          if (usngStr.length < 7) {
              throw "This application requires minimum USNG precision of 10,000 meters";
          }
  
          // break usng string into its component pieces
          parts.zoneNumber = usngStr.match(/^\d{1,2}/)[0];
          j += parts.zoneNumber.length;
          parts.zoneNumber = parseInt(parts.zoneNumber, 10);
          parts.zoneLetter = usngStr.charAt(j); j+= 1;
          parts.sq1 = usngStr.charAt(j); j += 1;
          parts.sq2 = usngStr.charAt(j); j += 1;
  
          parts.precision = (usngStr.length-j) / 2;
          parts.east='';
          parts.north='';
          for (k = 0; k < parts.precision; k += 1) {
              parts.east += usngStr.charAt(j);
              j += 1;
          }
  
          if (usngStr[j] === " ") {
              j += 1;
          }
          for (k = 0; k < parts.precision; k += 1) {
              parts.north += usngStr.charAt(j);
              j += 1;
          }
  
          return parts;
      }
  
      module.exports = function () {
          return parseUsng;
      };
  }());
  

  provide("coordinator/lib/usng/parseUsng", module.exports);
  provide("coordinator/lib/usng/parseUsng", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/usng/isUsng as coordinator/lib/usng/isUsng
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      /*
       * Checks a string to see if it is valid USNG;
       * If so, returns the string in all upper case, no delimeters
       * If not, returns false
       */
      function isUsng(inputStr) {
          var usngStr = [],
              strregexp;
  
         // convert all letters to upper case
         usngStr = inputStr.toUpperCase();
       
         // get rid of space delimeters
         usngStr = usngStr.replace(/%20/g, "");
         usngStr = usngStr.replace(/ /g, "");
  
         if (usngStr.length > 15) {
            return false;
         }
  
         strregexp = /^[0-9]{2}[CDEFGHJKLMNPQRSTUVWX]$/;
         if (usngStr.match(strregexp)) {
            throw "Input appears to be a UTM zone, but more precision is required to display an accurate result: " + usngStr;
         }
  
         strregexp = /^[0-9]{2}[CDEFGHJKLMNPQRSTUVWX][ABCDEFGHJKLMNPQRSTUVWXYZ][ABCDEFGHJKLMNPQRSTUV]([0-9][0-9]){0,5}/;
         if (!usngStr.match(strregexp)) {
            return false;
         }
  
         if (usngStr.length < 7) {
            throw "Format looks right, but precision should be to least 10,000 meters: " + usngStr;
         }
  
         // all tests passed...return the upper-case, non-delimited string
         return usngStr;
      }
  
      module.exports = function () {
          return isUsng;
      };
  }());
  

  provide("coordinator/lib/usng/isUsng", module.exports);
  provide("coordinator/lib/usng/isUsng", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/utm as coordinator/lib/utm
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS =  require('coordinator/lib/constants'),
          utmToLatLong =  require('coordinator/lib/utm/utmToLatLong')(CONSTANTS),
          utmToUsng =  require('coordinator/lib/utm/utmToUsng')(CONSTANTS);
  
      function getConverter (outputType) {
          var fn;
  
          switch (outputType.toLowerCase()) {
              case 'latlong':
                  fn = utmToLatLong;
                  break;
  
              case 'usng':
                  fn = utmToUsng;
                  break;
          }
  
          return fn;
      }
  
      module.exports.toLatLong = utmToLatLong;
      module.exports.toUsng = utmToUsng;
      module.exports.getConverter = getConverter;
  }());
  

  provide("coordinator/lib/utm", module.exports);
  provide("coordinator/lib/utm", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/latlong/decimalToDegMinSec as coordinator/lib/latlong/decimalToDegMinSec
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      /*
       * Converts decimal degrees to degrees, minutes seconds.
       * 
       * This function can either return a formatted string or an object.
       * 
       * If string or nothing is specified, it will look like this: 41°25'01"N
       * 
       * If object is chosen, it will have two properties, latitude and longitude.
       * Each will have these properties:
       * - degrees: positive integer
       * - minutes: positive integer
       * - seconds: positive float
       * - direction: N, S, E, or W
       * 
       * @param lat- latitude (float or string representing a float)
       * @param lon- longitude (float or string representing a float)
       * @param type- string representing return type (object or string); optional
       * @param digits- max digits in seconds; can be 3rd parameter; default is 2
       * @return Depents on type parameter (map of formatted strings or values)
       */
      function decimalToDegMinSec (lat, lon, type, digits) {
          var latDeg,
              latMin,
              latSec,
              lonDeg,
              lonMin,
              lonSec,
              latDir,
              lonDir,
              ret,
              magic;
  
          if (typeof digits === 'undefined') {
              digits = type;
          }
  
          if (typeof digits === 'string') {
              digits = parseInt(digits, 10);
          } else if (typeof digits !== 'number') {
              digits = 2;
          }
  
          // magic number that helps us round off un-needed digits
          magic = Math.pow(10, digits);
  
          lat = (typeof lat === 'string') ? parseFloat(lat) : lat;
          lon = (typeof lon === 'string') ? parseFloat(lon) : lon;
  
          if (lat < -90 || lat > 90) {
              throw "Latitude out of range: " + lat;
          }
  
          if (lon < -180 || lon > 180) {
              throw "Longitude out of range: " + lon;
          }
  
          latDir = (lat >= 0) ? 'N' : 'S';
          lonDir = (lon >= 0) ? 'E' : 'W';
  
          // Change to absolute value
          lat = Math.abs(lat);
          lon = Math.abs(lon);
  
          // Convert to Degree Minutes Seconds Representation
          latDeg = Math.floor(lat);
          lat -= latDeg;
          latMin = Math.floor(lat * 60);
          lat -= latMin / 60;
          latSec = Math.round((lat * 3600) * magic) / magic;
  
          lonDeg = Math.floor(lon);
          lon -= lonDeg;
          lonMin = Math.floor(lon * 60);
          lon -= lonMin / 60;
          lonSec = Math.round((lon * 3600) * magic) / magic;
  
          if (type === 'object') {
              ret = {
                  latitude: {
                      degrees: latDeg,
                      minutes: latMin,
                      seconds: latSec,
                      direction: latDir
                  },
                  longitude: {
                      degrees: lonDeg,
                      minutes: lonMin,
                      seconds: lonSec,
                      direction: lonDir
                  }
              };
          } else {
              ret = {
                  latitude: latDeg + '°' + latMin + '\'' + latSec + '"' + latDir,
                  longitude: lonDeg + '°' + lonMin + '\'' + lonSec + '"' + lonDir
              };
          }
  
          return ret;
      }
  
      module.exports = function () {
          return decimalToDegMinSec;
      };
  }());
  

  provide("coordinator/lib/latlong/decimalToDegMinSec", module.exports);
  provide("coordinator/lib/latlong/decimalToDegMinSec", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/latlong/degMinSecToDecimal as coordinator/lib/latlong/degMinSecToDecimal
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var helpers =  require('coordinator/lib/latlong/helpers');
  
      /*
       * Converts degrees, minutes, seconds to decimal degrees.
       * 
       * If objects are passed in, they should define these properties:
       * - degrees: integer (or string representing an integer)
       * - minutes: integer (or string representing an integer)
       * - seconds: float (or string representing a float)
       * - direction: N, S, E, or W
       * 
       * If strings are passed in, they will be parsed according to specs.
       * 
       * @param latitude- formatted string or an object with properties:
       * @param longitude- formatted string or an object
       * @return  Object with both latitude and longitude
       */
      function degMinSecToDecimal(latitude, longitude) {
          var regDir = /[NSEW\-]/,
              lat,
              lon,
              tmp,
              ret = {};
  
          lat = helpers.dmsToDecimal(latitude);
          lon = helpers.dmsToDecimal(longitude);
  
          // Check if any error occurred
          if (lat < -90 || lat > 90) {
              throw "Latitude out of bounds: " + lat;
          }
          if (lon < -180 || lon > 180) {
              throw "Longitude out of bounds: " + lon;
          }
  
          tmp = latitude.match(regDir);
  
          if (tmp[0] === 'S' || tmp[0] === '-') {
              lat *= -1;
          }
          ret.latitude = lat;
  
          tmp = longitude.match(regDir);
  
          if (tmp[0] === 'W' || tmp[0] === '-') {
              lon *= -1;
          }
          ret.longitude = lon;
  
          return ret;
      }
  
      module.exports = function (constants) {
          helpers = helpers(constants);
  
          return degMinSecToDecimal;
      };
  }());
  

  provide("coordinator/lib/latlong/degMinSecToDecimal", module.exports);
  provide("coordinator/lib/latlong/degMinSecToDecimal", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/latlong/latlongToUtm as coordinator/lib/latlong/latlongToUtm
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS = {},
          helpers =  require('coordinator/lib/latlong/helpers');
  
      /*
       * Converts latitude and longitude to UTM.
       *
       * Converts lat/long to UTM coords.  Equations from USGS Bulletin 1532 
       * (or USGS Professional Paper 1395 "Map Projections - A Working Manual", 
       * by John P. Snyder, U.S. Government Printing Office, 1987.)
       * 
       * Note- UTM northings are negative in the southern hemisphere.
       *
       * @param lat- Latitude in decimal; north is positive, south is negative
       * @param lon- Longitude in decimal; east is positive, west is negative
       * @param zone- optional, result zone
       * @return Object with three properties, easting, northing, zone
       */
      function latLongToUtm(lat, lon, zone) {
          var zoneNumber,
              latRad,
              lonRad,
              lonOrigin,
              lonOriginRad,
              utmEasting,
              utmNorthing,
              N,
              T,
              C,
              A,
              M,
              utmcoords = {};
  
          lat = parseFloat(lat);
          lon = parseFloat(lon);
  
          // Constrain reporting USNG coords to the latitude range [80S .. 84N]
          if (lat > 84.0 || lat < -80.0) {
              return "undefined";
          }
  
          // sanity check on input - remove for production
          // Make sure the longitude is between -180.00 .. 179.99..
          if (lon > 180 || lon < -180 || lat > 90 || lat < -90) {
              throw "Bad input. lat: " + lat + " lon: " + lon;
          }
  
          // convert lat/lon to radians
          latRad = lat * CONSTANTS.DEG_2_RAD;
          lonRad = lon * CONSTANTS.DEG_2_RAD;
  
          // User-supplied zone number will force coordinates to be computed in a particular zone
          zoneNumber = zone || helpers.getZoneNumber(lat, lon);
  
          // +3 puts origin in middle of zone
          lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
          lonOriginRad = lonOrigin * CONSTANTS.DEG_2_RAD;
  
          N = CONSTANTS.EQUATORIAL_RADIUS / Math.sqrt(1 - CONSTANTS.ECC_SQUARED * Math.pow(Math.sin(latRad), 2));
          T = Math.pow(Math.tan(latRad), 2);
          C = CONSTANTS.ECC_PRIME_SQUARED * Math.pow(Math.cos(latRad), 2);
          A = Math.cos(latRad) * (lonRad - lonOriginRad);
  
          // Note that the term Mo drops out of the "M" equation, because phi 
          // (latitude crossing the central meridian, lambda0, at the origin of the
          //  x,y coordinates), is equal to zero for UTM.
          M = CONSTANTS.EQUATORIAL_RADIUS * (
              (1 - CONSTANTS.ECC_SQUARED / 4 - 3 * (CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED) / 64 - 5 * (CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED) / 256) * latRad -
              (3 * CONSTANTS.ECC_SQUARED / 8 + 3 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 32 + 45 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 1024) * Math.sin(2 * latRad) +
              (15 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 256 + 45 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 1024) * Math.sin(4 * latRad) -
              (35 * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED * CONSTANTS.ECC_SQUARED / 3072) * Math.sin(6 * latRad));
  
          utmEasting = (CONSTANTS.k0 * N *
              (A + (1 - T + C) * (A * A * A) / 6 + (5 - 18 * T + T * T + 72 * C - 58 * CONSTANTS.ECC_PRIME_SQUARED ) * (A * A * A * A * A) / 120) + CONSTANTS.EASTING_OFFSET);
  
          utmNorthing = (CONSTANTS.k0 * ( M + N * Math.tan(latRad) * (
                (A * A) / 2 + (5 - T + 9 * C + 4 * C * C ) * (A * A * A * A) / 2 +
                (61 - 58 * T + T * T + 600 * C - 330 * CONSTANTS.ECC_PRIME_SQUARED ) *
                (A * A * A * A * A * A) / 720)
            ) );
  
          if (utmNorthing < 0) {
              utmNorthing += 10000000;
          }
  
          utmcoords.easting = Math.round(utmEasting);
          utmcoords.northing = Math.round(utmNorthing);
          utmcoords.zoneNumber = zoneNumber;
          utmcoords.zoneLetter = helpers.utmLetterDesignator(lat);
          utmcoords.hemisphere = lat < 0 ? 'S' : 'N';
  
          return utmcoords;
      }
  
      module.exports = function (constants) {
          CONSTANTS = constants;
  
          helpers = helpers(constants);
  
          return latLongToUtm;
      };
  }());
  

  provide("coordinator/lib/latlong/latlongToUtm", module.exports);
  provide("coordinator/lib/latlong/latlongToUtm", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/latlong/translate as coordinator/lib/latlong/translate
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS = {};
  
      function translate(lat, lon, d, brng) {
          var R = 6371,
              lat2,
              lon2,
              ret;
  
          lat *= CONSTANTS.DEG_2_RAD;
          lon *= CONSTANTS.DEG_2_RAD;
          
          brng *= CONSTANTS.DEG_2_RAD;
          
          lat2 = Math.asin(Math.sin(lat) * Math.cos(d/R) + 
                        Math.cos(lat) * Math.sin(d/R) * Math.cos(brng));
  
          lon2 = lon + Math.atan2(Math.sin(brng) * Math.sin(d/R) * Math.cos(lat), 
                        Math.cos(d/R) - Math.sin(lat) * Math.sin(lat2));
                        
          lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
          
          ret = {
              latitude: lat2 * CONSTANTS.RAD_2_DEG,
              longitude: lon2 * CONSTANTS.RAD_2_DEG
          };
  
          return ret;
      }
  
      module.exports = function (constants) {
          CONSTANTS = constants;
  
          return translate;
      };
  }());
  

  provide("coordinator/lib/latlong/translate", module.exports);
  provide("coordinator/lib/latlong/translate", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/mgrs/mgrsToUtm as coordinator/lib/mgrs/mgrsToUtm
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var MGRS_Ellipsoid_Code = "WE",
          CLARKE_1866 = "CC", // Ellipsoid code for CLARKE_1866
          CLARKE_1880 = "CD", // Ellipsoid code for CLARKE_1880
          BESSEL_1841 = "BR", // Ellipsoid code for BESSEL_1841
          BESSEL_1841_NAMIBIA = "BN", // Ellipsoid code for BESSEL 1841 (NAMIBIA)
          Latitude_Band_Table = {
              'C': { min_northing: 1100000.0, north: -72.0, south: -80.5},
              'D': { min_northing: 2000000.0, north: -64.0, south: -72.0},
              'E': { min_northing: 2800000.0, north: -56.0, south: -64.0},
              'F': { min_northing: 3700000.0, north: -48.0, south: -56.0},
              'G': { min_northing: 4600000.0, north: -40.0, south: -48.0},
              'H': { min_northing: 5500000.0, north: -32.0, south: -40.0},
              'J': { min_northing: 6400000.0, north: -24.0, south: -32.0},
              'K': { min_northing: 7300000.0, north: -16.0, south: -24.0},
              'L': { min_northing: 8200000.0, north: -8.0, south: -16.0},
              'M': { min_northing: 9100000.0, north: 0.0, south: -8.0},
              'N': { min_northing: 0.0, north: 8.0, south: 0.0},
              'P': { min_northing: 800000.0, north: 16.0, south: 8.0},
              'Q': { min_northing: 1700000.0, north: 24.0, south: 16.0},
              'R': { min_northing: 2600000.0, north: 32.0, south: 24.0},
              'S': { min_northing: 3500000.0, north: 40.0, south: 32.0},
              'T': { min_northing: 4400000.0, north: 48.0, south: 40.0},
              'U': { min_northing: 5300000.0, north: 56.0, south: 48.0},
              'V': { min_northing: 6200000.0, north: 64.0, south: 56.0},
              'W': { min_northing: 7000000.0, north: 72.0, south: 64.0},
              'X': { min_northing: 7900000.0, north: 84.5, south: 72.0}
          };
  
      /*
       * The function breakMGRS breaks down an MGRS  
       * coordinate string into its component parts.
       *
       *   MGRS           : MGRS coordinate string          (input)
       *   Zone           : UTM Zone                        (output)
       *   Letters        : MGRS coordinate string letters  (output)
       *   Easting        : Easting value                   (output)
       *   Northing       : Northing value                  (output)
       *   Precision      : Precision level of MGRS string  (output)
       */
      function breakMGRS(MGRS) {
          /* Break_MGRS_String */
          var temp,
              tReturn = {},
              east,
              north,
              multiplier;
  
          tReturn.Zone = parseInt(MGRS.match(/(\d+)/g)[0], 10);
  
          if (tReturn.Zone < 1 || tReturn.Zone > 60) {
              throw "MGRS formatting wrong";
          }
  
          /* get letters */
          temp = MGRS.match(/[a-zA-Z]{3}/)[0];
          if (!temp) {
              throw "MGRS formatting error";
          }
          
          tReturn.Letters = temp;
          
          if (tReturn.Letters.indexOf('I') >= 0 || tReturn.Letters.indexOf('O') >= 0) {
              throw "MGRS formatting wrong";
          }
  
          temp = MGRS.match(/\d+$/)[0];
          if (temp.length <= 10 && temp.length % 2 === 0) {
              /* get easting & northing */
              tReturn.Precision = temp.length / 2;
              if (tReturn.Precision > 0) {
                  east = parseInt(temp.substring(0, temp.length / 2), 10);
                  north = parseInt(temp.substring(temp.length / 2), 10);
                  multiplier = Math.pow(10.0, 5 - tReturn.Precision);
                  tReturn.Easting = east * multiplier;
                  tReturn.Northing = north * multiplier;
              } else {
                  tReturn.Easting = 0;
                  tReturn.Northing = 0;
              }
          } else {
              throw "MGRS formatting wrong";
          }
  
          return tReturn;
      }
  
      /*
       * The function getGridValues sets the letter range used for 
       * the 2nd letter in the MGRS coordinate string, based on the set 
       * number of the utm zone. It also sets the false northing using a
       * value of A for the second letter of the grid square, based on 
       * the grid pattern and set number of the utm zone.
       *
       *    zone            : Zone number             (input)
       *    ltr2_low_value  : 2nd letter low number   (output)
       *    ltr2_high_value : 2nd letter high number  (output)
       *    false_northing  : False northing          (output)
       */
      function getGridValues (zone) {
          var set_number,    /* Set number (1-6) based on UTM zone number */
              aa_pattern,    /* Pattern based on ellipsoid code */
              ltr2_low_value,
              ltr2_high_value,
              false_northing;
  
          set_number = zone % 6 || 6;
  
          if (MGRS_Ellipsoid_Code === CLARKE_1866 || MGRS_Ellipsoid_Code === CLARKE_1880 || MGRS_Ellipsoid_Code === BESSEL_1841 || MGRS_Ellipsoid_Code === BESSEL_1841_NAMIBIA) {
              aa_pattern = false;
          } else {
              aa_pattern = true;
          }
  
          if ((set_number === 1) || (set_number === 4)) {
              ltr2_low_value = 'A';
              ltr2_high_value = 'H';
          } else if ((set_number === 2) || (set_number === 5)) {
              ltr2_low_value = 'J';
              ltr2_high_value = 'R';
          } else if ((set_number === 3) || (set_number === 6)) {
              ltr2_low_value = 'S';
              ltr2_high_value = 'Z';
          }
  
          /* False northing at A for second letter of grid square */
          if (aa_pattern) {
              if (set_number % 2 ===  0) {
                  false_northing = 1500000.0;
              } else {
                  false_northing = 0.0;
              }
          } else {
              if (set_number % 2 === 0) {
                  false_northing =  500000.0;
              } else {
                  false_northing = 1000000.00;
              }
          }
  
          return {
              ltr2_low_value: ltr2_low_value,
              ltr2_high_value: ltr2_high_value,
              false_northing: false_northing
          };
      }
  
      /*
       * The function getLatitudeBandMinNorthing receives a latitude band letter
       * and uses the Latitude_Band_Table to determine the minimum northing for that
       * latitude band letter.
       *
       *   letter        : Latitude band letter             (input)
       *   min_northing  : Minimum northing for that letter(output)
       */
      function getLatitudeBandMinNorthing(letter) {
         var min_northing;
  
         if (letter >= 'C' && letter <= 'H') {
             min_northing = Latitude_Band_Table[letter].min_northing;
         } else if (letter >= 'J' && letter <= 'N') {
             min_northing = Latitude_Band_Table[letter].min_northing;
         } else if (letter >= 'P' && letter <= 'X') {
             min_northing = Latitude_Band_Table[letter].min_northing;
         } else {
             throw "MGRS not formatted correctly";
         }
  
         return min_northing;
      }
  
      /*
       * Converts an MGRS coordinate string
       * to UTM projection (zone, hemisphere, easting and northing) coordinates 
       * according to the current ellipsoid parameters.  If any errors occur, they are
       * thrown and everything crashes. Cool, huh?
       *
       *    MGRS       : MGRS coordinate string           (input)
       *    Zone       : UTM zone                         (output)
       *    Hemisphere : North or South hemisphere        (output)
       *    Easting    : Easting (X) in meters            (output)
       *    Northing   : Northing (Y) in meters           (output)
       */
      function mgrsToUtm(MGRS) {
          var scaled_min_northing,
              min_northing,
              ltr2_low_value,
              ltr2_high_value,
              false_northing,
              grid_easting,        /* Easting for 100,000 meter grid square      */
              grid_northing,       /* Northing for 100,000 meter grid square     */
              letters = [],
              in_precision,
              tmp,
              Hemisphere,
              Zone,
              Easting,
              Northing;
  
          tmp = breakMGRS(MGRS);
  
          if (!tmp) {
              throw "MGRS not formatted correctly";
          }
  
          letters = tmp.Letters;
          Zone = tmp.Zone;
          Easting = tmp.Easting;
          Northing = tmp.Northing;
          in_precision = tmp.in_precision;
  
          if (!Zone) {
              throw "Zone not readable";
          }
  
          if ((letters.charAt(0) === 'X') && (Zone === 32 || Zone === 34 || Zone === 36)) {
              throw "Malformed MGRS";
          }
  
          if (letters.charAt(0) < 'N') {
              Hemisphere = 'S';
          } else {
              Hemisphere = 'N';
          }
  
          tmp = getGridValues(Zone);
  
          ltr2_low_value = tmp.ltr2_low_value;
          ltr2_high_value = tmp.ltr2_high_value;
          false_northing = tmp.false_northing;
  
          /* Check that the second letter of the MGRS string is within
           * the range of valid second letter values 
           * Also check that the third letter is valid */
          if (letters.charAt(1) < ltr2_low_value || letters.charAt(1) > ltr2_high_value || letters.charAt(2) > 'V') {
              throw "Malformed";
          }
  
          grid_northing = parseFloat(letters.charCodeAt(2) - 'A'.charCodeAt(0)) * 100000 + false_northing;
  
          grid_easting = parseFloat(letters.charCodeAt(1) - ltr2_low_value.charCodeAt(0) + 1) * 100000;
          if ((ltr2_low_value === 'J') && letters.charAt(1) > 'O') {
              grid_easting = grid_easting - 100000;
          }
  
          if (letters.charAt(2) > 'O') {
              grid_northing = grid_northing - 100000;
          }
  
          if (letters.charAt(2) > 'I') {
              grid_northing = grid_northing - 100000; 
          }
  
          if (grid_northing >= 2000000) {
              grid_northing = grid_northing - 2000000;
          }
  
          min_northing = getLatitudeBandMinNorthing(letters[0]);
          scaled_min_northing = min_northing;
          while (scaled_min_northing >= 2000000) {
              scaled_min_northing = scaled_min_northing - 2000000;
          }
  
          grid_northing = grid_northing - scaled_min_northing;
          if (grid_northing < 0) {
              grid_northing = grid_northing + 2000000;
          }
  
          grid_northing = min_northing + grid_northing;
  
          Easting = grid_easting + Easting;
          Northing = grid_northing + Northing;
  
          return {
              Zone: Zone,
              Hemisphere: Hemisphere,
              Easting: Easting,
              Northing: Northing
          };
      }
  
      module.exports = function () {
          return mgrsToUtm;
      };
  }());
  

  provide("coordinator/lib/mgrs/mgrsToUtm", module.exports);
  provide("coordinator/lib/mgrs/mgrsToUtm", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/usng as coordinator/lib/usng
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS =  require('coordinator/lib/constants'),
          usngToUtmRaw =  require('coordinator/lib/usng/usngToUtm')(CONSTANTS),
          parseUsng =  require('coordinator/lib/usng/parseUsng')(CONSTANTS),
          isUsng =  require('coordinator/lib/usng/isUsng')(CONSTANTS),
          utm =  require('coordinator/lib/utm');
  
      function usngToUtm (usngStr) {
          var usng = parseUsng(usngStr);
          return usngToUtmRaw(usng);
      }
  
      /*
       * Turns a USNG string into lat/long coordinates.
       * 
       * @param usngStr_input- USNG source
       * @return Object with two properties- latitude & longitude
       */
      function usngToLatLong(usngStr_input) {
          var usngp,
              coords,
              latlon;
  
          usngp = parseUsng(usngStr_input);
  
          // convert USNG coords to UTM; this routine counts digits and sets precision
          coords = usngToUtm(usngStr_input);
  
          // southern hemisphere case
          if (usngp.zoneLetter < 'N') {
              coords.northing -= CONSTANTS.NORTHING_OFFSET;
          }
  
          latlon = utm.toLatLong(coords.northing, coords.easting, usngp.zoneNumber);
  
          return latlon;
      }
  
      function getConverter (outputType) {
          var fn;
  
          switch (outputType.toLowerCase()) {
              case 'utm':
                  fn = usngToUtm;
                  break;
              case 'latlong':
                  fn = usngToLatLong;
                  break;
          }
  
          return fn;
      }
  
      module.exports.toUtm = usngToUtm;
      module.exports.toLatLong = usngToLatLong;
      module.exports.isUsng = isUsng;
      module.exports.getConverter = getConverter;
      module.exports.parseUsng = parseUsng;
  }());
  

  provide("coordinator/lib/usng", module.exports);
  provide("coordinator/lib/usng", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/latlong as coordinator/lib/latlong
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS =  require('coordinator/lib/constants'),
          decimalToDegMinSec =  require('coordinator/lib/latlong/decimalToDegMinSec')(CONSTANTS),
          degMinSecToDecimal =  require('coordinator/lib/latlong/degMinSecToDecimal')(CONSTANTS),
          latLongToUtm =  require('coordinator/lib/latlong/latlongToUtm')(CONSTANTS),
          translate =  require('coordinator/lib/latlong/translate')(CONSTANTS),
          utm =  require('coordinator/lib/utm');
  
      /*
       * Convenience function that basically just:
       *  * Converts lat/long to UTM
       *  * Converts UTM to USNG
       * 
       * @param lat- Latitude in decimal degrees
       * @param lon- longitude in decimal degrees
       * @param precision- How many decimal places (1-5) in USNG (default 5)
       * @param output- Output format. Accepted values are: 'string' and 'object'
       * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
       */
      function latLongToUsng(lat, lon, precision, output) {
          var coords;
  
          if (typeof precision === 'string') {
              precision = parseInt(precision, 10);
          }
  
          precision = precision ? precision : 5;
  
          lat = parseFloat(lat);
          lon = parseFloat(lon);
  
          // convert lat/lon to UTM coordinates
          coords = latLongToUtm(lat, lon);
  
          return utm.toUsng(coords, precision, output);
      }
  
      /*
       * Creates a Military Grid Reference System string.
       * This is the same as a USNG string, but without spaces.
       * 
       * Space delimiters are optional but allowed in USNG, but are not allowed in MGRS.
       * 
       * The numbers are the same between the two coordinate systems.
       * 
       * @param lat- Latitude in decimal degrees
       * @param lon- longitude in decimal degrees
       * @param precision- How many decimal places (1-5) in USNG (default 5)
       * @param output- Output format. Accepted values are: 'string' and 'object'
       * @return String of the format- DDL LL DDDDD DDDDD (5-digit precision)
       */
      function latLongToMgrs(lat, lon, precision, output) {
          var mgrs,
              usng = latLongToUsng(lat, lon, precision, output);
  
          if (typeof usng === 'string') {
              // remove space delimiters to conform to mgrs spec
              mgrs = usng.replace(/ /g, "");
          } else {
              mgrs = usng;
          }
  
          return mgrs;
      }
  
      function getConverter (outputType) {
          var fn;
  
          switch (outputType.toLowerCase()) {
              case 'utm':
                  fn = latLongToUtm;
                  break;
  
              case 'usng':
                  fn = latLongToUsng;
                  break;
  
              case 'mgrs':
                  fn = latLongToMgrs;
                  break;
          }
  
          return fn;
      }
      
      module.exports.toDecimal = degMinSecToDecimal;
      module.exports.toDegMinSec = decimalToDegMinSec;
      module.exports.toUsng = latLongToUsng;
      module.exports.toUtm = latLongToUtm;
      module.exports.toMgrs = latLongToMgrs;
      module.exports.getConverter = getConverter;
  
      module.exports.translate = translate;
  }());
  

  provide("coordinator/lib/latlong", module.exports);
  provide("coordinator/lib/latlong", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/mgrs as coordinator/lib/mgrs
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var CONSTANTS =  require('coordinator/lib/constants'),
          mgrsToUtm =  require('coordinator/lib/mgrs/mgrsToUtm')(CONSTANTS),
          usng =  require('coordinator/lib/usng');
  
      function getConverter(outputType) {
          var fn;
  
          switch (outputType.toLowerCase()) {
              case 'latlong':
                  fn = usng.toLatLong;
                  break;
              
              case 'utm':
                  fn = usng.toUtm;
                  break;
          }
  
          return fn;
      }
  
      module.exports.getConverter = getConverter;
      module.exports.toLatLong = usng.toLatLong;
      module.exports.toUtm = mgrsToUtm;
  }());
  

  provide("coordinator/lib/mgrs", module.exports);
  provide("coordinator/lib/mgrs", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator/lib/convert as coordinator/lib/convert
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var converters = {
              'latlong':  require('coordinator/lib/latlong'),
              'usng':  require('coordinator/lib/usng'),
              'utm':  require('coordinator/lib/utm'),
              'mgrs':  require('coordinator/lib/mgrs')
          };
  
      function getConverter(inputType, outType) {
          if (typeof inputType !== 'string') {
              throw new Error('Parameter not a string: ' + inputType);
          }
  
          if (typeof outType !== 'string') {
              throw new Error('Parameter not a string: ' + outType);
          }
  
          if (!converters[inputType]) {
              throw "Converter doesn't exist. Complain on GitHub.";
          }
  
          return converters[inputType].getConverter(outType);
      }
  
      module.exports = getConverter;
      module.exports.converters = converters;
  }());
  

  provide("coordinator/lib/convert", module.exports);
  provide("coordinator/lib/convert", module.exports);
  $.ender(module.exports);
}(global));

// ender:coordinator as coordinator
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      module.exports =  require('coordinator/lib/convert');
  }());
  

  provide("coordinator", module.exports);
  provide("coordinator", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/conversion as tracker-display/js/conversion
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      /*
       * Converts from an arbitrary unit set to screen coordinates.
       * All points must have an x and a y.
       *
       * Preserves ratio.  If the screen has a different aspect ratio than
       * the original, the original is preserved.
       *
       * @param point- Point to convert
       * @param bottomLeft- Bottom left of original coordinate system
       * @param topRight- Top right of original coordinate system
       * @param width- width of screen
       * @param height- height of screen
       * @return Screen coordinates
       */
      function unitsToScreen(point, bottomLeft, topRight, width, height, xOffset, yOffset) {
          var ratio, bounds, screenBounds, screen;
  
          bounds = {
              minX: bottomLeft.x,
              minY: bottomLeft.y,
              maxX: topRight.x,
              maxY: topRight.y
          };
  
          screenBounds = {
              width: width,
              height: height
          };
  
          ratio = getMultiplier(bounds, screenBounds, xOffset, yOffset);
  
          screen = {
              x: Math.round(point.x * ratio + (width / 2 + xOffset)),
              // y coordinates are flipped
              y: Math.round(height - (point.y * ratio))
          };
  
          return screen;
      }
  
      /*
       * Converts from screen point to an arbitrary unit system.
       * All points must have an x and a y.
       *
       * Preserves ratio.  If the screen has a different aspect ratio than
       * the new point system, the screen ratio is preserved.
       *
       * @param screen- Screen point to convert
       * @param bottomLeft- Bottom left of original coordinate system
       * @param topRight- Top right of original coordinate system
       * @param width- width of screen
       * @param height- height of screen
       * @return New coordinates
       */
      function screenToUnits(screen, bottomLeft, topRight, width, height) {
          var xRatio, yRatio, ratio, point;
  
          xRatio = (topRight.x - bottomLeft.x) / width;
          yRatio = (topRight.y - bottomLeft.y) / height;
  
          ratio = Math.min(xRatio, yRatio);
  
          point = {
              x: Math.round(screen.x * ratio + bottomLeft.x),
              // y coordinates are flipped
              y: Math.round(screen.y * ratio + bottomLeft.y)
          };
  
          return point;
      }
  
      function getMultiplier(coordinateBounds, screenBounds, xOffset, yOffset) {
          var xRatio, yRatio, width, height;
  
          width = screenBounds.width - (xOffset || 0);
          height = screenBounds.height - (yOffset || 0);
  
          xRatio = width / (coordinateBounds.maxX - coordinateBounds.minX);
          yRatio = height / (coordinateBounds.maxY - coordinateBounds.minY);
  
          return Math.min(xRatio, yRatio);
      }
  
      /*
       * Function to get GPS coordinate given starting GPS, distance and bearing:
       * Taken from http://www.movable-type.co.uk/scripts/latlong.html
       *
       * Original equation
       * lat2 = asin(sin(lat1)*cos(d/R) + cos(lat1)*sin(d/R)*cos(θ))
       * lon2 = lon1 + atan2(sin(θ)*sin(d/R)*cos(lat1), cos(d/R)−sin(lat1)*sin(lat2))
       * 
       * This function has been cleaned up a little from the original.
       * Long lines were broken up into small fragments.
       * 
       * @param origin- GPS coordinate (must have latitude & longitude properties)
       * @param distance- Distance in meters from original
       * @param angle- Angle in radians from original
       * @return New GPS coordinate (has latitude & longitude properties)
       */
  
      function calculateGPS(origin, distance, angle) {
          var radius = 6371100, // radius of the Earth in meters
              lat2, // new latitude
              lon2, // new longitude
              point, // return point
              tInside1, // convenience variable to simplify code
              tInside2, // convenience variable to simplify code
              angDist = distance / radius; // angular distance
  
  
          /* Calculate Latitude */
  
  
          // separated so everything looks cleaner
          tInside1 = Math.sin(origin.latitude) * Math.cos(angDist);
          tInside2 = Math.cos(origin.latitude) * Math.sin(angDist) * Math.cos(angle);
  
          lat2 = Math.asin(tInside1 + tInside2);
  
  
          /* Calculate Longitude */
  
  
          // separated so everything looks cleaner
          tInside1 = Math.sin(angle) * Math.sin(angDist) * Math.cos(origin.latitude);
          tInside2 =  Math.cos(angDist) - Math.sin(origin.latitude) * Math.sin(lat2);
  
          lon2 = origin.longitude + Math.atan2(tInside1, tInside2);
  
          point = {
              latitude: lat2,
              longitude: lon2
          };
  
          return point;
      }
  
  
      /**
       *  Resolves any angle (in degrees) to an angle in the range [0..upperBound)
       *  (including 0 but not including upperBound)
       *
       *  @param IN `angle` The arbitrary angle to be resolved. Must be of type
       *    'number'.
       *  @return An equivalent angle to the input `angle`, but in the range
       *    [0..upperBound)
       *  @throws TypeError if `angle` is not of type 'number' or is NaN
       */
      function resolveAngle (angle) {
        var outAngle
          , upperBound = 360
          , errorMessage = 'angle must be of type \'number\'' 
          ;
  
        if (('number' !== typeof angle) || (isNaN(angle))) {
          throw new TypeError(errorMessage);
        }
  
        outAngle = angle % upperBound;
  
        /*
          In JavaScript, the modulus operator returns the integer remainder of
          division between two numbers, with the sign of the first number. So
          -10 % 3 = -1 whereas 10 % 3 = 1. For this reason, if outAngle is less
          than 0, then we must add upperBound to outAngle to ensure the final
          result is greater than 0. For more information on the modulus operator see
          https://developer.mozilla.org/en/JavaScript/Reference/Operators/Arithmetic_Operators
        */
        if (outAngle < 0) {
          outAngle += upperBound;
        }
  
        return outAngle;
      }
  
  
      module.exports.unitsToScreen = unitsToScreen;
      module.exports.screenToUnits = screenToUnits;
      module.exports.getMultiplier = getMultiplier;
      module.exports.calculateGPS = calculateGPS;
      module.exports.resolveAngle = resolveAngle;
  }());
  

  provide("tracker-display/js/conversion", module.exports);
  provide("tracker-display/js/conversion", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/uiSettings as tracker-display/js/uiSettings
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      var eventHub = require('eventhub'),
          ender = require('ender'),
          localStorage = window.localStorage || {},
          uiDefaults = {
              fieldOfView: {
                  lineWidth: 2
              },
              grid: {
                  lineWidth: 2,
                  fontSize: "20pt",
                  fontFamily: "SpotterRF Sans",
                  fontWeight: "bold",
                  textAlign: "left",
                  textBaseline: "bottom",
                  textSpacing: 5
              },
              item: {
                  //segmentColor: "#cc5500",
                  segmentLineWidth: 1,
                  //textColor: "#990000",
                  font: "12pt SpotterRF Sans",
                  radius: 7,
                  lineWidth: 2
              },
              trackerDisplay: {
                  enableFieldOfView: true,
                  enableTrail: true,
                  enableCoordinates: false,
                  enableScale: true,
                  enableTrackID: true,
                  enableCoordinates: false,
                  displayTrackInfo: 'always',
                  angleRelativeTo: 'boresight',
                  speedUnits: 'mph'
              }
          },
          themes = {
              'night': {
                  fieldOfView: {
                      stroke: 'rgba(203, 75, 22, .4)'
                  },
                  grid: {
                      stroke: 'rgba(0, 43, 54, .6)',
                      textColor: 'rgba(203, 75, 22, .6)'
                  },
                  zones: {
                      alert: {
                          fill: '#300000'
                      },
                      ignore: {
                          fill: 'rgba(70, 75, 80, .7)'
                      },
                      exclusion: {
                          fill: 'rgba(70, 144, 255, .7)'
                      }
                  },
                  trackerDisplay: {
                      fill: 'rgba(0, 0, 0, 1)'
                  }
              },
              'day': {
                  fieldOfView: {
                      stroke: 'rgba(203, 75, 22, 1)'
                  },
                  grid: {
                      stroke: 'rgb(70, 75, 80)',
                      textColor: 'rgb(7, 54, 66)'
                  },
                  zones: {
                      alert: {
                          fill: 'rgba(120, 50, 50, 1)'
                      },
                      ignore: {
                          fill: 'rgba(70, 75, 80, .7)'
                      },
                      exclusion: {
                          fill: 'rgba(70, 144, 255, .7)'
                      }
                  },
                  trackerDisplay: {
                      fill: 'rgba(253, 246, 227, 1)'
                  }
              }
          },
          uiSettings = {},
          trackerDisplayUI = 'trackerDisplayUI' in localStorage && JSON.parse(localStorage['trackerDisplayUI']) || {},
          fovUI = 'fovUI' in localStorage && JSON.parse(localStorage['fovUI']) || {},
          gridUI = ('gridUI' in localStorage && JSON.parse(localStorage['gridUI'])) || {},
          itemUI = 'itemUI' in localStorage && JSON.parse(localStorage['itemUI']) || {},
          zonesUI = 'zonesUI' in localStorage && JSON.parse(localStorage['zonesUI']) || {},
          currentTheme = localStorage['theme'] || 'day';
  
      function mergeSettings(defaults, current) {
        if (typeof current === 'undefined') {
          return current;
        }
  
        Object.keys(defaults).forEach(function (key) {
          if (typeof current[key] === 'undefined' || typeof defaults[key] !== typeof current[key]) {
            current[key] = defaults[key];
          } else if (typeof defaults[key] === 'object') {
            current[key] = mergeSettings(defaults[key], current[key]);
          }
        });
  
        return current;
      }
  
      function combine(a, b) {
        var ret = {};
        if (typeof a !== 'object') {
          a = {};
        }
        if (typeof b !== 'object') {
          b = {};
        }
  
        ret = JSON.parse(JSON.stringify(a));
        Object.keys(b).forEach(function (key) {
          ret[key] = b[key];
        });
  
        return ret;
      }
  
      function changeTheme(theme, permanent) {
          theme = theme || currentTheme;
  
          // please note, this is a terrible hack
          // it's better to disable/enable stylesheets, but Safari 5.1 doesn't like this
          ender('link[title=theme]').attr('href', 'css/themes/' + theme + '.css');
  
          if (permanent) {
              currentTheme = theme;
              localStorage['theme'] = theme;
          }
  
          // change colors
          Object.keys(themes[theme]).forEach(function (componentKey) {
              var newProps = themes[theme][componentKey],
                  component = uiSettings[componentKey];
  
              Object.keys(newProps).forEach(function (key) {
                  component[key] = newProps[key];
              });
          });
  
          eventHub.emit('redraw');
      }
  
      eventHub.on('changeThemeTemp', function (theme) {
          changeTheme(theme);
      });
  
      eventHub.on('changeTheme', function (theme) {
          changeTheme(theme, true);
      });
  
      mergeSettings(combine(uiDefaults.trackerDisplay, themes[currentTheme].trackerDisplay), trackerDisplayUI);
      mergeSettings(combine(uiDefaults.fieldOfView, themes[currentTheme].fieldOfView), fovUI);
      mergeSettings(combine(uiDefaults.grid, themes[currentTheme].grid), gridUI);
      gridUI.__defineGetter__('font', function () {
          return gridUI.fontWeight + ' ' + gridUI.fontSize + ' ' + gridUI.fontFamily;
      });
      mergeSettings(combine(uiDefaults.item, themes[currentTheme].item), itemUI);
      mergeSettings(combine(uiDefaults.zone, themes[currentTheme].zone), zonesUI);
  
      uiSettings = {
          get trackerDisplay() {
              return trackerDisplayUI;
          },
          set trackerDisplay(val) {
              trackerDisplayUI = val;
              localStorage['trackerDisplayUI'] = JSON.stringify(trackerDisplayUI);
          },
          get fieldOfView() {
              return fovUI;
          },
          set fieldOfView(val) {
              fovUI = val;
              localStorage['fovUI'] = JSON.stringify(fovUI);
          },
          get grid() {
              return gridUI;
          },
          set grid(val) {
              Object.keys(val).forEach(function (key) {
                  try {
                      gridUI[key] = val[key];
                  } catch (e) {
                      // if it's not settable...
                  }
              });
  
              localStorage['gridUI'] = JSON.stringify(gridUI);
          },
          get item() {
              return itemUI;
          },
          set item(val) {
              itemUI = val;
              localStorage['itemUI'] = JSON.stringify(itemUI);
          },
          get zones() {
              return zonesUI;
          },
          set zones(val) {
              zonesUI = val;
              localStorage['zonesUI'] = JSON.stringify(zonesUI);
          },
          get theme() {
              return currentTheme;
          }
      };
  
      // TODO: fix weird Chrome bug where themes don't get all the way applied...
      ender.domReady(function fixCss() {
          var seconds = 3;
  
          changeTheme(currentTheme);
      });
  
      module.exports = uiSettings;
  }());
  

  provide("tracker-display/js/uiSettings", module.exports);
  provide("tracker-display/js/uiSettings", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/version as tracker-display/js/version
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
  	module.exports = {
  		version: '3.0.6',
  		build: '2012-03-09'
  	};
  }());

  provide("tracker-display/js/version", module.exports);
  provide("tracker-display/js/version", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/dep/libcanvas-functions as tracker-display/dep/libcanvas-functions
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
  	"use strict";
  
  	function ellipse(x, y, xDis, yDis) {
  		var kappa = 0.5522848,
  			ox = xDis * kappa,  // control point offset horizontal
  			oy = yDis * kappa,  // control point offset vertical
  			xe = x + xDis,      // x-end
  			ye = y + yDis;      // y-end
  
  		this.moveTo(x - xDis, y);
  		this.bezierCurveTo(x - xDis, y - oy, x - ox, y - yDis, x, y - yDis);
  		this.bezierCurveTo(x + ox, y - yDis, xe, y - oy, xe, y);
  		this.bezierCurveTo(xe, y + oy, x + ox, ye, x, ye);
  		this.bezierCurveTo(x - ox, ye, x - xDis, y + oy, x - xDis, y);
  	}
  
  	module.exports.ellipse = ellipse;
  }());
  

  provide("tracker-display/dep/libcanvas-functions", module.exports);
  provide("tracker-display/dep/libcanvas-functions", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/item as tracker-display/js/item
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var conversion =  require('tracker-display/js/conversion'),
          coordinator = require('coordinator'),
          eventHub = require('eventhub'),
          EventEmitter = require('events').EventEmitter,
          convFn = coordinator('latlong', 'mgrs'),
          uiSettings =  require('tracker-display/js/uiSettings'),
          itemEmitter = new EventEmitter(),
          friendlyColor = 'rgb(0, 0, 255)';
  
  /* aabbggrr
  static int kml_Colors[]=
  {
      0xff0000ff,
      0xffff0000,
      0xff00ff00,
      0xff00ffff,
      0xffff00ff,
      0xffffff00,
      0xffffffff,
      0xff83FAF6,
      0xffE824DB,
      0xffffaa55,
      0xff0290e7,
  };
  */
  
      function Item(data, coordinateBounds, bounds) {
          var self = this;
  
          this.id = data.id;
          this.route = [];
          this.stroke = Item.colors[this.id % 8] || "#FFFFFF";
          this.doDraw = true;
  
          this.bottomLeft = {
              x: coordinateBounds.minX,
              y: coordinateBounds.minY
          };
  
          this.topRight = {
              x: coordinateBounds.maxX,
              y: coordinateBounds.maxY
          };
  
          this.bounds = bounds;
  
          this.update(data);
      }
  
      Item.prototype = {
          drawHead: function (g) {
              var routePoint = this.route[this.route.length - 1],
                  screenPoint = routePoint.screenPoint,
                  radius = uiSettings.item.radius,
                  segLength = radius,
                  left, right, top, bottom,
                  // use background color, but a little transparent
                  bgColor = uiSettings.trackerDisplay.fill.replace(/\d*\.?\d*\)$/, '.7)');
  
              if (!this.doDraw) {
                  return;
              }
  
              // if we're friendly, just draw a blue circle
              if (this.disposition === 'friendly') {
                  // draw semi-transparent background
                  g.beginPath();
                  g.fillStyle = bgColor;
                  g.arc(screenPoint.x, screenPoint.y, radius + segLength, 0, Math.PI * 2);
                  g.fill();
                  g.closePath();
  
                  g.beginPath();
                  g.strokeStyle = 'rgba(0, 0, 255, 1)',
                  g.lineWidth = uiSettings.item.lineWidth + 1;
                  g.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2);
                  g.stroke();
                  g.closePath();
              } else {
                  left = screenPoint.x - radius;
                  right = screenPoint.x + radius;
                  top = screenPoint.y - radius;
                  bottom = screenPoint.y + radius;
  
                  g.lineWidth = uiSettings.item.lineWidth;
  
                  g.strokeStyle = uiSettings.item.segmentColor || this.stroke;
  
                  // draw semi-transparent background
                  g.beginPath();
                  g.fillStyle = bgColor;
                  g.rect(left - (segLength / 2), top - (segLength / 2), (radius * 2) + segLength, (radius * 2) + segLength);
                  g.fill();
                  g.closePath();
  
                  g.beginPath();
                  // left line
                  g.moveTo(left - (segLength / 2), screenPoint.y);
                  g.lineTo(left + (segLength / 2), screenPoint.y);
  
                  // right line
                  g.moveTo(right - (segLength / 2), screenPoint.y);
                  g.lineTo(right + (segLength / 2), screenPoint.y);
  
                  // top line
                  g.moveTo(screenPoint.x, top - (segLength / 2));
                  g.lineTo(screenPoint.x, top + (segLength / 2));
  
                  // bottom line
                  g.moveTo(screenPoint.x, bottom - (segLength / 2));
                  g.lineTo(screenPoint.x, bottom + (segLength / 2));
  
                  g.rect(left, top, radius * 2, radius * 2);
  
                  g.closePath();
  
                  g.stroke();
              }
  
              g.shadowColor = '';
              g.shadowOffsetX = 0;
              g.shadowOffsetY = 0;
              g.shadowBlur = 0;
          },
          drawLabel: function (g, doID, doCoordinates, doSpeed) {
              var point = this.route[this.route.length - 1],
                  screen = point.screenPoint,
                  mgrs = point.mgrs,
                  displayText = '',
                  offset = 10,
                  yOffset = 0,
                  speed = point.speed;
  
              if (!this.doDraw) {
                  return;
              }
  
              g.font = uiSettings.grid.font;
              g.shadowColor = uiSettings.trackerDisplay.fill;
              g.shadowOffsetX = 1;
              g.shadowOffsetY = 1;
              g.shadowBlur = 0;
              g.textBaseline = 'middle';
              g.fillStyle = uiSettings.item.textColor || uiSettings.item.segmentColor || this.stroke;
              g.lineWidth = uiSettings.item.lineWidth;
  
              if (doID) {
                  g.textAlign = 'right';
                  g.fillText(this.id, screen.x - offset - uiSettings.item.radius, screen.y + yOffset);
              }
  
              if (doCoordinates && mgrs) {
                  displayText = mgrs.zone + ' ' + mgrs.square + ' ' + mgrs.easting + ' ' + mgrs.northing;
  
                  g.textAlign = 'left';
                  g.fillText(displayText, screen.x + offset + uiSettings.item.radius, screen.y + yOffset);
                  yOffset += g.measureText('m').width;
              }
  
              if (doSpeed) {
                  displayText = '';
                  switch(uiSettings.trackerDisplay.speedUnits) {
                      case 'm/s':
                          speed = Math.round(speed * 10) / 10;
                          speed += ' m/s';
                          break;
                      case 'mph':
                          // meters per second -> mph
                          speed = Math.round(speed * 2.2369);
                          speed += ' mph';
                          break;
                      case 'kph':
                          // meters per second -> kph
                          speed = Math.round(speed * 3.6);
                          speed += ' kph';
                          break;
                  }
  
                  displayText += speed;
  
                  g.textAlign = 'left';
                  g.fillText(displayText, screen.x + offset + uiSettings.item.radius, screen.y + yOffset);
              }
  
              g.shadowColor = '';
              g.shadowOffsetX = 0;
              g.shadowOffsetY = 0;
              g.shadowBlur = 0;
          },
          drawTrail: function (g) {
              if (!this.doDraw) {
                  return;
              }
  
              g.beginPath();
              this.route.forEach(function (point) {
                  g.lineWidth = uiSettings.item.lineWidth;
                  g.strokeStyle = uiSettings.item.segmentColor || this.stroke;
                  g.lineTo(point.screenPoint.x, point.screenPoint.y);
                  g.stroke();
              }, this);
              g.closePath();
  
              g.shadowOffsetX = 0;
              g.shadowOffsetY = 1;
              g.shadowColor = '';
              g.shadowBlur = 0;
          },
          getPoint: function () {
              var i = this.route.length - 1;
  
              if (i >= 0) {
                  return this.route[i].screenPoint;
              }
          },
          /*
           * If the screen size changed (resize, orientation change, etc.)
           * we'll have to recalculate the screen points.
           */
          refactor: function (coordinateBounds, bounds) {
              this.bottomLeft = {
                  x: coordinateBounds.minX,
                  y: coordinateBounds.minY
              };
  
              this.topRight = {
                  x: coordinateBounds.maxX,
                  y: coordinateBounds.maxY
              };
  
              this.bounds = bounds;
  
              this.route.forEach(function (item) {
                  item.screenPoint = conversion.unitsToScreen(item.point, this.bottomLeft, this.topRight, this.bounds.width, this.bounds.height, this.bounds.xOffset, this.bounds.yOffset);
              }, this);
          },
          update: function (data) {
              var point,
                  screen,
                  routePoint,
                  mgrs,
                  angle,
                  range,
                  geoloc;
  
              // backwards compat
              if (typeof data.observation !== 'undefined') {
                  angle = data.observation.horizontalAngle;
                  range = data.observation.range;
              } else {
                  angle = data.boresight.angle;
                  range = data.boresight.range;
              }
  
              if (typeof data.geolocation !== 'undefined') {
                  geoloc = data.geolocation;
              } else {
                  geoloc = data.coords;
              }
  
              this.disposition = data.trackClassification || "unknown";
              this.type = data.trackType || "unknown";
  
              if (this.disposition === 'friendly') {
                  this.stroke = friendlyColor;
              }
  
              // don't allow weird angles above 180
              if (angle > 180) {
                  angle -= 360;
              } else if (angle < -180) {
                  angle += 360;
              }
  
              point = {
                  x: Math.sin(angle * Math.PI / 180) * range,
                  y: Math.cos(angle * Math.PI / 180) * range
              };
  
              screen = conversion.unitsToScreen(point, this.bottomLeft, this.topRight, this.bounds.width, this.bounds.height, this.bounds.xOffset, this.bounds.yOffset);
  
              try {
                  mgrs = convFn(geoloc.latitude, geoloc.longitude, 5, 'object');
              } catch (e) {
                  // this can happen if we get weird lat/long coords (backwards)
              }
  
              routePoint = {
                  point: point,
                  screenPoint: screen,
                  range: range,
                  angle: angle,
                  angleFromNorth: (360 + (Item.tracker.originAzimuth || 0) + angle) % 360,
                  speed: geoloc.speed,
                  latlong: geoloc,
                  mgrs: mgrs
              };
  
              this.route.push(routePoint);
          },
          updateAlertStatus: function (alertStatus) {
              this.doAlert = (alertStatus === 'alert');
              this.doDraw = (alertStatus !== 'ignore' && alertStatus !== 'exclusion');
          }
      };
  
      Item.colors = [                 //            colors in the KML; I changed a few =)
          'rgba(181, 137, 0, 1)',     // yellow     (0xff0087af)
          'rgba(180, 180, 180, 1)',   // light-grey (0xff005fd7)
          'rgba(50, 50, 50, 1)',      // dark-grey  (0xff0000d7)
          'rgba(211, 54, 130, 1)',    // magenta    (0xff5f00af)
          'rgba(108, 113, 196, 1)',   // violet     (0xffaf5f5f)
          'rgba(38, 139, 210, 1)',    // blue       (0xffff8700)
          'rgba(42, 161, 152, 1)',    // cyan       (0xffafaf00)
          'rgba(133, 153, 0, 1)'      // green      (0xff00875f)
      ];
  
      // if we have more than 100 tracks, then we have more problems than a memory leak
      itemEmitter.setMaxListeners(100);
      eventHub.register('track', itemEmitter);
  
      module.exports = Item;
  }());
  

  provide("tracker-display/js/item", module.exports);
  provide("tracker-display/js/item", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/grid as tracker-display/js/grid
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var eventHub = require('eventhub'),
          EventEmitter = require('events').EventEmitter,
          localStorage = window.localStorage || {},
          uiSettings =  require('tracker-display/js/uiSettings');
  
      function degToRadText(deg) {
          if (deg % 10 === 0) {
              return 'π / ' + (18 / (deg / 10));
          } else if (deg % 15 === 0) {
              return 'π / ' + (12 / (deg / 15));
          }
          console.error('Invalid degree:', deg);
          return deg * Math.PI / 180;
      }
  
      function degToMilText(deg) {
          // round the number to the nearest 100
          return Math.round(deg * 6400 / 360 / 100) * 100;
      }
  
      function Grid(gridScale, radialStepStart) {
          var self = this;
  
          this.scale = gridScale;
          this.radialStepStart = radialStepStart;
  
          eventHub.on('grid', 'uiChange', function (ui) {
              self.settings = uiSettings.grid;
          });
      }
  
      Grid.prototype = {
          // properties
  
          get tempSettings() {
              return this._tempSettings;
          },
          set tempSettings (val) {
              this._tempSettings = uiSettings.grid;
              Object.keys(val).forEach(function (key) {
                  this._tempSettings[key] = val[key];
              }, this);
          },
          get scale() {
              return this.gridScale || localStorage['gridScale'] || 100;
          },
          set scale(val) {
              if (typeof val !== 'undefined') {
                  localStorage['gridScale'] = val;
                  this.gridScale = val;
              }
          },
          get radialStepType() {
              return this._radialStepType || localStorage['radialStepType'] || 'degrees';
          },
          set radialStepType(val) {
              if (typeof val !== 'undefined') {
                  localStorage['radialStepType'] = val;
                  this._radialStepType = val;
              }
          },
          get radialStep() {
              return this._radialStep || localStorage['radialStep'] || 10;
          },
          set radialStep(val) {
              if (typeof val !== 'undefined') {
                  localStorage['radialStep'] = val;
                  this._radialStep = val;
              }
          },
          get radialStepStart() {
              return (typeof this._radialStepStart !== 'undefined') ? this._radialStepStart : localStorage['radialStepStart'] || 0;
          },
          set radialStepStart(val) {
              if (typeof val !== 'undefined') {
                  localStorage['radialStepStart'] = val;
                  this._radialStepStart = val;
              }
          },
          fieldOfView: {
              get depth() {
                  return this._depth || 0;
              },
              set depth(val) {
                  this._depth = val;
              },
              get breadth() {
                  return this._breadth || 0;
              },
              set breadth(val) {
                  this._breadth = val;
              },
              get offset() {
                  return this._offset || 0;
              },
              set offset(val) {
                  this._offset = val;
              },
              get yRadius() {
                  return (this.depth - this.offset) / 2;
              },
              get adjustedCenter() {
                  return this.yRadius + this.offset;
              },
              update: function (bounds, ratio) {
                  this.point = {
                      x: bounds.width / 2,
                      y: bounds.height - Math.round(this.adjustedCenter * ratio)
                  };
              }
          },
  
          // functions
  
          changeScale: function (gridScale, ratio) {
              this.scale = gridScale;
  
              this.increment = this.scale * ratio;
          },
          changeRadialStep: function (radialStepType, radialStep, radialStepStart) {
              if (radialStepType) {
                  this.radialStepType = radialStepType;
                  localStorage['radialStepType'] = radialStepType;
              }
  
              if (radialStep) {
                  this.radialStep = radialStep;
                  localStorage['radialStep'] = radialStep;
              }
  
              if (radialStepStart) {
                  this.radialStepStart = radialStepStart;
                  localStorage['radialStepStart'] = radialStepStart;
              }
          },
          drawFieldOfView: function (g, ratio) {
              var xDis, yDis;
  
              xDis = this.fieldOfView.breadth / 2 * ratio;
              yDis = this.fieldOfView.yRadius * ratio;
  
              g.beginPath();
  
              g.ellipse(this.fieldOfView.point.x, this.fieldOfView.point.y, xDis, yDis);
  
              if (uiSettings.fieldOfView.fill) {
                  g.fillStyle = uiSettings.fieldOfView.fill;
                  g.fill();
              }
  
              g.strokeStyle = uiSettings.fieldOfView.stroke;
              g.lineWidth = uiSettings.grid.lineWidth + 1;
              g.stroke();
  
              g.closePath();
          },
          /*
           * @param g- Drawing context
           * @param increment- pixels between each arc
           * @param ratio- magic number to turn meters to pixels
           * @param radialStepType- units of the radialStep (degrees, radians, mils; default 'degrees')
           * @param radialStep- degrees between each line (will be converted to radialStepType; default 15)
           * @param radialStepStart- degrees to start at (default 0)
           */
          drawRadial: function (g, increment) {
              var width, height, i, centerX, max, tRad, tmp, l, x, y, radialStep, text, yOffset, radialStepType, radialStepStart
                , angle
                , conversion =  require('tracker-display/js/conversion')
                ;
  
              radialStepType = this.radialStepType || 'degrees';
              radialStep = this.radialStep || 10;
              radialStepStart = this.radialStepStart || 0;
  
              width = this.endX - this.startX;
              height = this.endY - this.startY;
  
              max = Math.max(width, height) / increment / 2;
              centerX = this.startX + width / 2;
  
              g.shadowColor = 'rgba(203, 75, 22, .5)';
              g.shadowOffsetX = 1;
  
              l = max * 2;
              for (i = 1; i < l; i += 1) {
                  g.beginPath();
                  g.lineWidth = uiSettings.grid.lineWidth;
                  g.strokeStyle = uiSettings.grid.stroke;
                  g.arc(centerX, this.endY, increment * i, 0, Math.PI, true);
                  g.stroke();
                  g.closePath();
              }
  
              // draw 0°
              g.beginPath();
              g.lineWidth = uiSettings.grid.lineWidth;
              g.strokeStyle = uiSettings.grid.stroke;
              g.moveTo(this.centerX, this.endY);
              g.lineTo(this.centerX, this.startY);
              g.stroke();
              g.closePath();
  
              g.beginPath();
              g.font = uiSettings.grid.font;
              g.shadowColor = '';
              g.shadowOffsetX = 0;
              g.shadowBlur = 0;
              // weird, but this affects how thick the text is drawn
              g.lineWidth = 1;
              g.textBaseline = 'top';
              g.textAlign = 'center';
              g.strokeStyle = uiSettings.grid.textColor;
              g.fillStyle = uiSettings.grid.textColor;
              // make sure to get rid of any garbage
              text = parseInt(radialStepStart, 10);
              if (radialStepType === 'radians') {
                  text = degToRadText(text);
              } else if (radialStepType === 'mils') {
                  text = degToMilText(text);
              } else if (radialStepType === 'degrees') {
                  text = text + '°';
              }
              //g.strokeText(text, this.centerX, this.startY + 10);
              g.fillText(text, this.centerX, this.startY + 10);
              g.closePath();
  
              // convert to radians for math functions
              tRad = radialStep * Math.PI / 180;
              l = Math.PI / 2 / tRad;
              for (i = 1; i < l; i += 1) {
                  tmp = Math.tan(tRad * i);
  
                  x = tmp * height + this.centerX;
                  y = 0;
                  // we've gone out of the canvas
                  if (x > this.endX + this.startX) {
                      x = this.endX + this.startX;
                      y = height - (x - this.centerX) / tmp;
                  }
  
                  yOffset = (y <= this.startY) ? 10 : 0;
  
                  // draw positive
                  g.beginPath();
                  g.lineWidth = uiSettings.grid.lineWidth;
                  g.strokeStyle = uiSettings.grid.stroke;
                  g.shadowColor = 'rgba(203, 75, 22, .5)';
                  g.shadowOffsetX = 1;
                  g.moveTo(this.centerX, this.endY);
                  g.lineTo(x, y);
                  g.stroke();
                  g.closePath();
  
                  // make sure to get rid of any garbage
                  angle = Number(parseInt(radialStepStart, 10) + radialStep * i);
                  text = conversion.resolveAngle(angle);
                  if (radialStepType === 'radians') {
                      text = degToRadText(text);
                  } else if (radialStepType === 'mils') {
                      text = degToMilText(text);
                  } else if (radialStepType === 'degrees') {
                      text = text + '°';
                  }
  
                  g.beginPath();
                  g.strokeStyle = uiSettings.grid.textColor;
                  g.fillStyle = uiSettings.grid.textColor;
                  g.font = uiSettings.grid.font;
                  g.shadowColor = '';
                  g.shadowOffsetX = 0;
                  g.shadowBlur = 0;
                  g.lineWidth = 1;
                  g.textBaseline = 'top';
                  g.textAlign = 'right';
                  //g.strokeText(text + ' ', x, y + yOffset);
                  g.fillText(text + ' ', x, y + yOffset);
                  g.closePath();
  
                  if (y <= this.startY) {
                      x = (this.endX + this.startX) - x;
                  } else {
                      x = 0;
                  }
  
                  // draw negative
                  g.beginPath();
                  g.lineWidth = uiSettings.grid.lineWidth;
                  g.strokeStyle = uiSettings.grid.stroke;
                  g.shadowColor = 'rgba(203, 75, 22, .5)';
                  g.shadowOffsetX = 1;
                  g.moveTo(this.centerX, this.endY);
                  g.lineTo(x, y);
                  g.stroke();
                  g.closePath();
  
                  // make sure to get rid of any garbage
                  angle = Number(parseInt(radialStepStart, 10) - radialStep * i);
                  text = conversion.resolveAngle(angle);
                  // and keep things positive if we're in boresight mode
                  if (uiSettings.trackerDisplay.angleRelativeTo === 'boresight') {
                      text = Math.abs(text);
                  }
  
                  if (radialStepType === 'radians') {
                      text = degToRadText(text);
                  } else if (radialStepType === 'mils') {
                      text = degToMilText(text);
                  } else if (radialStepType === 'degrees') {
                      text = text + '°';
                  }
  
                  g.beginPath();
                  g.strokeStyle = uiSettings.grid.textColor;
                  g.font = uiSettings.grid.font;
                  g.shadowColor = '';
                  g.shadowOffsetX = 0;
                  g.shadowBlur = 0;
                  g.lineWidth = 1;
                  g.textBaseline = 'top';
                  g.textAlign = 'left';
                  //g.strokeText(' ' + text, x, y + yOffset);
                  g.fillText(' ' + text, x, y + yOffset);
                  g.closePath();
              }
  
              g.shadowColor = '';
              g.shadowOffsetX = 0;
              g.shadowBlur = 0;
          },
          draw: function (g, ratio, drawFieldOfView, enableScale) {
              var increment, self = this;
  
              if (typeof this.scale !== 'undefined') {
                  increment = this.scale * ratio;
              } else {
                  increment = this.increment;
              }
  
              this.drawRadial(g, increment);
  
              if (drawFieldOfView) {
                  this.drawFieldOfView(g, ratio);
              }
  
              this.drawScale(g, this.scale, ratio, enableScale);
  
              // fonts aren't necessarily loaded yet
              ender(window).bind('load', function () {
                  self.draw(g, ratio, drawFieldOfView, enableScale);
              });
          },
          drawScale: function (g, gridScale, ratio, drawBoresightScale) {
              var width, height, textMetrics, textOffset, yStep, increment,
                  posStep, negStep, i, offset, textSpacing;
  
              gridScale = gridScale || this.scale;
              increment = gridScale ? gridScale * ratio : this.increment;
  
              width = this.endX - this.startX;
              height = this.endY - this.startY;
  
              g.lineWidth = 1;
              g.font = uiSettings.grid.font;
              g.fillStyle = uiSettings.grid.textColor;
              g.strokeStyle = uiSettings.grid.textColor;
  
              textSpacing = uiSettings.grid.textSpacing;
              offset = width / 2;
  
              if (drawBoresightScale) {
                  // along the boresight
                  for (i = Math.round(height / increment) - 1; i >= 0; i -= 1) {
                      yStep = this.startY + Math.round(increment * i);
                      textMetrics = g.measureText(gridScale * i);
                      textOffset = textMetrics.width + textSpacing;
  
                      g.textBaseline = 'top';
                      g.shadowColor = '';
                      g.shadowOffsetX = 0;
                      g.shadowBlur = 0;
                      if (i === 0) {
                          continue;
                      }
                      g.textAlign = 'center';
                      //g.strokeText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                      g.fillText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                      //g.strokeText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                      g.fillText(gridScale * i, this.startX + offset, height - yStep, textOffset);
                  }
              }
  
              width += this.startX * 2;
  
              // on the bottom of the display
              for (i = 0; i <= width / increment / 2; i += 1) {
                  posStep = this.centerX + Math.round(increment * i);
                  negStep = this.centerX - Math.round(increment * i);
  
                  g.textAlign = 'center';
                  g.textBaseline = 'bottom';
                  g.shadowColor = '';
                  g.shadowOffsetX = 0;
                  g.shadowBlur = 0;
  
                  //g.strokeText(gridScale * i, posStep, height);
                  g.fillText(gridScale * i, posStep, height);
                  //g.strokeText(gridScale * i, negStep, height);
                  g.fillText(gridScale * i, negStep, height);
              }
  
              g.shadowColor = '';
              g.shadowOffsetX = 0;
              g.shadowBlur = 0;
          },
          update: function (bounds, ratio) {
              this.startX = bounds.xOffset;
              this.startY = 0;
              this.endX = bounds.width;
              this.endY = bounds.height;
  
              this.centerX = Math.round((this.endX - this.startX) / 2) + bounds.xOffset;
  
              this.increment = this.scale * ratio;
          }
  
      };
  
      eventHub.register('grid', new EventEmitter());
  
      module.exports = Grid;
  }());
  

  provide("tracker-display/js/grid", module.exports);
  provide("tracker-display/js/grid", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/zone as tracker-display/js/zone
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var conversion =  require('tracker-display/js/conversion'),
          uiSettings =  require('tracker-display/js/uiSettings').zones,
          validTypes = ['alert', 'ignore', 'exclusion'],
          validShapes = ['rectangle', 'arc'],
          deleteBoxSize = 20;
  
      /*
       * Get whether the given point is in the given rectangle.
       *
       * @r- Rectangle. Must have these properties [minX, minY, maxX, maxY]
       * @p- Point. Must have these properties [x, y]
       * @return True if the point is in the rectangle, false otherwise
       */
      function pointInRect(r, p) {
          var minX = Math.min(r[0].x, r[1].x),
              minY = Math.min(r[0].y, r[1].y),
              maxX = Math.max(r[0].x, r[1].x),
              maxY = Math.max(r[0].y, r[1].y);
  
          if (minX <= p.x && maxX >= p.x && minY <= p.y && maxY >= p.y) {
              return true;
          }
          return false;
      }
  
      /*
       * Creates a new zone.
       * 
       * @param type- alert or ignore
       * @param shape- rectangle or arc (only currently supported shapes)
       * @param data- data specific to the shape
       * @param ratio- ratio for converting meters to pixels
       * @param origin- screen point of where this zone is relative to (tracker)
       */
      function Zone(type, shape, data, ratio, origin) {
          if (validTypes.indexOf(type) < 0) {
              throw 'Invalid type passed to Zone: ' + type;
          }
  
          if (validShapes.indexOf(shape) < 0) {
              throw 'Invalid shape passed to Zone: ' + shape;
          }
  
          this.type = type;
          this.shape = shape;
  
          this.update(data, ratio, origin);
      }
  
      Zone.prototype = {
          get shape() { return this._shape; },
          set shape(val) {
              if (typeof val === 'string' && validShapes.indexOf(val) >= 0) {
                  this._shape = val;
              }
          },
          get type() { return this._type; },
          set type(val) {
              if (typeof val === 'string' && validTypes.indexOf(val) >= 0) {
                  this._type = val;
              }
          },
          /*
           * Checks to see if this alert-zone contains a point.
           *
           * @param point- Point in question, must have an x and a y
           * @return True if the point is within this zone, false otherwise.
           */
          contains: function (point) {
              if (this.shape === 'rectangle') {
                  return pointInRect(this.screen, point);
              }
              return false;
          },
          draw: function (g, mode) {
              if (this.type === 'alert') {
                  g.fillStyle = uiSettings.alert.fill;
              } else if (this.type === 'ignore'){
                  g.fillStyle = uiSettings.ignore.fill;
              } else if (this.type === 'exclusion') {
                  g.fillStyle = uiSettings.exclusion.fill;
              }
  
              if (this.shape === 'rectangle') {
                  var minX = Math.min(this.screen[0].x, this.screen[1].x);
                  var minY = Math.min(this.screen[0].y, this.screen[1].y);
                  var maxX = Math.max(this.screen[0].x, this.screen[1].x);
                  var maxY = Math.max(this.screen[0].y, this.screen[1].y);
  
                  g.fillRect(minX, minY, maxX - minX, maxY - minY);
  
                  if (mode === 'delete') {
                      g.beginPath();
                      g.strokeStyle = 'black';
                      g.lineWidth = 3;
                      g.moveTo(this.screen[0].x, this.screen[0].y);
                      g.lineTo(this.screen[1].x, this.screen[1].y);
                      
                      g.moveTo(this.screen[1].x, this.screen[0].y);
                      g.lineTo(this.screen[0].x, this.screen[1].y);
                      g.stroke();
                      g.closePath();
                  }
              } else if (this.shape === 'arc') {
                  g.beginPath();
                  g.arc(this.origin.x, this.origin.y, this.screen.end, 0, Math.PI, true);
                  g.arc(this.origin.x, this.origin.y, this.screen.start, Math.PI, 0, false);
                  g.closePath();
                  g.fill();
              }
          },
          refactor: function (origin, ratio) {
              if (this.shape === 'rectangle') {
                  this.screen = this.rect.map(function (point) {
                      return {
                          x: (point.x * ratio) + origin.x,
                          y: origin.y - (point.y * ratio)
                      };
                  });
  
                  console.log(JSON.stringify(this.screen, null, '  '));
                  console.log(JSON.stringify(this.rect, null, '  '));
                  console.log();
                  console.log();
                  console.log();
                  console.log();
              }
          },
          update: function (data, ratio, origin) {
              switch (this.shape) {
                  case 'arc':
                      this.range = {
                          start: data.start,
                          end: data.end
                      };
  
                      this.screen = {
                          start: data.start * ratio,
                          end: data.end * ratio
                      };
                      this.origin = origin;
                      break;
  
                  case 'rectangle':
                  default:
                      this.rect = [
                          {
                              x: (data[0].x - origin.x) / ratio,
                              y: (origin.y - data[0].y) / ratio
                          },
                          {
                              x: (data[1].x - origin.x) / ratio,
                              y: (origin.y - data[1].y) / ratio
                          }
                      ];
  
                      // data is array of screen points, just what we need
                      // we'll copy it just in case
                      this.screen = data.slice(0);
                      break;
              }
          }
      };
  
      module.exports = Zone;
  }());
  

  provide("tracker-display/js/zone", module.exports);
  provide("tracker-display/js/zone", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/notifier as tracker-display/js/notifier
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
      var ender = require('ender'),
          initialized;
  
      function init() {
          ender.domReady(function () {
              ender('<div>').attr('id', 'notify-div').appendTo('body');
  
              ender('#notify-div').delegate('.notification', 'click', function () {
                  ender(this).remove();
              });
          });
          
          initialized = true;
          
          return notify;
      }
  
      function notify(stuffs, appendTo) {
          var tNotification,
              closeButton,
              closeWrapper;
  
          if (!initialized) {
              init();
          }
  
          tNotification = ender('<div>').addClass('notification');
          tNotification.append(stuffs);
  
          if (appendTo) {
              tNotification.insertAfter(appendTo);
          } else {
              ender('#notify-div').prepend(tNotification);
          }
      }
  
      module.exports = init;
      module.exports.notify = notify;
  }());
  
  

  provide("tracker-display/js/notifier", module.exports);
  provide("tracker-display/js/notifier", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/modules/setup as tracker-display/js/modules/setup
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
      var eventHub = require('eventhub'),
          ender = require('ender'),
          uiSettings =  require('tracker-display/js/uiSettings'),
          updateBearingTimeout,
          updateAngleCalibrationTimeout,
          phaseCalibrationOffset,
          bearingStep = 1,
          phaseCalibrationStep = 1;
  
      function bindSettingsEvents(tTrackerDisplay) {
          // settings button and events
          ender('#setup-button').bind('click', function () {
  
              ender('#scale').val(String(tTrackerDisplay.grid.scale));
              ender('#radial-unit').val(tTrackerDisplay.grid.radialStepType);
  
              ender('#spotter-addr').val(tTrackerDisplay.spotterAddress);
              ender('#spotter-model').val(tTrackerDisplay.spotterModel);
  
              ender('.radial-step').hide();
              ender('#radial-step-' + tTrackerDisplay.grid.radialStepType).show().val(String(tTrackerDisplay.grid.radialStep || 15));
  
              ender('#settings-div').css({'display': 'block'});
  
              ender('input[name=displayTrackInfo][value=' + uiSettings.trackerDisplay.displayTrackInfo + ']').attr('checked', 'true');
              ender('#angle-relative-' + tTrackerDisplay.settings.angleRelativeTo + '').attr('checked', 'true');
  
              ender('#style-grid-width').val(String(uiSettings.grid.lineWidth || 1));
              ender('#style-grid-font-size').val(String(uiSettings.grid.fontSize || '12pt'));
  
  /*
              if (uiSettings.grid.fontWeight === 'bold') {
                  ender('#style-grid-font-bold').attr('checked', true);
              } else if (uiSettings.grid.fontWeight === 'bolder') {
                  ender('#style-grid-font-bolder').attr('checked', true);
              } else {
                  ender('#style-grid-font-normal').attr('checked', true);
              }
  */
    
              ender('#boresight').html(String(tTrackerDisplay.originAzimuth));
  
              eventHub.emit('modalLoad');
          });
  
          ender('.adj-boresight').bind('click', function () {
            var elem = $(this)
              , azimuth
              , conversion =  require('tracker-display/js/conversion');
              ;
  
            if (updateAngleCalibrationTimeout) {
              clearTimeout(updateAngleCalibrationTimeout);
              updateAngleCalibrationTimeout = null;
            }
  
            if (elem.data('direction') === 'right') {
              tTrackerDisplay.originAzimuth += bearingStep;
            } else {
              tTrackerDisplay.originAzimuth -= bearingStep;
            }
  
            try {
              azimuth = Number(tTrackerDisplay.originAzimuth); 
              tTrackerDisplay.originAzimuth = conversion.resolveAngle(azimuth);
            } catch (e) {
              console.error(e.toString());
            }
  
            tTrackerDisplay.grid.radialStepStart = tTrackerDisplay.originAzimuth;
  
            $('#boresight').html(String(tTrackerDisplay.originAzimuth));
  
            // wait a couple seconds before actually saving anything
            updateBearingTimeout = setTimeout(function () {
              $.ajax({
                url: tTrackerDisplay.spotterAddress + '/geolocation.json/settings',
                method: 'post',
                crossOrigin: true,
                type: 'json',
                data: {bearing: tTrackerDisplay.originAzimuth},
                success: function (data) {
                  if (!data) {
                    console.error('No data returned from request to set geolocation settings');
                    return;
                  }
  
                  if (data.error) {
                    console.error('Error setting geolocation settings:', data.errors);
                    return;
                  }
  
                  if (data.success) {
                    console.info('Geolocation settings successfully saved:', data.result);
                    return;
                  }
                },
                error: function () {
                  console.error('Error POSTing to geolocation.json');
                }
              });
            }, 1000 * 3);
  
            eventHub.emit('redraw', 'grid');
          });
  
          ender('.adj-angle-calibration').bind('click', function () {
            var elem = $(this);
  
            if (updateAngleCalibrationTimeout) {
                clearTimeout(updateAngleCalibrationTimeout);
                updateAngleCalibrationTimeout = null;
            }
  
            // the direction we want the tracks to go
            if (elem.data('direction') === 'right') {
                phaseCalibrationOffset -= phaseCalibrationStep;
            } else {
                phaseCalibrationOffset += phaseCalibrationStep;
            }
  
            $('#angle-calibration').html(String(-phaseCalibrationOffset));
  
            // wait a bit before actually saving anything
            updateAngleCalibrationTimeout = setTimeout(function () {
              $.ajax({
                url: tTrackerDisplay.spotterAddress + '/sensor.json/settings',
                method: 'post',
                crossOrigin: true,
                type: 'json',
                data: {phaseCalibrationOffset: phaseCalibrationOffset},
                success: function (data) {
                  if (!data) {
                    console.error('No data returned from request to set geolocation settings');
                    return;
                  }
  
                  if (data.error) {
                    console.error('Error setting geolocation settings:', data.errors);
                    return;
                  }
  
                  if (data.success) {
                    console.info('Geolocation settings successfully saved:', data.result);
                    return;
                  }
                },
                error: function () {
                  console.error('Error POSTing to geolocation.json');
                }
              });
            }, 1000 * 1);
          });
          ender('#settings-cancel').bind('click', function () {
              ender('#settings-div').css('display', 'none');
              tTrackerDisplay.tempSettings = null;
              tTrackerDisplay.draw();
           
              eventHub.emit('modalClose');
          });
  
          ender('#style-grid-font-size').bind('change', function (e) {
              var tSettings = uiSettings.grid;
              tSettings.fontSize = ender(e.target).val();
              uiSettings.grid = tSettings;
  
              eventHub.emit('redraw', 'grid');
              eventHub.emit('fontChanged', uiSettings.grid.font);
          });
  
          ender('#style-grid-fontweight').bind('change', function (e) {
              var tSettings = uiSettings.grid;
              tSettings.fontWeight = ender('input[name=' + ender(e.target).attr('name') + ']:checked').val();
              uiSettings.grid = tSettings;
  
              eventHub.emit('redraw', 'grid');
              eventHub.emit('fontChanged', uiSettings.grid.font);
          });
  
          ender('#style-grid-width').bind('change', function (e) {
              var tSettings = uiSettings.grid;
              tSettings.lineWidth = +ender(e.target).val();
              uiSettings.grid = tSettings;
  
              eventHub.emit('redraw', 'grid');
          });
  
          ender('#settings-defaults').bind('click', function () {
              if (confirm('Are you sure you want to reset all settings to factory defaults?')) {
                  localStorage.clear();
                  window.location.reload();
              }
          });
  
          ender('input[name=displayTrackInfo]').bind('change', function () {
              var tSettings = tTrackerDisplay.settings;
              tSettings.displayTrackInfo = ender(this).val();
              tTrackerDisplay.settings = tSettings;
              tTrackerDisplay.draw();
          });
          ender('input[name=angle-relative]').bind('change', function () {
              var val = ender(this).val(),
                  tSettings = tTrackerDisplay.settings;
  
              if (val === 'north') {
                  tTrackerDisplay.grid.radialStepStart = tTrackerDisplay.originAzimuth;
              } else {
                  tTrackerDisplay.grid.radialStepStart = 0;
              }
              tSettings.angleRelativeTo = val;
              tTrackerDisplay.settings = tSettings;
  
              tTrackerDisplay.drawGrid();
          });
          ender('#spotter-model').bind('change', function () {
              tTrackerDisplay.spotterModel = ender('#spotter-model').val();
              tTrackerDisplay.draw();
          });
          ender('#speedUnits').bind('change', function () {
              var tSettings = tTrackerDisplay.settings;
              tSettings.speedUnits = ender('#speedUnits').val();
              tTrackerDisplay.settings = tSettings;
  
              tTrackerDisplay.draw();
          });
          ender('#scale').bind('change', function () {
              tTrackerDisplay.grid.scale = ender('#scale').val();
              tTrackerDisplay.drawGrid();
          });
          ender('#radial-unit').bind('change', function () {
              var val = ender(this).val(), elem, curStep,
                  matchFound, closest;
  
              ender('.radial-step').hide();
              tTrackerDisplay.grid.radialStepType = val;
  
              elem = ender('#radial-step-' + val).show();
              curStep = +tTrackerDisplay.grid.radialStep;
  
              // approximate the closest value for the new angle type
              elem.children('option').each(function () {
                  var val = +ender(this).val();
  
                  if (curStep === val) {
                      closest = val;
                      matchFound = true;
                  } else if (!matchFound) {
                      if (Math.abs(val - curStep) < Math.abs(closest - curStep) || !closest) {
                          closest = val;
                      }
                  }
              });
  
              elem.val(String(closest));
  
              tTrackerDisplay.grid.radialStep = elem.val();
              tTrackerDisplay.drawGrid();
          });
          ender('.radial-step').bind('change', function () {
              tTrackerDisplay.grid.radialStep = +ender(this).val();
              tTrackerDisplay.grid.radialStepStart = tTrackerDisplay.settings.angleRelativeTo === 'north' ? tTrackerDisplay.originAzimuth : 0;
              tTrackerDisplay.drawGrid();
          });
          ender('#spotter-addr').bind('keypress', function (e) {
              if (e.keyCode === 13) {
                  ender(this).trigger('blur');
              }
          });
          ender('#spotter-addr').bind('blur', function () {
              var newAddr = ender('#spotter-addr').val(),
                  regex = /^(http:\/\/)?(.*)\\?$/,
                  tmp;
              
              tmp = newAddr.match(regex)[2];
              if (tmp !== tTrackerDisplay.spotterAddress.match(regex)[2]) {
                  tmp = confirm('The spotter address will be changed from\n\n"' + tTrackerDisplay.spotterAddress + '"\n\nto\n\n"' + newAddr + '"\n\nAre you sure you want to do this?');
                  if (!tmp) {
                      return;
                  }
              
                  tTrackerDisplay.spotterAddress = newAddr;
              }
          });
  
          ender.ajax({
              url: tTrackerDisplay.spotterAddress + '/sensor.json/settings',
              method: 'get',
              crossOrigin: true,
              type: 'json',
              success: function (data) {
                  if (data && data.result && data.result) {
                      phaseCalibrationOffset = data.result.phaseCalibrationOffset || 0;
                      $('#angle-calibration').html(String(-phaseCalibrationOffset));
                  }
              },
              error: function () {
                  console.warn('Couldn\'t get angular calibration data');
              }
          });
      }
  
  
      module.exports.init = function (options) {
          bindSettingsEvents(options.trackerDisplay);
      };
  }());
  

  provide("tracker-display/js/modules/setup", module.exports);
  provide("tracker-display/js/modules/setup", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/modules/settings as tracker-display/js/modules/settings
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
      var eventHub = require('eventhub'),
          ender = require('ender'),
          uiSettings =  require('tracker-display/js/uiSettings'),
          gridUI = {},
          trackUI = {};
  
      module.exports.init = function (options) {
          ender('#settings-button').bind('click', function () {
              ender('#style-div').css('display', 'block');
              eventHub.emit('modalLoad');
  
              ender('#style-theme').val(uiSettings.theme);
  
              ender('#showScale')[0].checked = uiSettings.trackerDisplay.enableScale;
  
              ender('#showTrail')[0].checked = uiSettings.trackerDisplay.enableTrail;
              ender('#showTrackID')[0].checked = uiSettings.trackerDisplay.enableTrackID;
              ender('#showCoordinates')[0].checked = uiSettings.trackerDisplay.enableCoordinates;
  //            ender('#showSpeed')[0].checked = uiSettings.trackerDisplay.enableSpeed;
              ender('.displayTrackInfo[value=' + options.trackerDisplay.displayTrackInfo + ']').attr('checked', true);
  
              Object.keys(uiSettings.item).forEach(function (key) {
                  trackUI[key] = uiSettings.item[key];
              });
              ender('#style-track-size').val(String(trackUI.radius || 5));
              ender('#style-track-width').val(String(trackUI.lineWidth || 1));
  
              Object.keys(uiSettings.grid).forEach(function (key) {
                  gridUI[key] = uiSettings.grid[key];
              });
          });
  
          ender('#style-theme').bind('change', function () {
              eventHub.emit('changeTheme', ender(this).val());
          });
  
          ender('#showScale').bind('click', function () {
              var tSettings = uiSettings.trackerDisplay;
              tSettings.enableScale = this.checked;
              uiSettings.trackerDisplay = tSettings;
  
              eventHub.emit('redraw', 'grid');
          });
  
          ender('#showTrail').bind('click', function () {
              var tSettings = uiSettings.trackerDisplay;
              tSettings.enableTrail = this.checked;
              uiSettings.trackerDisplay = tSettings;
  
              eventHub.emit('redraw', 'tracks');
          });
  
          ender('#showTrackID').bind('click', function () {
              var tSettings = uiSettings.trackerDisplay;
              tSettings.enableTrackID = this.checked;
              uiSettings.trackerDisplay = tSettings;
  
              eventHub.emit('redraw', 'tracks');
          });
  
          ender('#showCoordinates').bind('click', function () {
              var tSettings = uiSettings.trackerDisplay;
              tSettings.enableCoordinates = this.checked;
              uiSettings.trackerDisplay = tSettings;
  
              eventHub.emit('redraw', 'tracks');
          });
  
  /*
          ender('#showSpeed').bind('click', function () {
              var tSettings = uiSettings.trackerDisplay;
              tSettings.enableSpeed = this.checked;
              uiSettings.trackerDisplay = tSettings;
  
              eventHub.emit('redraw', 'tracks');
          });
  */
  
          ender('input[name=displayTrackInfo]').bind('change', function () {
              console.log('Change', ender(this).val());
              options.trackerDisplay.displayTrackInfo = ender(this).val();
          });
  
          ender('#style-close').bind('click', function () {
              ender('#style-div').css('display', 'none');
              eventHub.emit('modalClose');
              eventHub.emit('changeTheme');
          });
  
          ender('#style-track-width').bind('change', function (e) {
              trackUI.lineWidth = +ender(e.target).val();
              uiSettings.item = trackUI;
              eventHub.emit('redraw', 'tracks');
          });
  
          ender('#style-track-size').bind('change', function (e) {
              trackUI.radius = +ender(e.target).val();
              uiSettings.item = trackUI;
              eventHub.emit('redraw', 'tracks');
          });
      };
  }());
  

  provide("tracker-display/js/modules/settings", module.exports);
  provide("tracker-display/js/modules/settings", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/modules/zone-settings as tracker-display/js/modules/zone-settings
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      var eventHub = require('eventhub'),
          ender = require('ender'),
          uiSettings =  require('tracker-display/js/uiSettings').zones,
          tTrackerDisplay,
          startPoint,
          curPoint,
          modal = false,
          zoneType,
          curID;
  
      function getPoint(e) {
          var x, y;
  
          if (e.touches) {
              if (e.touches.length === 1) {
                  x = e.touches[0].pageX;
                  y = e.touches[0].pageY;
              } else if (e.touches.length === 0 && e.changedTouches.length === 1) {
                  x = e.changedTouches[0].pageX;
                  y = e.changedTouches[0].pageY;
              }
          } else if (e.pageX || e.pageY) {
              x = e.pageX;
              y = e.pageY;
          } else if (e.clientX || e.clientY) {
              x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
              y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
          }
  
          return {x: x, y: y};
      }
  
      function dragHandler(e) {
          e.preventDefault();
          e.stopPropagation();
  
          curPoint = getPoint(e);
  
          tTrackerDisplay.updateZone(curID, [startPoint, curPoint]);
          eventHub.emit('redraw', 'zones');
      }
  
      function dragStartHandler(e) {
          // just give something to start off with
          startPoint = curPoint = getPoint(e);
  
          curID = tTrackerDisplay.addZone([startPoint, curPoint], ender('#create-alertzone').attr('data-toggled') ? 'alert' : 'ignore', 'rectangle');
  
          ender('#tracks,div').bind('mousemove', dragHandler);
          ender('#tracks,div').bind('touchmove', dragHandler);
      }
  
      function dragEndHandler() {
          ender('#create-' + zoneType + 'zone').trigger('click');
  
      }
  
      function bindZoneEvents() {
          // alert-zone button
          ender('#zone-button').bind('click', function () {
              modal = true;
  
              ender('#zone-div').css('display', 'block');
  
              eventHub.emit('modalLoad');
          });
  
          ender('#zone-cancel').bind('click', function () {
              modal = false;
  
              ender('#zone-div').css('display', 'none');
  
              eventHub.emit('modalClose');
  
              ender('#delete-zone').removeAttr('data-toggled').length;
              ender(document).unbind('click touchend', clickHandler);
              eventHub.emit('redraw', 'zones');
          });
  
          function stopBubble(e) {
              e.stopPropagation();
              e.preventDefault();
          }
  
          function toggleZoneButton() {
              var zoneButton = ender('#create-' + zoneType + 'zone'),
                  toggled = zoneButton.attr('data-toggled'),
                  alternateZone = (zoneType === 'alert') ? 'ignore' : 'alert',
                  alternateButton = ender('#create-' + alternateZone + 'zone');
  
              alternateButton.removeAttr('data-toggled').css('background-color', '');
  
              zoneButton.attr('data-toggled', toggled ? '' : true);
              toggled = !toggled;
  
              if (toggled) {
                  ender('#tracks,div').bind('mousedown touchstart', dragStartHandler);
  
                  ender('#tracks,div').bind('mouseup touchend touchcancel', dragEndHandler);
  
                  zoneButton.css('background-color', uiSettings[zoneType].fill);
              } else {
                  ender('#tracks,div').unbind('mousedown touchstart', dragStartHandler).unbind('mouseup touchend touchcancel', dragEndHandler).unbind('mousemove touchmove', dragHandler);
  
                  zoneButton.css('background-color', '');
              }
  
              if (ender('#delete-zone[data-toggled=true]').length > 0) {
                  ender('#delete-zone[data-toggled=true]').trigger('click');
              }
          }
  
          function clickHandler(e) {
              var point = getPoint(e),
                  ret;
  
              ret = tTrackerDisplay.zones.slice(0).reverse().some(function (zone, i, arr) {
                  if (zone.type === 'alert' && zone.contains(point)) {
                      tTrackerDisplay.removeZone(arr.length - i - 1);
                      eventHub.emit('redraw', 'zones', 'delete');
                      return true;
                  }
              });
  
              if (ret) {
                  return;
              }
  
              ret = tTrackerDisplay.zones.slice(0).reverse().some(function (zone, i, arr) {
                  if (zone.type === 'ignore' && zone.contains(point)) {
                      tTrackerDisplay.removeZone(arr.length - i - 1);
                      eventHub.emit('redraw', 'zones', 'delete');
                      return true;
                  }
              });
          }
  
          ender('#create-alertzone').bind('click', function () {
              zoneType = 'alert';
              toggleZoneButton();
          });
          ender('#create-ignorezone').bind('click', function () {
              zoneType = 'ignore';
              toggleZoneButton('ignore');
          });
  
          ender('#delete-zone').bind('click', function (e) {
              var toggled = ender(this).attr('data-toggled');
  
              e.stopPropagation();
  
              if (toggled === 'true') {
                  ender(this).removeAttr('data-toggled');
                  eventHub.emit('zone-normal');
                  ender(document).unbind('click touchend', clickHandler);
              } else {
                  ender(this).attr('data-toggled', 'true');
                  eventHub.emit('zone-delete');
                  ender(document).bind('click touchend', clickHandler);
              }
          });
      }
  
      module.exports.init = function (options) {
          tTrackerDisplay = options.trackerDisplay;
  
          bindZoneEvents();
      };
  }());
  

  provide("tracker-display/js/modules/zone-settings", module.exports);
  provide("tracker-display/js/modules/zone-settings", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/modules/about as tracker-display/js/modules/about
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
      var eventHub = require('eventhub'),
          version =  require('tracker-display/js/version');
  
      function bindEvents(tTrackerDisplay) {
          ender('#about-button').bind('click', function () {
              ender('#about-div').css('display', 'block');
              eventHub.emit('modalLoad');
          });
  
          ender('#about-back').bind('click', function () {
              ender('#about-div').css('display', 'none');
              eventHub.emit('modalClose');;
          });
      }
  
      module.exports.init = function (options) {
          bindEvents(options.trackerDisplay);
      };
  }());
  

  provide("tracker-display/js/modules/about", module.exports);
  provide("tracker-display/js/modules/about", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/dep/libcanvas as tracker-display/dep/libcanvas
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
  	"use strict";
  
  	var functions =  require('tracker-display/dep/libcanvas-functions');
  
  	if (CanvasRenderingContext2D) {
  		CanvasRenderingContext2D.prototype.ellipse = functions.ellipse;
  	}
  }());
  

  provide("tracker-display/dep/libcanvas", module.exports);
  provide("tracker-display/dep/libcanvas", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/trackerDisplay as tracker-display/js/trackerDisplay
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var Item =  require('tracker-display/js/item'),
          Grid =  require('tracker-display/js/grid'),
          Zone =  require('tracker-display/js/zone'),
          eventhub = require('eventhub'),
          ender = require('ender'),
          underscore = require('underscore'),
          EventEmitter = require('events').EventEmitter,
          trackEventEmitter,
          uiSettings =  require('tracker-display/js/uiSettings'),
          localStorage = window.localStorage || {},
          loadingExclusionZones = false,
          itemsInAlertZone = [],
          // if we're running it on a spotter, keep the spotter's address; otherwise use the default local spotter address
          // only spotters on localhost, spotter360.org and spotterrf.com should use the local address; assume everything else is a valid spotter
          defaultAddress = /(tracker\.spotter360\.org)|(tracker\.spotterrf.com)|(localhost)/.test(location.host) ? '192.168.254.254' : location.host;
  
      function doAlert() {
          ender('#audio-alert')[0].play();
      }
  
      function loadExclusionZones(trackerDisplay) {
          var i;
  
          if (loadingExclusionZones) {
              return;
          }
  
          loadingExclusionZones = true;
  
          // this is just a hack to get this to work without restructuring addZone
          trackerDisplay.zones = trackerDisplay.zones.filter(function (zone, i, arr) {
              if (zone.type === 'exclusion') {
                  return false;
              }
  
              return true;
          });
  
          ender.ajax({
              'url': trackerDisplay.spotterAddress + '/exclusion.json',
              'type': 'json',
              'method': 'get',
              'crossOrigin': true,
              'success': function (data) {
                  var i, t;
  
                  data = data.result;
                  for (i = 1; i <= 5; i += 1) {
                      t = {
                          start: data['exclusion_zone_' + i + '_min'],
                          end: data['exclusion_zone_' + i + '_max']
                      };
  
                      if (t.start !== 0 || t.end !== 0) {
                          trackerDisplay.addZone(t, 'exclusion', 'arc');
                      }
                  }
  
                  loadingExclusionZones = false;
                  eventhub.emit('redraw', 'zones');
              },
              'error': function (err) {
                  loadingExclusionZones = false;
                  console.error('Error getting exclusion.json:', err);
              }
          });
  
          ender.ajax({
              'url': trackerDisplay.spotterAddress + '/sensor.json',
              'type': 'json',
              'method': 'get',
              'crossOrigin': true,
              'success': function (data) {
                  if (typeof data === 'object' && typeof data.result === 'object' &&
                      Array.isArray(data.result.exclusions)) {
                      data.result.exclusions.forEach(function (exclusion) {
                          var t;
                          if (!exclusion.type === 'radial') {
                              return;
                          }
  
                          t = {
                              start: exclusion.min,
                              end: exclusion.max
                          };
  
                          if (t.start !== 0 || t.end !== 0) {
                              trackerDisplay.addZone(t, 'exclusion', 'arc');
                          }
                      });
  
                      loadingExclusionZones = false;
                      eventhub.emit('redraw', 'zones');
                  }
              },
              'error': function (err) {
                  loadingExclusionZones = false;
                  console.error('Error getting sensor.json:', err);
              }
          });
      }
  
      function TrackerDisplay() {
          var self = this;
  
          Item.tracker = this;
  
          trackEventEmitter = new EventEmitter();
          trackEventEmitter.setMaxListeners(50);
          eventhub.register('tracks', trackEventEmitter);
  
          this.items = {};
          this.zones = [];
  
          this.grid = new Grid();
  
          this._settings = uiSettings.trackerDisplay;
          this._origin = {};
  
          this.updateBg = true;
          this.spotterAddress = localStorage['spotterAddr'] || defaultAddress;
          this.spotterModel = localStorage['spotterModel'] || '80';
  
          this.refreshOrigin = function () {
              var self = this;
  
              ender.ajax({
                  'url': this.spotterAddress + '/geolocation.json',
                  'crossOrigin': true,
                  'type': 'json',
                  'success': function (data) {
                      // since the only difference between the old and new api
                      // for geolocation is just a namespace and different name
                      // for one field, we'll go ahead and maintain backwards compat
                      if (typeof data.result !== 'undefined') {
                          data = data.result;
                          self.originAzimuth = data.bearing;
                      } else if (typeof data.latitude === 'undefined') {
                          return;
                      } else {
                          self.originAzimuth = data.heading;
                      }
  
                      self.origin = {
                          latitude: data.latitude,
                          longitude: data.longitude
                      };
  
                      self.grid.radialStepStart = self.settings.angleRelativeTo === 'north' ? self.originAzimuth : 0;
                  },
                  'error': function (err) {
                      console.error(err);
                  }
              });
          };
          this.refreshOrigin();
  
          this.init(true);
  
          loadExclusionZones(this);
  
          ender.ajax({
              'url': this.spotterAddress + '/model.json',
              'type': 'json',
              'method': 'get',
              'crossOrigin': true,
              'success': function (data) {
                  if (data && data.result && data.result.model) {
                      self.spotterModel = data.result.model;
                  } else {
                      console.error('Response for model received, but there was no data.');
                  }
              },
              'error': function (err) {
                  console.error('Error getting model:', err);
              }
          });
  
          eventhub.on('redraw', function (group) {
              var newArgs = Array.prototype.slice.call(arguments, 1);
              switch (group) {
                  case 'tracks':
                      self.draw.apply(self, newArgs);
                      break;
  
                  case 'grid':
                      self.drawGrid.apply(self, newArgs);
                      break;
  
                  case 'zones':
                      self.drawZones.apply(self, newArgs);
                      break;
  
                  default:
                      self.draw.apply(self, newArgs);
                      self.drawGrid.apply(self, newArgs);
                      self.drawZones.apply(self, newArgs);
                      break;
              }
          });
  
          eventhub.on('zone-delete', function () {
              self.drawZones('delete');
          });
  
          eventhub.on('zone-normal', function () {
              self.drawZones();
          });
      }
  
      TrackerDisplay.prototype = {
          // properties
  
          get bounds () {
              return this._bounds;
          },
          set bounds (val) {
              this._bounds = val;
          },
          get coordinateBounds () {
              return this._coordinateBounds;
          },
          set coordinateBounds (val) {
              this._coordinateBounds = val;
          },
          get displayTrackInfo() {
              return localStorage['displayTrackInfo'] || uiSettings.trackerDisplay.displayTrackInfo;
          },
          set displayTrackInfo(val) {
              // don't do anything if this didn't change
              if (this.displayTrackInfo.displayTrackInfo === val) {
                  return;
              }
  
              this.settings.displayTrackInfo = val;
              localStorage['displayTrackInfo'] = val;
              if (val === 'always') {
                  eventhub.emit('displayTrackStatus', 'always', this.items);
              } else if (val === 'click') {
                  eventhub.emit('displayTrackStatus', 'click');
              }
          },
          get spotterAddress() {
              return 'http://' + this.spotterAddr;
          },
          set spotterAddress(val) {
              var tUrl, self = this;
  
              if (val) {
                  this.spotterAddr = val.replace('http://', '');
              }
              localStorage['spotterAddr'] = this.spotterAddr.replace(/\/$/, '');
              eventhub.once('trackers', 'data', function () {
                  self.refreshOrigin();
              });
          },
          get spotterModel () {
              return this.model || '80';
          },
          set spotterModel (val) {
              if (this.model === val) {
                  return;
              } else if (!val || !/80|600/.test(val)) {
                  val = '80';
              }
  
              this.model = (val || this.spotterModel).replace(/[a-z](\d+).*/i, function (str, p1, p2) { return p1; });
              if (/600/.test(this.model)) {
                  this.coordinateBounds = {
                      minX: -450,
                      minY: 0,
                      maxX: 450,
                      maxY: 1575
                  };
                  this.grid.fieldOfView.breadth = 800;
                  this.grid.fieldOfView.depth = 1000;
                  this.grid.fieldOfView.offset = 30;
              } else {
                  this.coordinateBounds = {
                      minX: -250,
                      minY: 0,
                      maxX: 250,
                      maxY: 525
                  };
                  this.grid.fieldOfView.breadth = 400;
                  this.grid.fieldOfView.depth = 500;
                  this.grid.fieldOfView.offset = 15;
              }
  
              localStorage['spotterModel'] = val;
  
              eventhub.emit('coordinateBoundsChanged');
  
              loadExclusionZones(this);
          },
          get spotterTracksAddress() {
              return "http://" + this.spotterAddr + '/tracks.json?maxWait=2000';
          },
          get origin() {
              return this._origin.latLong;
          },
          set origin(val) {
              this._origin.latLong = val;
          },
          set originAzimuth(val) {
              this._origin.azimuth = val;
          },
          get originAzimuth() {
              return this._origin.azimuth;
          },
          set angularUnits(val) {
              this._angularUnits = val || 'radians';
          },
          get settings() {
              return uiSettings.trackerDisplay;
          },
          set settings(val) {
              uiSettings.trackerDisplay = val;
          },
          get tempSetings(){
              return this._tempSettings;
          },
          set tempSettings(settings) {
              if (!settings) {
                  this.spotterModel = localStorage['spotterModel'] || '80';
                  this._tempSettings = null;
                  return;
              }
  
              this._tempSettings = settings;
  
              // default to instance settings if settings doesn't define it
              Object.keys(this.settings).forEach(function (key) {
                  if (typeof this._tempSettings[key] === 'undefined') {
                      this._tempSettings[key] = this.settings[key];
                  }
              }, this);
  
              if (typeof settings.spotterModel !== 'undefined') {
                  this.spotterModel = settings.spotterModel;
              }
          },
          get zones() {
              if (!this._zones) {
                  this._zones = [];
              }
              return this._zones;
          },
          set zones(val) {
              this._zones = val;
          },
  
          // functions
  
          clearTracks: function () {
              Object.keys(this.items).forEach(function (key) {
                trackEventEmitter.emit('trackDeleted', this.items[key]);
              }, this);
  
              this.items = {};
          },
  
          init: function (dontDraw) {
              Object.keys(this.items).forEach(function (key) {
                  delete this.items[key];
              }, this);
              this.origin = {};
  
              this.zones.length = 0;
  
              if (!dontDraw) {
                  this.draw();
              }
          },
          /*
           * Checks whether the item is in a zone, and if so, what type.
           * 
           * If the item is on a layer of zones, the first zone processed will
           * determine the type unless an alert zone is in the layers, then the
           * alert zone takes precidence.
           *
           * @param item- The item to check
           * @return The zone's type or null
           */
          itemIsInZone: function (item) {
              var ret = null,
                  idx = itemsInAlertZone.indexOf(String(item.id)),
                  alertFound;
  
              alertFound = this.zones.some(function (zone) {
                  if (zone.contains(item.getPoint())) {
                      // if ret is 0, set it, otherwise leave it be
                      ret = ret || zone.type;
  
                      if (zone.type === 'alert') {
                          ret = zone.type;
  
                          if (idx === -1) {
                              itemsInAlertZone.push(String(item.id));
  
                              // put this on the event stack
                              setTimeout(doAlert, 0);
                          }
  
                          // leave the loop
                          return true;
                      }
                  }
              });
  
              if (idx >= 0 && !alertFound) {
                  itemsInAlertZone.splice(idx, 1);
              }
  
              return ret;
          },
          /*
           * Adds an alert zone (or ignore zone...).
           *
           * @param start- Starting screen point
           * @param end- Ending screen point
           * @param type- Possible values ['alert', 'ignore', 'exclusion']
           * @param fn- Function to call for alert zone (optional)
           */
          addZone: function (points, type, shape) {
              var tZone;
             
              // the tracker is drawn at the bottom middle
              // the last parameter is the x, y coords
              tZone = new Zone(type, shape, points, this.ratio, {x: this.bounds.width / 2, y: this.bounds.height});
  
              this.zones.push(tZone);
  
              return this.zones.length - 1;
          },
          findItemNear: function (x, y, maxDistance) {
              var within = maxDistance || 30,
                  closest = within * 2,
                  item;
              
              Object.keys(this.items).forEach(function (i) {
                  var tItem = this.items[i],
                      scrPoint = tItem.route[tItem.route.length - 1].screenPoint,
                      xDist = Math.abs(scrPoint.x - x),
                      yDist = Math.abs(scrPoint.y - y),
                      factor = xDist + yDist;
  
                  if (xDist < within && yDist < within && factor < closest) {
                      closest = factor;
                      item = tItem;
                  }
              }, this);
  
              return item;
          },
          updateZone: function (id, points) {
              this.zones[id].update(points, this.ratio, {x: this.bounds.width / 2, y: this.bounds.height});
          },
          removeZone: function (point) {
              var i;
  
              // actually an id
              if (typeof point === 'number') {
                  this.zones.splice(point, 1);
                  return;
              }
  
              for (i = 0; i < this.zones.length; i += 1) {
                  if (underscore.isEqual(startPoint, this.zones[i].start)) {
                      this.zones.splice(i, 1);
                      i -= 1;
                  }
              }
          },
          draw: function (context) {
              var g = context || this.context,
                  settings = this.tempSettings || this.settings;
  
              if (!g) {
                  throw 'No context given, not drawing Tracker Display';
              }
  
              g.fillStyle = this.settings.fill;
              g.clearRect(0, 0, this.bounds.width, this.bounds.height);
  
              this.updateBg = false;
  
              if (settings.enableTrail) {
                  Object.keys(this.items).forEach(function (item) {
                      this.items[item].drawTrail(g);
                  }, this);
              }
  
              Object.keys(this.items).forEach(function (item) {
                  this.items[item].drawHead(g);
              }, this);
  
              if (settings.enableTrackID || settings.enableCoordinates || settings.enableSpeed) {
                  Object.keys(this.items).forEach(function (item) {
                      this.items[item].drawLabel(g, settings.enableTrackID, settings.enableCoordinates, settings.enableSpeed);
                  }, this);
              }
          },
          drawGrid: function () {
              var g = ender('#grid')[0].getContext('2d');
  
              g.clearRect(0, 0, this.bounds.width, this.bounds.height);
              this.grid.draw(g, this.ratio, this.settings.enableFieldOfView, this.settings.enableScale);
          },
          drawZones: function (mode) {
              var zoneList = this.zones,
                  g = g || ender('#zones')[0].getContext('2d');
  
              mode = mode || 'normal';
  
              g.clearRect(0, 0, ender('#zones').width(), ender('#zones').height());
  
              // draw ignore zones first, because alert-zones take precedence
              zoneList.forEach(function (zone) {
                  if (zone.type === 'ignore' || zone.type === 'exclusion') {
                      zone.draw(g, mode);
                  }
              });
              zoneList.forEach(function (zone) {
                  if (zone.type === 'alert') {
                      zone.draw(g, mode);
                  }
              });
          },
          addLine: function (startX, startY, endX, endY) {
              this.shim = {startX: startX, startY: startY, endX: endX, endY: endY};
          },
          updateItems: function (itemArray) {
              var idsDone = [];
  
              if (!itemArray) {
                  return;
              }
  
              itemArray.forEach(function (item) {
                  var tID = item.id;
  
                  if (!this.items[tID]) {
                      this.items[tID] = new Item(item, this.coordinateBounds, this.bounds);
                      trackEventEmitter.emit('newTrack', this.items[tID]);
                  }
  
                  this.items[tID].update(item);
                  trackEventEmitter.emit('trackUpdated', this.items[tID]);
  
                  this.items[tID].updateAlertStatus(this.itemIsInZone(this.items[tID]));
  
                  idsDone.push(tID);
              }, this);
  
              Object.keys(this.items).forEach(function (key) {
                  var idx;
  
                  if (idsDone.indexOf(this.items[key].id) < 0) {
                      trackEventEmitter.emit('trackDeleted', this.items[key]);
                      idx = itemsInAlertZone.indexOf(key);
                      if (idx >= 0) {
                          itemsInAlertZone.splice(idx, 1);
                      }
  
                      delete this.items[key];
                  }
              }, this);
  
              trackEventEmitter.emit('update', this.items);
          },
          update: function (data) {
              var tracks;
              if (!data) {
                  return;
              }
  
              if (Array.isArray(data)) {
                  tracks = data;
              } else if (Array.isArray(data.tracks)) {
                  tracks = data.tracks;
              } else {
                  return;
              }
  
              this.updateItems(tracks);
  
              this.draw(null, this.tempSettings);
          },
          updateScreen: function (bounds, ratio) {
              var screenOrigin;
  
              this.ratio = ratio;
  
              this.updateBg = true;
              this.context = ender('#tracks')[0].getContext('2d');
  
              this.bounds = bounds;
              screenOrigin = {
                  x: this.bounds.width / 2,
                  y: this.bounds.height
              };
  
              this.grid.update(this.bounds, ratio, 25, 20);
              this.grid.fieldOfView.update(this.bounds, ratio);
  
              Object.keys(this.items).forEach(function (item) {
                  this.items[item].refactor(this.coordinateBounds, this.bounds);
              }, this);
  
              this.zones.forEach(function (zone) {
                  zone.refactor(screenOrigin, ratio);
              }, this);
  
              loadExclusionZones(this);
  
              this.draw();
              this.drawGrid();
              this.drawZones();
          }
      };
  
      module.exports = TrackerDisplay;
  }());
  

  provide("tracker-display/js/trackerDisplay", module.exports);
  provide("tracker-display/js/trackerDisplay", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/events as tracker-display/js/events
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      var eventHub = require('eventhub'),
          uiSettings =  require('tracker-display/js/uiSettings'),
          Item =  require('tracker-display/js/item'),
          notifier =  require('tracker-display/js/notifier'),
          ender = require('ender'),
          allowClick = true,
          trackerDisplay;
  
      function fixupId(id) {
          id = String(id);
  
          while (id.length  < 3) {
              id = '0' + id;
          }
  
          return id;
      }
  
      function fixupAngle(angle) {
          var neg;
  
          angle = Math.round(angle);
  
          // if we're relative to boresight, use L/R instead of negative/positive
          // otherwise just stringify the angle
          if (uiSettings.trackerDisplay.angleRelativeTo === 'boresight') {
              if (angle < 0) {
                  neg = true;
                  angle = Math.abs(angle);
              }
  
              angle = String(angle);
  
              if (angle.length < 2) {
                  angle = '0' + angle;
              }
  
              angle = (neg ? 'L' : 'R') + angle;
          } else {
              angle = String(angle);
          }
  
          return angle + '°';
      }
  
      function fixupRange(range) {
          var rangeDigits = trackerDisplay.spotterModel === '600' ? 4 : 3;
          range = String(Math.round(range));
  
          while (range.length < rangeDigits) {
              range = '0' + range;
          }
  
          return range + 'm';
      }
  
      function fixupSpeed(speed) {
          switch(uiSettings.trackerDisplay.speedUnits) {
              case 'm/s':
                  speed = Math.round(speed * 10) / 10;
                  speed += ' m/s';
                  break;
              case 'mph':
                  // meters per second -> mph
                  speed = Math.round(speed * 2.2369);
                  speed += ' mph';
                  break;
              case 'kph':
                  // meters per second -> kph
                  speed = Math.round(speed * 3.6);
                  speed += ' kph';
                  break;
          }
  
          return speed;
      }
  
      function genNotification(id, range, angle, speed) {
          var out = ender('<div></div>').attr('id', 'notify-item-' + id).addClass('notify-item'), neg, rangeDigits;
  
          out.append('<label class="notify-item-id">' + fixupId(id) + ':</label>');
          out.append(ender('<span></span>').attr('class', 'notify-item-angle').html(fixupAngle(angle)));
          out.append(ender('<span></span>').attr('class', 'notify-item-range').html(fixupRange(range)));
  
          if (uiSettings.trackerDisplay.enableSpeed) {
              out.append(ender('<br>'));
              out.append(ender('<span>').attr('class', 'notify-item-speed').html(fixupSpeed(speed)));
          }
          out.css({
              'color': Item.colors[id % 8]
          });
  
          return out;
      }
  
      function changeFont(font) {
          var fontSize = uiSettings.grid.font.match(/(\d+)pt/)[1] - 1;
  
          ender('#notify-div').css('font', uiSettings.grid.font.replace(/\d+pt/, fontSize + 'pt'));
      }
  
      // called only when we always want to see tracks
      function updateTracks(data) {
          // get the tracks and remove any that are invisible
          var tracks = Object.keys(data).map(function (key) {
              return data[key];
          }).filter(function (track) {
              return track.doDraw;
          });
          
          tracks.sort(function (a, b) {
              var latestA = a.route[a.route.length - 1],
                  latestB = b.route[b.route.length - 1];
  
              return latestA.range - latestB.range;
          });
  
          ender('.notification').remove();
  
          // only 10 nearest
          tracks.slice(0, 10).forEach(function (track) {
              var notifications = ender('.notification'),
                  newNotification, angle,
                  latest = track.route[track.route.length - 1];
  
              if (uiSettings.trackerDisplay.angleRelativeTo === 'north') {
                  angle = latest.angleFromNorth;
              } else {
                  angle = latest.angle;
              }
  
              newNotification = genNotification(track.id, latest.range, angle, latest.speed);
  
              if (notifications.length > 0) {
                  notifier.notify(newNotification, ender('.notification').last());
              } else {
                  notifier.notify(newNotification);
              }
          });
      }
  
      // called only when in on-click mode
      function trackUpdated(trackData) {
          var point = trackData.route[trackData.route.length - 1],
              elem = ender('#notify-item-' + trackData.id),
              angle;
  
          if (elem.length === 0) {
              return;
          }
  
          if (uiSettings.trackerDisplay.angleRelativeTo === 'north') {
              angle = point.angleFromNorth;
          } else {
              angle = point.angle;
          }
  
          elem.find('.notify-item-range').html(fixupRange(point.range));
          elem.find('.notify-item-angle').html(fixupAngle(angle));
          elem.find('.notify-item-speed').html(fixupSpeed(point.speed));
      }
  
      function trackDeleted(trackData) {
          ender('#notify-item-' + trackData.id).parents('.notification').remove();
      }
  
      function bindEvents(tTrackerDisplay) {
          function hideButtons() {
              ender('#buttons').css('display', '');
          }
  
          function showButtons() {
              ender('#settings').css('display', 'none');
    
              ender('#buttons').css('display', 'block');
          }
  
          eventHub.on('modalLoad', hideButtons);
          eventHub.on('modalClose', showButtons);
  
          trackerDisplay = tTrackerDisplay;
          eventHub.on('fontChanged', changeFont);
  
          changeFont(uiSettings.grid.font);
  
          ender('#settings').bind('click', showButtons);
  
          ender('body').bind('#tracks', 'touchend click', function (e) {
              var x, y, best, bestX, bestY, bestDiff, diffMax = 50, point, angle, modalVisible;
              
              // don't let the settings button be visible unless all modals are hidden
              modalVisible = false;
              ender('.modal-div').each(function () {
                  var elem = ender(this);
                  if (elem.attr('id') !== 'buttons' && elem.css('display') === 'block') {
                      modalVisible = true;
                  }
              });
  
              if (!modalVisible) {
                  ender('#settings').css('display', '');
              }
              hideButtons();
  
              if (trackerDisplay.displayTrackInfo !== 'click' || !allowClick) {
                  return;
              }
  
              if (e.touches && e.touches.length > 0) {
                  x = e.touches[0].pageX;
                  y = e.touches[0].pageY;
              } else if (typeof e.pageX === 'number' && typeof e.pageY === 'number') {
                  x = e.pageX;
                  y = e.pageY;
              } else {
                  x = e.clientX + (document.documentElement.scrollLeft || document.body.scrollLeft) - document.documentElement.clientLeft;
                  y = e.clientY + (document.documentElement.scrollRight || document.body.scrollRight) - document.documentElement.clientRight;
              }
  
              x -= ender('#tracks').offset().left;
              y -= ender('#tracks').offset().top;
  
              Object.keys(trackerDisplay.items).some(function (key) {
                  var item,
                      coord,
                      diff;
  
                  // we already have one
                  if (ender('#notify-item-' + key).length > 0) {
                      return;
                  }
  
                  item = trackerDisplay.items[key];
                  coord = item.route[item.route.length - 1].screenPoint;
  
                  diff = Math.abs(coord.x - x) + Math.abs(coord.y - y);
                  if (diff > diffMax) {
                      return;
                  }
  
                  if (!best || diff < bestDiff) {
                      best = item;
                      bestX = coord.x;
                      bestY = coord.y;
                      bestDiff = Math.abs(bestX - x) + Math.abs(bestY - y);
  
                      if (bestX === x && bestY === y) {
                          return true;
                      }
  
                      return;
                  }
              });
  
              if (!best) {
                  return;
              }
  
              point = best.route[best.route.length - 1];
              if (uiSettings.trackerDisplay.angleRelativeTo === 'north') {
                  angle = point.angleFromNorth;
              } else {
                  angle = point.angle;
              }
  
              notifier.notify(genNotification(best.id, point.range, angle, point.speed));
          });
          eventHub.on('displayTrackStatus', function (displayItem) {
              if (displayItem === 'click') {
                  ender('.notification').trigger('click');
  
                  eventHub.removeListener('tracks', 'update', updateTracks);
  
                  eventHub.on('tracks', 'trackUpdated', trackUpdated);
                  eventHub.on('tracks', 'trackDeleted', trackDeleted);
                  return;
              }
  
              eventHub.removeListener('tracks', 'trackUpdated', trackUpdated);
              eventHub.removeListener('tracks', 'trackDeleted', trackDeleted);
              eventHub.on('tracks', 'update', updateTracks);
          });
  
          eventHub.emit('displayTrackStatus', trackerDisplay.displayTrackInfo);
      }
  
      eventHub.on('modalLoad', function () {
          allowClick = false;
      });
      eventHub.on('modalClose', function () {
          allowClick = true;
      });
  
      module.exports = bindEvents;
  }());
  
  

  provide("tracker-display/js/events", module.exports);
  provide("tracker-display/js/events", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/logger as tracker-display/js/logger
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      "use strict";
  
      function Logger() {
          this.logs = {};
      }
  
      Logger.prototype.add = function (name, appendFn, clearFn) {
          this.logs[name] = {
              append: appendFn,
              clear: clearFn
          };
      };
  
      Logger.prototype.log = function (name, data) {
          if (!this.logs[name]) {
              return;
          }
          
          this.logs[name].append(data);
      };
  
      Logger.prototype.clear = function (name) {
          if (!this.logs[name]) {
              return;
          }
  
          this.logs[name].clear();
      };
  
      module.exports = new Logger();
  }());
  

  provide("tracker-display/js/logger", module.exports);
  provide("tracker-display/js/logger", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display/js/mods as tracker-display/js/mods
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
      var modules = [ require('tracker-display/js/modules/setup'), require('tracker-display/js/modules/settings'), require('tracker-display/js/modules/zone-settings'), require('tracker-display/js/modules/about'),];
  
      module.exports = modules;
  }());

  provide("tracker-display/js/mods", module.exports);
  provide("tracker-display/js/mods", module.exports);
  $.ender(module.exports);
}(global));

// ender:tracker-display as tracker-display
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  
  (function () {
      'use strict';
  
       require('tracker-display/dep/libcanvas');
  
      var TrackerDisplay =  require('tracker-display/js/trackerDisplay'),
          bindEvents =  require('tracker-display/js/events'),
          conversion =  require('tracker-display/js/conversion'),
          notifier =  require('tracker-display/js/notifier'),
          version =  require('tracker-display/js/version'),
          ender = require('ender'),
          tTrackerDisplay,
          EventEmitter = require('events').EventEmitter,
          EventHub = require('eventhub'),
          trackEventEmitter = new EventEmitter(),
          Logger =  require('tracker-display/js/logger'),
          modules =  require('tracker-display/js/mods'),
          // fixes problem with FireFox's fullscreen where it would
          // take forever to go fullscreen
          resizeDelay = 500,
          resizeTimeout,
          requiresDom = [],
          lastUpdate = Date.now(),
          clearTracksDelay = 5 * 1000;
  
      /*
       * Changes the bounds of the tracker display and returns the new bounds.
       * 
       * @param coordinateBounds- Bounds of the coordinate system (defaults to current bounds)
       * @param screenBounds- Screen bounds (uses screen width/height by default)
       * @return New bounds for drawing
       */
      function changeBounds(coordinateBounds, screenBounds) {
          var bounds,
              ratio,
              xOffset = 0,
              yOffset = 25;
  
          // can't do anything until the tracker display is up
          if (!tTrackerDisplay) {
              return;
          }
  
          if (!screenBounds) {
              screenBounds = {
                  width: window.innerWidth,
                  height: window.innerHeight
              };
          }
  
          coordinateBounds = coordinateBounds || tTrackerDisplay.coordinateBounds;
  
          ratio = conversion.getMultiplier(coordinateBounds, screenBounds, xOffset, yOffset);
  
          bounds = {
              width: window.innerWidth,
              height: window.innerHeight,
              xOffset: xOffset,
              yOffset: yOffset
          };
  
          recreateCanvas('#tracks');
          recreateCanvas('#zones');
          recreateCanvas('#grid');
          tTrackerDisplay.updateScreen(bounds, ratio);
  
          return bounds;
      }
  
      function recreateCanvas(selector) {
          var domCanvas;
          
          domCanvas = ender(selector);
  
          domCanvas.remove().attr({
              width: window.innerWidth,
              height: window.innerHeight
          }).appendTo(ender(selector + '-wrapper'));
  
          return domCanvas[0].getContext('2d');
      }
  
      function updateOrientation() {
          changeBounds();
      }
  
      function handleData(data) {
          tTrackerDisplay.update(data);
      }
  
      function longPoll() {
          ender.ajax({
              'url': tTrackerDisplay.spotterTracksAddress,
              'type': 'json',
              'method': 'get',
              'crossOrigin': true,
              'timeout': 1000 * 5,
              'success': function (data) {
                  if (data) {
                      if (data.result) {
                          data = data.result;
                      }
  
                      trackEventEmitter.emit('data', data);
                  }
                  setTimeout(longPoll, 0);
                  lastUpdate = Date.now();
              },
              'error': function (e) {
                  trackEventEmitter.emit('error', e);
                  setTimeout(longPoll, 1000 * 1);
              }
          });
      }
  
      window.onerror = function (e) {
          console.error('Uncaught error:', e);
          return true;
      };
  
      // fired when an update has been downloaded
      ender(applicationCache).bind('updateready', function () {
          window.location.reload();
      });
  
      ender(applicationCache).bind('obsolete', function () {
          alert('The server reports that this webapp is no longer available offline. This application will be uninstalled.');
      });
  
      EventHub.on('coordinateBoundsChanged', function (coordinateBounds) {
          changeBounds(coordinateBounds);
      });
  
      ender.domReady(function () {
          var context2D, screenBounds, fieldOfView;
  
          EventHub.register('trackers', trackEventEmitter);
  
          ender(window).bind('resize', function (e) {
              // Firefox fires a ton of resize events when it goes into fullscreen
              if (resizeTimeout) {
                  clearTimeout(resizeTimeout);
              }
  
              resizeTimeout = setTimeout(function () {
                  resizeTimeout = null;
                  changeBounds();
              }, resizeDelay);
          });
  
          EventHub.on('trackers', 'data', handleData);
          EventHub.on('trackers', 'error', function (e) {
              console.error('Request for tracks timed out');
  
              // if we've had no new tracks for a while, clear current tracks
              if (Date.now() - lastUpdate >= clearTracksDelay) {
                  console.error('Track update timed out, clearing tracks');
                  tTrackerDisplay.clearTracks();
                  tTrackerDisplay.draw();
              }
          });
  
          ender('#version').html('<span>v' + String(version.version) + '</span><br /><span>Build: ' + version.build + '</span>');
  
          context2D = recreateCanvas('#tracks');
          if (context2D) {
              screenBounds = {
                  width: window.innerWidth,
                  height: window.innerHeight
              };
  
              notifier();
  
              tTrackerDisplay = new TrackerDisplay();
              updateOrientation(window.orientation || 0);
  
              longPoll();
              
              bindEvents(tTrackerDisplay);
  
              modules.forEach(function (mod) {
                  mod.init({
                      appendTo: ender('#appendHere')[0],
                      buttons: ender('#buttons')[0],
                      trackerDisplay: tTrackerDisplay
                  });
              });
          } else {
              alert('Can\'t get canvas context handle.' +
                    '\nPerhaps this is\'t a canvas element??');
          }
      });
  
      module.exports.changeBounds = changeBounds;
  }());
  

  provide("tracker-display", module.exports);
  provide("tracker-display", module.exports);
  $.ender(module.exports);
}(global));