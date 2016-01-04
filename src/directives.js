import Vue from 'vue';
import Debug from 'debug';

const debug = Debug('voie:directive');

Vue.elementDirective('v-view', {

  bind() {
    let { state, manager } = this.vm.$options;
    manager.mountPoints[state.name] = {
      hostVm: this.vm,
      viewEl: this.el,
      viewElChildren: [].slice.call(this.el.children)
    };
    debug('registered v-view', this.el);
  },

  unbind() {
    let { state, manager } = this.vm.$options;
    delete manager.mountPoints[state.name];
    debug('unregistered v-view', this.el);
  }

});

Vue.directive('link', {

  bind() {
    this.manager = resolveManager(this.vm);
    if (!this.manager) {
      throw new Error('Can\'t locate state manager.')
    }
    this.manager.on('context_updated', this.updateElement, this);
  },

  unbind() {
    this.manager.off('context_updated', this.updateElement, this);
  },

  update(value) {
    if (!value) {
      throw new Error('v-link: expression "' +
        this.expression + '" should resolve to { name: ..., params... }}')
    }
    let manager = this.manager;
    let name = null;
    if (typeof value == 'string') {
      name = value;
      this.params = {};
    } else {
      name = value.name;
      this.params = value.params || {};
    }
    this.state = manager.get(name);
    if (!this.state) {
      /* eslint-disable no-console */
      console.warn('State "' + name + '" not found.');
      /* eslint-enable no-console */
      return;
    }
    this.el.onclick = (ev) => {
      ev.preventDefault();
      manager.go({
        name: name,
        params: this.params
      });
    };
    this.updateElement();

  },

  updateElement() {
    let manager = this.manager;
    let ctx = manager.context;
    let state = this.state;
    if (!state) {
      return;
    }
    let params = Object.assign({}, ctx.params, this.params);
    this.el.setAttribute('href', state.createHref(params));
    // Add/remove active class
    this.el.classList.remove(manager.activeClass);
    if (ctx.state) {
      let paramsMatch = Object.keys(params)
        .every(key => ctx.params[key] == params[key]);
      let active = ctx.state.includes(state) && paramsMatch;
      if (active) {
        this.el.classList.add(manager.activeClass);
      } else {
        this.el.classList.remove(manager.activeClass);
      }
    }
  }

});

function resolveManager(vm) {
  let manager = vm.$options.manager;
  if (manager) {
    return manager;
  }
  if (vm.$parent) {
    return resolveManager(vm.$parent);
  }
  return null;
}
