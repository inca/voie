import Debug from 'debug';

const debug = Debug('voie:manager');

import Vue from 'vue';
import State from './state';
import Transition from './transition';
import './view-directive';

export default class Manager {

  constructor(options) {
    Object.assign(this, options || {});
    this.el = options.el;
    if (!this.el) {
      throw new Error('Please specify `el` as an entry-point node of your app.')
    }
    this.states = {};
    this.currentContext = {
      parent: null,
      state: null,  // root state
      vm: null,
      params: {},
      data: {}
    };
    this.els = {};
  }

  add(name, spec) {
    if (typeof name == 'object') {
      spec = name;
      name = spec.name
    }
    if (!name) {
      throw new Error('State `name` is mandatory.')
    }
    if (this.states[name]) {
      throw new Error('State "' + name + '" already added');
    }
    spec.name = name;
    const state = new State(this, spec);
    this.states[name] = state;
    return state;
  }

  get(name) {
    return this.states[name];
  }

  go(options) {
    if (this.transition) {
      throw new Error('Transition is in progress. Abort it before going elsewhere.')
    }
    if (typeof options === 'string') {
      name = options;
      options = {};
    } else {
      name = options.name;
    }
    if (!name) {
      throw new Error('Target state `name` is required.')
    }
    debug('go %s', name);
    const dstState = this.get(name);
    if (!dstState) {
      throw new Error('State "' + name + '" not found.');
    }
    this.transition = new Transition(this, {
      srcContext: this.currentContext,
      dstState: dstState,
      params: Object.assign({}, this.currentContext.params, options.params)
    });
    return this.transition.run()
      .then(result => {
        delete this.transition;
        return result;
      });
  }

};
