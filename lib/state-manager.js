'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

var _state = require('./state');

var _state2 = _interopRequireDefault(_state);

var _transition = require('./transition');

var _transition2 = _interopRequireDefault(_transition);

var _history = require('history');

require('./directives');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var debug = (0, _debug2.default)('voie:manager');

var StateManager = (function (_EventEmitter) {
  _inherits(StateManager, _EventEmitter);

  function StateManager(spec) {
    _classCallCheck(this, StateManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StateManager).call(this));

    _this._setupEl(spec);
    _this._setupHistory(spec);
    _this._setupOptions(spec);
    _this._setupState();
    return _this;
  }

  _createClass(StateManager, [{
    key: '_setupEl',
    value: function _setupEl(spec) {
      this.el = spec.el instanceof HTMLElement ? spec.el : document.querySelector(spec.el);
      if (!this.el) {
        throw new Error('Please specify `el` as an entry-point node of your app.');
      }
    }
  }, {
    key: '_setupHistory',
    value: function _setupHistory(spec) {
      if (spec.history) {
        this.history = spec.history;
      } else {
        this._setupDefaultHtml5History(spec);
      }
    }
  }, {
    key: '_setupDefaultHtml5History',
    value: function _setupDefaultHtml5History(spec) {
      var base = spec.base;
      // Try to take base from `<base href=""/>`
      if (!base) {
        var baseEl = document.querySelector('base');
        base = baseEl && baseEl.getAttribute('href');
      }
      base = (base || '').replace(/\/+$/, '');
      this.history = (0, _history.useBasename)(_history.createHistory)({ basename: base });
    }
  }, {
    key: '_setupOptions',
    value: function _setupOptions(spec) {
      if (spec.handleUncaught) {
        this.handleUncaught = spec.handleUncaught;
      }
      this.maxRedirects = Number(spec.maxRedirects) || 10;
      this.activeClass = spec.activeClass || 'active';
    }
  }, {
    key: '_setupState',
    value: function _setupState() {
      this.states = {};
      this.context = {
        parent: null,
        state: null, // root state
        vm: null,
        params: {},
        data: {}
      };
      this.mountPoints = {
        '': {
          viewEl: this.el,
          viewElChildren: [].slice.call(this.el.children)
        }
      };
    }
  }, {
    key: 'handleUncaught',
    value: function handleUncaught(err) {
      return Promise.reject(err);
    }
  }, {
    key: 'add',
    value: function add(name, spec) {
      if ((typeof name === 'undefined' ? 'undefined' : _typeof(name)) == 'object') {
        spec = name;
        name = spec.name;
      }
      if (!name) {
        throw new Error('State `name` is mandatory.');
      }
      if (this.states[name]) {
        throw new Error('State "' + name + '" already added');
      }
      spec.name = name;
      var state = new _state2.default(this, spec);
      debug('add %s', name);
      this.states[name] = state;
      return state;
    }
  }, {
    key: 'get',
    value: function get(name) {
      return this.states[name];
    }
  }, {
    key: 'go',
    value: function go(options) {
      var _this2 = this;

      if (this.transition) {
        throw new Error('Transition is in progress. Abort it before going elsewhere.');
      }
      this.transition = new _transition2.default(this, options);
      return this.transition.run().then(function (result) {
        delete _this2.transition;
        _this2.emit('transition_finished');
        return result;
      }).catch(function (err) {
        delete _this2.transition;
        _this2.emit('transition_finished', err);
        return _this2.handleUncaught(err);
      }).then(function () {
        return _this2._updateHistory(options.replace || false);
      });
    }
  }, {
    key: '_getMountPoint',
    value: function _getMountPoint() {
      var el = null;
      var ctx = this.context;
      while (ctx && !el) {
        var state = ctx.state;
        if (state) {
          el = this.mountPoints[state.name];
        } else {
          el = this.mountPoints[''];
        }
        ctx = ctx.parent;
      }
      return el;
    }
  }, {
    key: 'start',
    value: function start() {
      var _this3 = this;

      if (this._unlisten) {
        return Promise.resolve();
      }
      this._unlisten = this.history.listen(function (location) {
        return _this3._matchLocation(location);
      });
      return new Promise(function (resolve) {
        return _this3.once('history_updated', resolve);
      });
    }
  }, {
    key: 'stop',
    value: function stop() {
      if (!this._unlisten) {
        return;
      }
      this._unlisten();
      delete this._unlisten;
    }
  }, {
    key: '_matchLocation',
    value: function _matchLocation(location) {
      var _this4 = this;

      var url = location.pathname + location.search;
      if (url == this.context.url) {
        return;
      }
      var found = Object.keys(this.states).find(function (name) {
        var state = _this4.states[name];
        var matched = state._match(location);
        if (matched) {
          debug('match url %s -> %s', location.pathname, name);
          _this4.go({
            name: name,
            params: matched,
            replace: true
          });
          return true;
        }
      });
      if (!found) {
        /* eslint-disable no-console */
        console.warn('No states match URL: ' + location.pathname);
        /* eslint-enable no-console */
        this._updateHistory(true);
      }
    }
  }, {
    key: '_updateHistory',
    value: function _updateHistory(replace) {
      var state = this.context.state;
      var url = state ? state._makeUrl(this.context.params) : '/';
      if (url == this.context.url) {
        return;
      }
      this.context.url = url;
      if (replace) {
        this.history.replace(url);
      } else {
        this.history.push(url);
      }
      this.emit('history_updated', {
        url: url,
        ctx: this.context
      });
    }
  }]);

  return StateManager;
})(_eventemitter2.default);

exports.default = StateManager;
;