'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var State = (function () {
  function State(manager, spec) {
    _classCallCheck(this, State);

    this.manager = manager;
    this.name = spec.name;
    if (!this.name) {
      throw new Error('State `name` is required');
    }
    // Everything else is optional
    if (spec.component) {
      this.component = (0, _utils.toVueComponent)(this.component);
    }
    if (spec.parent) {
      this.parent = spec.parent;
    }
    if (spec.enter) {
      this.enter = spec.enter;
    }
    if (spec.leave) {
      this.leave = spec.leave;
    }
    this.reuse = Boolean(spec.reuse) || false;
  }

  _createClass(State, [{
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
    key: 'getParentState',
    value: function getParentState() {
      return this.parent ? this.manager.get(this.parent) : this.manager.get(this.name.split('.').slice(0, -1));
    }
  }, {
    key: 'getLineage',
    value: function getLineage() {
      function getAncestors(state, buffer) {
        var p = state.getParentState();
        return p ? getAncestors(p, [p].concat(buffer)) : buffer;
      }
      return getAncestors(this, [this]);
    }
  }]);

  return State;
})();

exports.default = State;
;