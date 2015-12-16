import Vue from 'vue';
import Debug from 'debug';

const debug = Debug('voie:directive');

Vue.elementDirective('v-view', {

  bind() {
    var { state, manager } = this.vm.$options;
    manager.mountPoints[state.name] = this.el;
    debug('registered v-view', this.el);
  },

  unbind() {
    var { state, manager } = this.vm.$options;
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
