'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

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
  function Transition(manager) {
    (0, _classCallCheck3.default)(this, Transition);

    this.manager = manager;
    this.redirectsCount = 0;
    this.params = (0, _assign2.default)({}, manager.context.params);
  }

  (0, _createClass3.default)(Transition, [{
    key: 'go',
    value: function go(name, params, isRedirect) {
      var _this = this;

      debug(isRedirect ? 'redirect to %s' : 'go to %s', name);
      (0, _assign2.default)(this.params, params || {});
      var state = this.manager.get(name);
      if (!state) {
        throw new _error.StateNotFoundError(name);
      }
      this.dstState = state;
      if (state.redirect) {
        return this.handleRedirect(state.redirect);
      }
      return this.goUpstream().then(function () {
        return _this.goDownstream();
      });
    }
  }, {
    key: 'handleRedirect',
    value: function handleRedirect(redirect) {
      var _this2 = this;

      this.redirectsCount++;
      if (this.redirectsCount > this.manager.maxRedirects) {
        throw new _error.RedirectLoopError(this);
      }
      switch (typeof redirect === 'undefined' ? 'undefined' : (0, _typeof3.default)(redirect)) {
        case 'string':
          return this.go(redirect, {}, true);
        case 'object':
          return this.go(redirect.name, redirect.params, true);
        case 'function':
          return _promise2.default.resolve().then(function () {
            return redirect(_this2);
          }).then(function (redirect) {
            return _this2.handleRedirect(redirect);
          });
        default:
          throw new Error('Unknown redirect: ' + redirect);
      }
    }
  }, {
    key: 'goUpstream',
    value: function goUpstream() {
      var _this3 = this;

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
          return ctx.params[key] === _this3.params[key];
        });
        if (paramsMatch) {
          return _promise2.default.resolve();
        }
      }
      return _promise2.default.resolve().then(function () {
        return state.leave(ctx);
      }).then(function () {
        return _this3.manager.afterEach(ctx);
      }).then(function () {
        debug(' <- left %s', state.name);
        _this3.cleanup(ctx);
      }).then(function () {
        return _this3.goUpstream();
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
      this.manager.emit('context_updated', this.manager.context);
    }
  }, {
    key: 'goDownstream',
    value: function goDownstream() {
      var _this4 = this;

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

      return _promise2.default.resolve(true).then(function () {
        return _this4.manager.beforeEach(nextContext);
      }).catch(function (err) {
        return nextState.handleError(err, nextContext);
      }).then(function (obj) {
        return _this4._handleEnterHook(obj, nextContext);
      }).then(function (proceed) {
        if (!proceed) {
          return false;
        }
        return _promise2.default.resolve().then(function () {
          return nextState.enter(nextContext);
        }).catch(function (err) {
          return nextState.handleError(err, nextContext);
        }).then(function (obj) {
          return _this4._handleEnterHook(obj, nextContext);
        });
      }).then(function (proceed) {
        if (!proceed) {
          return false;
        }
        _this4.manager.context = nextContext;
        _this4.manager.emit('context_updated', _this4.manager.context);
        _this4.render(nextContext, nextState.component);
        if (nextState !== _this4.dstState) {
          return _this4.goDownstream();
        }
      });
    }

    /**
     * @return {Boolean} proceed
     * @private
     */

  }, {
    key: '_handleEnterHook',
    value: function _handleEnterHook(obj, nextContext) {
      obj = obj || {};
      var nextState = nextContext.state;
      debug(' -> entered %s', nextState.name);
      // hooks can return { redirect: 'new.state.name' }
      // or { redirect: { name, params } }
      if (obj.redirect) {
        return this.handleRedirect(obj.redirect).then(function () {
          return false;
        });
      }
      // hooks can also return { component: <VueComponent> }
      var rendered = this.render(nextContext, obj.component);
      return !rendered;
    }
  }, {
    key: 'render',
    value: function render(ctx, comp) {
      if (!comp) {
        return false;
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
        state: ctx.state,
        manager: this.manager
      });
      return true;
    }
  }, {
    key: 'to',
    get: function get() {
      return this.dstState;
    }
  }]);
  return Transition;
})();

exports.default = Transition;