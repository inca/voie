import { toVueComponent } from './utils';

export default class State {

  constructor(manager, spec) {
    this.manager = manager;
    // State name is mandatory
    this.name = spec.name;
    if (!this.name) {
      throw new Error('State `name` is required');
    }
    // Parent state can be null for "root" state
    let parentStateName = spec.parent || this.name.split('.').slice(0, -1).join('.');
    this.parentState = manager.get(parentStateName) || null;
    // Lineage is an array of states representing hierarchy from this state to root
    this.lineage = this.parentState ? [this].concat(this.parentState.lineage) : [this];
    // Component is optional
    if (spec.component) {
      this.component = toVueComponent(this.component);
    }
    // Enter/leave hooks are optional
    if (spec.enter) {
      this.enter = spec.enter;
    }
    if (spec.leave) {
      this.leave = spec.leave;
    }
  }

  enter() {
    return Promise.resolve();
  }

  leave() {
    return Promise.resolve();
  }

};
