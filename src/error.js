'use strict';

export class StateNotFoundError extends Error {

  constructor(name) {
    super('State "' + name + '" not found.');
    this.name = name;
  }

}

export class RedirectLoopError extends Error {

  constructor(transition) {
    super('Redirect loop detected ' +
      '(set maxRedirects on state manager to configure max redirects per transition)');
    this.transition = transition;
  }

}
