'use strict';

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('voie:directive');

_vue2.default.elementDirective('v-view', {
  bind: function bind() {
    var _vm$$options = this.vm.$options;
    var state = _vm$$options.state;
    var manager = _vm$$options.manager;

    manager.mountPoints[state.name] = {
      hostVm: this.vm,
      viewEl: this.el,
      viewElChildren: [].slice.call(this.el.children)
    };
    debug('registered v-view', this.el);
  },
  unbind: function unbind() {
    var _vm$$options2 = this.vm.$options;
    var state = _vm$$options2.state;
    var manager = _vm$$options2.manager;

    delete manager.mountPoints[state.name];
    debug('unregistered v-view', this.el);
  }
});

_vue2.default.directive('link', {
  bind: function bind() {
    this.manager = resolveManager(this.vm);
    if (!this.manager) {
      throw new Error('Can\'t find state manager.');
    }
    this.manager.on('state_changed', this.updateElement, this);
  },
  unbind: function unbind() {
    this.manager.off('state_changed', this.updateElement, this);
  },
  update: function update(value) {
    var _this = this;

    var manager = this.manager;
    var name = null;
    this.params = (0, _assign2.default)({}, manager.context.params);
    if (!value) {
      throw new Error('v-link: expression "' + this.expression + '" should resolve to { name: ..., params... }}');
    }
    if (typeof value == 'string') {
      name = value;
    } else {
      (0, _assign2.default)(this.params, value.params || {});
      name = value.name;
    }
    this.state = manager.get(name);
    if (!this.state) {
      /* eslint-disable no-console */
      console.warn('State "' + name + '" not found.');
      /* eslint-enable no-console */
      return;
    }
    this.el.onclick = function (ev) {
      ev.preventDefault();
      manager.go({
        name: name,
        params: _this.params
      });
    };
    this.updateElement();
  },
  updateElement: function updateElement() {
    var _this2 = this;

    var state = this.state;
    if (!state) {
      return;
    }
    this.el.setAttribute('href', state.createHref(this.params));
    // Add active class
    var manager = this.manager;
    var ctx = manager.context;
    this.el.classList.remove(manager.activeClass);
    if (ctx.state) {
      var paramsMatch = (0, _keys2.default)(this.params).every(function (key) {
        return ctx.params[key] == _this2.params[key];
      });
      var active = ctx.state.includes(state) && paramsMatch;
      if (active) {
        this.el.classList.add(manager.activeClass);
      }
    }
  }
});

function resolveManager(vm) {
  var manager = vm.$options.manager;
  if (manager) {
    return manager;
  }
  if (vm.$parent) {
    return resolveManager(vm.$parent);
  }
  return null;
}