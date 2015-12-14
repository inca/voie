const Vue = require('vue');

export function toVueComponent(obj) {
  if (obj.name == 'VueComponent') {
    return obj
  }
  return Vue.extend(obj);
}

window.Vue = Vue;
