'use strict';

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_vue2.default.elementDirective('voie-view', {
  bind: function bind() {
    var _vm$$options = this.vm.$options;
    var state = _vm$$options.state;
    var manager = _vm$$options.manager;

    manager.els[state.name] = this.el;
  },
  unbind: function unbind() {
    var _vm$$options2 = this.vm.$options;
    var state = _vm$$options2.state;
    var manager = _vm$$options2.manager;

    delete manager.els[state.name];
  }
});