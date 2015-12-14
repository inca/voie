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
    // Lineage is an array of states representing hierarchy from root to this state (inclusively)
    this.lineage = this.parentState ? this.parentState.lineage.concat([this]) : [this];
    // Component is optional
    if (spec.component) {
      this.component = toVueComponent(spec.component);
    }
    // Enter/leave hooks are optional
    if (spec.enter) {
      this.enter = spec.enter;
    }
    if (spec.leave) {
      this.leave = spec.leave;
    }
    // State can optionally be a redirect-only
    if (spec.redirect) {
      this.redirect = spec.redirect;
    }
  }

  enter() {
    return Promise.resolve();
  }

  leave() {
    return Promise.resolve();
  }

  includes(stateOrName) {
    var state = stateOrName instanceof State ? stateOrName : this.manager.get(stateOrName);
    return this.lineage.indexOf(state) > -1;
  }

};
