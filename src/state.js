import { toVueComponent } from './utils';

export default class State {

  constructor(manager, spec) {
    this.manager = manager;
    // State name is mandatory
    this.name = spec.name;
    if (!this.name) {
      throw new Error('State `name` is required');
    }
    // Parent state can either be specified explicitly via `{ parent: 'name' }`
    // or inferred from name (dots are used as qualifiers)
    this.parentState = manager.get(spec.parent || this.name.split('.').slice(0, -1).join('.')) || null;
    // Lineage is an array of states representing hierarchy from root to this state (inclusively)
    this.lineage = this.parentState ? this.parentState.lineage.concat([this]) : [this];
    // Component is optional
    if (spec.component) {
      this.component = toVueComponent(spec.component);
    }
    // Optional hooks
    if (spec.enter) {
      this.enter = spec.enter;
    }
    if (spec.leave) {
      this.leave = spec.leave;
    }
    if (spec.handleError) {
      this.handleError = spec.handleError;
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

  handleError(err) {
    return Promise.reject(err);
  }

  /**
   * Returns true if this state is equal to `stateOrName`
   * or contains `stateOrName` somewhere up the hierarchy.
   *
   * @param {string|State} stateOrName
   * @return {boolean}
   */
  includes(stateOrName) {
    var state = stateOrName instanceof State ? stateOrName : this.manager.get(stateOrName);
    return this.lineage.indexOf(state) > -1;
  }

};
