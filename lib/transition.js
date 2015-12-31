'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _error = require('./error');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('voie:transition');

var Transition = (function () {
  function Transition(manager, spec) {
    (0, _classCallCheck3.default)(this, Transition);

    this.manager = manager;
    this.redirectsCount = 0;
    var dstStateName = undefined;
    if (typeof spec === 'string') {
      dstStateName = spec;
      spec = {};
    } else {
      dstStateName = spec.name;
    }
    debug('go to %s', dstStateName);
    this.resolveDstState(dstStateName);
    this.params = spec.params || {};
  }

  (0, _createClass3.default)(Transition, [{
    key: 'resolveDstState',
    value: function resolveDstState(name, isRedirect) {
      if (isRedirect) {
        debug('redirect to %s', name);
      }
      var state = this.manager.get(name);
      if (!state) {
        throw new _error.StateNotFoundError(name);
      }
      this.dstState = state;
      if (state.redirect) {
        this.redirectsCount++;
        if (this.redirectsCount > this.manager.maxRedirects) {
          throw new _error.RedirectLoopError(this);
        }
        this.resolveDstState(state.redirect, true);
      }
    }
  }, {
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

      var ctx = this.manager.context;
      if (!ctx.state) {
        // We're at root state, no cleanup is necessary
        return _promise2.default.resolve();
      }
      // Stop going up if state is common with dst branch
      var state = ctx.state;
      if (this.dstState.includes(state)) {
        // All ctx params must match target ones
        // (e.g. when going from /user/1 to /user/2)
        var paramsMatch = (0, _keys2.default)(ctx.params).every(function (key) {
          return ctx.params[key] == _this2.params[key];
        });
        if (paramsMatch) {
          return _promise2.default.resolve();
        }
      }
      return _promise2.default.resolve().then(function () {
        return state.leave(ctx);
      }).then(function () {
        debug(' <- left %s', state.name);
        _this2.cleanup(ctx);
      }).then(function () {
        return _this2.goUpstream();
      });
    }
  }, {
    key: 'cleanup',
    value: function cleanup(ctx) {
      if (ctx.vm) {
        // Destroy vm and restore v-view element
        var el = ctx.vm.$el;
        var mp = ctx.mountPoint;
        ctx.vm.$destroy();
        if (mp) {
          (function () {
            var viewEl = ctx.mountPoint.viewEl;
            el.parentNode.replaceChild(viewEl, el);
            mp.viewElChildren.forEach(function (el) {
              return viewEl.appendChild(el);
            });
          })();
        }
      }
      this.manager.context = ctx.parent;
      this.manager.emit('state_changed', this.manager.context);
    }
  }, {
    key: 'goDownstream',
    value: function goDownstream() {
      var _this3 = this;

      var prevCtx = this.manager.context;
      var dstLineage = this.dstState.lineage;
      var nextState = dstLineage[dstLineage.indexOf(prevCtx.state) + 1];
      if (!nextState) {
        return _promise2.default.resolve();
      }
      // New context inherits params and data from parent
      var nextContext = {
        parent: prevCtx,
        state: nextState,
        params: (0, _assign2.default)({}, prevCtx.params, nextState._makeParams(this.params)),
        data: (0, _assign2.default)({}, prevCtx.data)
      };
      return _promise2.default.resolve().then(function () {
        return nextState.enter(nextContext);
      }).catch(function (err) {
        return nextState.handleError(err, nextContext);
      }).then(function (obj) {
        obj = obj || {};
        debug(' -> entered %s', nextState.name);
        // hooks can return { redirect: 'new.state.name' }
        if (typeof obj.redirect == 'string') {
          _this3.resolveDstState(obj.redirect, true);
          return _this3.run();
        }
        _this3.manager.context = nextContext;
        // hooks can also return { component: <VueComponent> }
        _this3.render(nextContext, obj.component);
        _this3.manager.emit('state_changed', _this3.manager.context);
        if (nextState != _this3.dstState) {
          return _this3.goDownstream();
        }
      });
    }
  }, {
    key: 'render',
    value: function render(ctx, comp) {
      var state = ctx.state;
      comp = comp || state.component;
      if (!comp) {
        return;
      }
      var Comp = (0, _utils.toVueComponent)(comp);
      var mp = this.manager._getMountPoint();
      ctx.mountPoint = mp;
      ctx.vm = new Comp({
        data: ctx.data,
        el: mp.viewEl,
        parent: mp.hostVm,
        params: ctx.params,
        ctx: ctx,
        state: state,
        manager: this.manager
      });
    }
  }]);
  return Transition;
})();

exports.default = Transition;