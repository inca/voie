'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

var _state = require('./state');

var _state2 = _interopRequireDefault(_state);

var _transition = require('./transition');

var _transition2 = _interopRequireDefault(_transition);

require('./view-directive');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debug2.default)('voie:manager');

var Manager = (function () {
  function Manager(options) {
    _classCallCheck(this, Manager);

    Object.assign(this, options || {});
    this.el = options.el;
    if (!this.el) {
      throw new Error('Please specify `el` as an entry-point node of your app.');
    }
    this.states = {};
    this.currentContext = {
      parent: null,
      state: null, // root state
      vm: null,
      params: {},
      data: {}
    };
    this.els = {};
  }

  _createClass(Manager, [{
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
      var _this = this;

      if (this.transition) {
        throw new Error('Transition is in progress. Abort it before going elsewhere.');
      }
      if (typeof options === 'string') {
        name = options;
        options = {};
      } else {
        name = options.name;
      }
      if (!name) {
        throw new Error('Target state `name` is required.');
      }
      debug('go %s', name);
      var dstState = this.get(name);
      if (!dstState) {
        throw new Error('State "' + name + '" not found.');
      }
      this.transition = new _transition2.default(this, {
        srcContext: this.currentContext,
        dstState: dstState,
        params: Object.assign({}, this.currentContext.params, options.params)
      });
      return this.transition.run().then(function (result) {
        delete _this.transition;
        return result;
      });
    }
  }]);

  return Manager;
})();

exports.default = Manager;
;