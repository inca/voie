'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

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

var debug = (0, _debug2.default)('voie:manager');

/**
 * State manager holds the hierarchy of application states,
 * exposes methods for navigating around states and
 * keeps track of current state and its `context`
 * (object `{ state, params, data, ... }`).
 *
 * A typical application will have a single instance
 * of state manager exposed as a module.
 *
 * ```es6
 * import { StateManager } from 'voie';
 *
 * export default new StateManager({ ... });
 * ```
 *
 * State manager emits following events:
 *
 *   * `history_updated`
 *   * `transition_finished`
 *
 */

var StateManager = (function (_EventEmitter) {
  (0, _inherits3.default)(StateManager, _EventEmitter);

  /**
   * Instantiates new state manager.
   *
   * Options:
   *
   *   * `el` — required, root DOM element for rendering views
   *     (can be either `HTMLElement` or selector string)
   *
   *   * history — a history object (see `rackt/history`)
   *
   *   * base — (only used when `history` is not specified), base href
   *     for application (URL pathname prefix)
   *
   *   * `maxRedirects` — maximum number of redirects within
   *     a single transition, when exceeded transition will fail with
   *     `RedirectLoopError` (default is 10)
   *
   *   * `activeClass` — active class for `v-link` directive
   *     (default is "active")'
   *
   *   * `handleUncaught` — `function(err) => Promise` invoked
   *     when transition fails with error
   */

  function StateManager(spec) {
    (0, _classCallCheck3.default)(this, StateManager);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(StateManager).call(this));

    _this._setupEl(spec);
    _this._setupHistory(spec);
    _this._setupOptions(spec);
    _this._setupState();
    return _this;
  }

  (0, _createClass3.default)(StateManager, [{
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
      this.transition = null;
    }

    /**
     * Handles errors uncaught during transition.
     * Used for overriding on a per-instance basis.
     *
     * @returns {Promise}
     */

  }, {
    key: 'handleUncaught',
    value: function handleUncaught(err) {
      return _promise2.default.reject(err);
    }

    /**
     * Registers a new state with specified `name`.
     *
     * You can use one of two styles:
     *
     * ```es6
     * sm.add('foo', { ... });
     * sm.add({ name: 'foo', ... });
     * ```
     *
     * All options are passed to `State` constructor.
     *
     * @returns {State}
     */

  }, {
    key: 'add',
    value: function add(name, spec) {
      if ((typeof name === 'undefined' ? 'undefined' : (0, _typeof3.default)(name)) == 'object') {
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

    /**
     * Retrieves a state previously registered via `add`.
     *
     * @returns {State}
     */

  }, {
    key: 'get',
    value: function get(name) {
      return this.states[name];
    }

    /**
     * Navigates to a state with specified `name`.
     * Navigation is performed asynchronously, allowing
     * state enter/leave hook to perform async tasks
     * (e.g. fetch data).
     *
     * Throws an exception if another transition is
     * taking place.
     *
     * Options:
     *
     *   * `name` — target state name (if null, will transition to same state
     *     with updated params)
     *   * `params` — object containing state parameters
     *     (either path variables or query string parameters)
     *   * `replace` — if `true` don't create a separate record
     *     in browser history (default is `false`)
     *
     * Transition process:
     *
     *   * find nearest common ancestor state with matching parameters
     *   * go "upstream", leaving states, cleaning up states,
     *     destroying components
     *   * go "downstream", entering states, instantiating and rendering
     *     components
     *   * update browser history to reflect target state
     *     (e.g. set new URL in address bar)
     *
     *  Note that it is the responsibility of the state to compute
     *  target URL.
     *
     *  @returns {Promise} resolved when navigation is finished.
     */

  }, {
    key: 'go',
    value: function go(options) {
      var _this2 = this;

      if (this.transition) {
        throw new Error('Transition is in progress. Abort it before going elsewhere.');
      }
      this.transition = new _transition2.default(this, options);
      return this.transition.run().then(function (result) {
        _this2.transition = null;
        _this2.emit('transition_finished');
        return result;
      }).catch(function (err) {
        _this2.transition = null;
        _this2.emit('transition_finished', err);
        return _this2.handleUncaught(err);
      }).then(function () {
        return _this2._updateHistory(options.replace || false);
      });
    }

    /**
     * Updates browser history without actually performing
     * any transitions.
     *
     * Typically used to serialize parameters into query string
     * without performing navigation (e.g. when params are used
     * only in Vue components).
     */

  }, {
    key: 'update',
    value: function update(params, replace) {
      var _this3 = this;

      (0, _assign2.default)(this.context.params, params);
      return _promise2.default.resolve().then(function () {
        return _this3._updateHistory(replace);
      });
    }

    /**
     * Resolves nearest mount point in current context tree.
     *
     * Mount point is a "slot" that corresponds to `v-view` directive
     * (and the component that hosts it).
     */

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

    /**
     * Begins listening for history events (e.g. browser back button)
     * and performs initial navigation by matching current URL.
     *
     * @returns {Promise} resolved when initial navigation is finished.
     */

  }, {
    key: 'start',
    value: function start() {
      var _this4 = this;

      if (this._unlisten) {
        return _promise2.default.resolve();
      }
      this._unlisten = this.history.listen(function (location) {
        return _this4._matchLocation(location);
      });
      return new _promise2.default(function (resolve) {
        return _this4.once('history_updated', resolve);
      });
    }

    /**
     * Stops listening for history events.
     */

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
      var _this5 = this;

      var url = location.pathname + location.search;
      if (url == this.context.url) {
        return;
      }
      var found = (0, _keys2.default)(this.states).find(function (name) {
        var state = _this5.states[name];
        var matched = state._match(location);
        if (matched) {
          debug('match url %s -> %s', location.pathname, name);
          _this5.go({
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