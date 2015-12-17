import Vue from 'vue';

export function toVueComponent(obj) {
  if (obj.name == 'VueComponent') {
    return obj
  }
  return Vue.extend(obj);
}
