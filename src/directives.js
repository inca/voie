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
    this.manager.on('state_changed', this.updateClass, this);
  },

  unbind() {
    this.manager.off('state_changed', this.updateClass, this);
  },

  update(value) {
    value = value || this.expression;
    var name = null;
    var params = {};
    if (typeof value == 'string') {
      params = {};
      name = value;
    } else {
      params = val.params || {};
      name = val.name;
    }
    var manager = this.manager;
    this.state = manager.get(name);
    if (!this.state) {
      throw new Error('State "' + name + '" not found.');
    }
    // TODO set href
    this.el.onclick = function(ev) {
      ev.preventDefault();
      manager.go({
        name: name,
        params: params
      });
    };
    this.updateClass();

  },

  updateClass() {
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
