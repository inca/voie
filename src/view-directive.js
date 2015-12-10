import Vue from 'vue';

Vue.elementDirective('voie-view', {

  bind() {
    const { state, manager } = this.vm.$options;
    manager.els[state.name] = this.el;
  },

  unbind() {
    const { state, manager } = this.vm.$options;
    delete manager.els[state.name];
  }

});
