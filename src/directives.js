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
      throw new Error('Can\'t find state manager.')
    }
    this.manager.on('state_changed', this.updateElement, this);
  },

  unbind() {
    this.manager.off('state_changed', this.updateElement, this);
  },

  update(value) {
    let manager = this.manager;
    let name = null;
    this.params = Object.assign({}, manager.context.params);
    if (!value) {
      throw new Error('v-link: expression "' +
        this.expression + '" should resolve to { name: ..., params... }}')
    }
    if (typeof value == 'string') {
      name = value;
    } else {
      Object.assign(this.params, value.params || {});
      name = value.name;
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
    let state = this.state;
    if (!state) {
      return;
    }
    this.el.setAttribute('href', state.createHref(this.params));
    // Add active class
    let manager = this.manager;
    let ctx = manager.context;
    this.el.classList.remove(manager.activeClass);
    if (ctx.state) {
      let paramsMatch = Object.keys(this.params)
        .every(key => ctx.params[key] == this.params[key]);
      let active = ctx.state.includes(state) && paramsMatch;
      if (active) {
        this.el.classList.add(manager.activeClass);
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
