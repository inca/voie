'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var debug = (0, _debug2.default)('voie:transition');

var Transition = (function () {
  function Transition(manager, spec) {
    _classCallCheck(this, Transition);

    this.manager = manager;
    this.srcContext = spec.srcContext;
    this.dstState = spec.dstState;
    this.params = spec.params || {};
  }

  _createClass(Transition, [{
    key: 'run',
    value: function run() {
      var _this = this;

      return this.goUpstream().then(function () {
        return _this.goDownstream();
      });
    }
  }, {
    key: 'goUpstream',
    value: function goUpstream() {
      var _this2 = this;

      return new Promise(function (resolve) {
        var ctx = _this2.manager.currentContext;
        if (!ctx.state) {
          // We're at root state, no cleanup is necessary
          return resolve();
        }
        // See if state is "common" with dst branch
        var state = ctx.state;
        var dstLineage = _this2.dstState.getLineage();
        if (dstLineage.indexOf(state) > -1) {
          // Reuse existing context if params match
          var canReuse = state.reuse && Object.keys(ctx.params).every(function (key) {
            return ctx.params[key] === _this2.params[key];
          });
          if (canReuse) {
            return resolve();
          }
        }
        // Cleanup current state
        return resolve(state.leave().then(function () {
          debug('left %s', state.name);
          if (ctx.vm) {
            ctx.vm.$destroy();
          }
          _this2.manager.currentContext = ctx.parent;
          return _this2.goUpstream();
        }));
      });
    }
  }, {
    key: 'goDownstream',
    value: function goDownstream() {
      var _this3 = this;

      return new Promise(function (resolve) {
        var ctx = _this3.manager.currentContext;
        var states = _this3.dstState.getLineage();
        var i = states.indexOf(ctx.state);
        if (i > -1) {
          states = states.slice(i + 1);
        }
        var nextState = states[0];
        var nextContext = {
          parent: ctx,
          state: nextState,
          params: _this3.params,
          data: {}
        };
        resolve(nextState.enter(nextContext).then(function () {
          debug('entered %s', nextState.name);
          if (nextState.component) {
            nextContext.vm = new nextState.component({
              data: nextContext.data,
              el: ctx.state ? _this3.manager.els[ctx.state.name] : _this3.manager.el,
              params: nextContext.params,
              ctx: nextContext,
              state: nextState,
              manager: _this3.manager
            });
          }
          _this3.manager.currentContext = nextContext;
          if (nextState.name != _this3.dstState.name) {
            return _this3.goDownstream();
          }
        }));
      });
    }
  }]);

  return Transition;
})();

exports.default = Transition;