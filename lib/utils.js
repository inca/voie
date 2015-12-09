'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toVueComponent = toVueComponent;
var Vue = require('vue');

function toVueComponent(obj) {
  if (obj.toString().indexOf('VueComponent') > -1) {
    return obj;
  }
  return Vue.extend(obj);
}