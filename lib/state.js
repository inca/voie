'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils');

var _pathToRegexp = require('path-to-regexp');

var _pathToRegexp2 = _interopRequireDefault(_pathToRegexp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = (function () {
  function State(manager, spec) {
    _classCallCheck(this, State);

    this.manager = manager;
    this._setupName(spec);
    this._setupHierarchy(spec);
    this._setupComponent(spec);
    this._setupHooks(spec);
    this._setupUrl(spec);
    this._setupParams(spec);
    this._setupOptions(spec);
  }

  _createClass(State, [{
    key: '_setupName',
    value: function _setupName(spec) {
      this.name = spec.name;
      if (!this.name) {
        throw new Error('State `name` is required');
      }
    }
  }, {
    key: '_setupHierarchy',
    value: function _setupHierarchy(spec) {
      this.parentState = this.manager.get(spec.parent || this.name.split('.').slice(0, -1).join('.')) || null;
      this.lineage = this.parentState ? this.parentState.lineage.concat([this]) : [this];
    }
  }, {
    key: '_setupComponent',
    value: function _setupComponent(spec) {
      if (spec.component) {
        this.component = (0, _utils.toVueComponent)(spec.component);
      }
    }
  }, {
    key: '_setupHooks',
    value: function _setupHooks(spec) {
      if (spec.enter) {
        this.enter = spec.enter;
      }
      if (spec.leave) {
        this.leave = spec.leave;
      }
      if (spec.handleError) {
        this.handleError = spec.handleError;
      }
    }
  }, {
    key: '_setupUrl',
    value: function _setupUrl(spec) {
      this.url = spec.url || '';
      if (this.url.indexOf('/') == 0) {
        this.fullUrl = this.url;
      } else {
        var parentUrl = this.parentState ? this.parentState.fullUrl : '/';
        this.fullUrl = parentUrl.replace(/\/+$/, '') + (this.url ? '/' + this.url : '');
      }
      if (!this.fullUrl) {
        this.fullUrl = '/';
      }
      this.urlParams = [];
      this.urlRegex = (0, _pathToRegexp2.default)(this.fullUrl, this.urlParams);
      this.urlFormat = _pathToRegexp2.default.compile(this.fullUrl);
    }
  }, {
    key: '_setupParams',
    value: function _setupParams(spec) {
      var _this = this;

      this.paramsSpec = Object.assign({}, spec.params);
      this.urlParams.forEach(function (param) {
        _this.paramsSpec[param.name] = null;
      });
    }
  }, {
    key: '_setupOptions',
    value: function _setupOptions(spec) {
      if (spec.redirect) {
        this.redirect = spec.redirect;
      }
    }
  }, {
    key: 'enter',
    value: function enter() {
      return Promise.resolve();
    }
  }, {
    key: 'leave',
    value: function leave() {
      return Promise.resolve();
    }
  }, {
    key: 'handleError',
    value: function handleError(err) {
      return Promise.reject(err);
    }

    /**
     * Returns true if this state is equal to `stateOrName`
     * or contains `stateOrName` somewhere up the hierarchy.
     *
     * @param {string|State} stateOrName
     * @return {boolean}
     */

  }, {
    key: 'includes',
    value: function includes(stateOrName) {
      var state = stateOrName instanceof State ? stateOrName : this.manager.get(stateOrName);
      return this.lineage.indexOf(state) > -1;
    }

    /**
     * Attempts to match `pathname` to this state's URL pattern.
     *
     * @param {string} pathname
     * @returns an object with extracted params or `null` if don't match.
     */

  }, {
    key: 'match',
    value: function match(pathname) {
      var result = this.urlRegex.exec(pathname);
      if (!result) {
        return null;
      }
      return this.urlParams.reduce(function (params, p, i) {
        params[p.name] = result[i + 1];
        return params;
      }, {});
    }

    /**
     * Constructs a `params` object by dropping any parameters
     * not specified in `paramsSpec` of this state.
     * Values from `paramsSpec` act as defaults.
     *
     * @param {object} params
     */

  }, {
    key: 'makeParams',
    value: function makeParams(params) {
      var _this2 = this;

      return Object.keys(this.paramsSpec).reduce(function (result, name) {
        result[name] = name in params ? params[name] : _this2.paramsSpec[name];
        return result;
      }, {});
    }
  }, {
    key: 'createHref',
    value: function createHref(params) {
      return this.manager.history.createHref(this.urlFormat(params));
    }
  }]);

  return State;
})();

exports.default = State;
;