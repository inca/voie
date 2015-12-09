import { toVueComponent } from './utils';

export default class State {

  constructor(manager, spec) {
    this.manager = manager;
    this.name = spec.name;
    if (!this.name) {
      throw new Error('State `name` is required');
    }
    // Everything else is optional
    if (spec.component) {
      this.component = toVueComponent(this.component);
    }
    if (spec.parent) {
      this.parent = spec.parent;
    }
    if (spec.enter) {
      this.enter = spec.enter;
    }
    if (spec.leave) {
      this.leave = spec.leave;
    }
    this.reuse = Boolean(spec.reuse) || false;
  }

  enter() {
    return Promise.resolve();
  }

  leave() {
    return Promise.resolve();
  }

  getParentState() {
    return this.parent ? this.manager.get(this.parent) :
      this.manager.get(this.name.split('.').slice(0, -1));
  }

  getLineage() {
    function getAncestors(state, buffer) {
      var p = state.getParentState();
      return p ? getAncestors(p, [p].concat(buffer)) : buffer;
    }
    return getAncestors(this, [this]);
  }

};
