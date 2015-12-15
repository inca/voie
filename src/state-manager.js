import Debug from 'debug';

const debug = Debug('voie:manager');

import EventEmitter from 'eventemitter3';
import Vue from 'vue';
import State from './state';
import Transition from './transition';
import './directives';

export default class StateManager extends EventEmitter {

  constructor(spec) {
    super();
    this._setupEl(spec);
    this._setupOptions(spec);
    this._setupState();
  }

  _setupEl(spec) {
    this.el = spec.el instanceof HTMLElement ?
      spec.el : document.querySelector(spec.el);
    if (!this.el) {
      throw new Error('Please specify `el` as an entry-point node of your app.')
    }
  }

  _setupOptions(spec) {
    if (spec.handleUncaught) {
      this.handleUncaught = spec.handleUncaught;
    }
    this.maxRedirects = Number(spec.maxRedirects) || 10;
    this.activeClass = spec.activeClass || 'active';
  }

  _setupState() {
    this.states = {};
    this.context = {
      parent: null,
      state: null,  // root state
      vm: null,
      params: {},
      data: {}
    };
    this.mountPoints = {};
  }

  handleUncaught(err) {
    return Promise.reject(err);
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
    debug('add %s', name);
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
    this.transition = new Transition(this, options);
    return this.transition.run()
      .then(result => {
        delete this.transition;
        return result;
      })
      .catch(err => {
        delete this.transition;
        return this.handleUncaught(err);
      });
  }

  getMountPoint() {
    let el = null;
    let ctx = this.context;
    while (ctx && !el) {
      let state = ctx.state;
      el = state ? this.mountPoints[state.name] : this.el;
      ctx = ctx.parent;
    }
    return el;
  }

};
