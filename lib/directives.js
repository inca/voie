'use strict';

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

    manager.mountPoints[state.name] = this.el;
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
    this.params = Object.assign({}, manager.context.params);
    if (typeof value == 'string') {
      name = value;
    } else {
      Object.assign(this.params, value.params || {});
      name = value.name;
    }
    this.state = manager.get(name);
    if (!this.state) {
      throw new Error('State "' + name + '" not found.');
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
    var manager = this.manager;
    var state = this.state;
    var currentState = manager.context.state;
    var active = state && currentState && currentState.includes(state);
    // TODO add option to strict match states
    if (active) {
      this.el.classList.add(manager.activeClass);
    } else {
      this.el.classList.remove(manager.activeClass);
    }
    this.el.setAttribute('href', state.createHref(this.params));
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