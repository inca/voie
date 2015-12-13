'use strict';

export class StateNotFoundError extends Error {

  constructor(name) {
    super('State "' + name + '" not found.');
    this.name = name;
  }

}
