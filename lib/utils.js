'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toVueComponent = toVueComponent;

var _vue = require('vue');

var _vue2 = _interopRequireDefault(_vue);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function toVueComponent(obj) {
  if (obj.name == 'VueComponent') {
    return obj;
  }
  return _vue2.default.extend(obj);
}