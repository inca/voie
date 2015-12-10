const Vue = require('vue');

export function toVueComponent(obj) {
  if (obj.toString().indexOf('VueComponent') > -1) {
    return obj
  }
  return Vue.extend(obj);
}
