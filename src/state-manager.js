import Debug from 'debug';

const debug = Debug('voie:manager');

import EventEmitter from 'eventemitter3';
import Vue from 'vue';
import State from './state';
import Transition from './transition';
import { createHistory, useBasename} from 'history';
import './directives';

export default class StateManager extends EventEmitter {

  constructor(spec) {
    super();
    this._setupEl(spec);
    this._setupHistory(spec);
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

  _setupHistory(spec) {
    if (spec.history) {
      this.history = spec.history;
    } else {
      this._setupDefaultHtml5History(spec);
    }
  }

  _setupDefaultHtml5History(spec) {
    let base = spec.base;
    // Try to take base from `<base href=""/>`
    if (!base) {
      let baseEl = document.querySelector('base');
      base = baseEl && baseEl.getAttribute('href');
    }
    base = (base || '').replace(/\/+$/, '');
    this.history = useBasename(createHistory)({ basename: base });
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
        this.emit('transition_finished');
        return result;
      })
      .catch(err => {
        delete this.transition;
        this.emit('transition_finished', err);
        return this.handleUncaught(err);
      })
      .then(() => this._updateHistory(options.replace || false));
  }

  _getMountPoint() {
    let el = null;
    let ctx = this.context;
    while (ctx && !el) {
      let state = ctx.state;
      el = state ? this.mountPoints[state.name] : this.el;
      ctx = ctx.parent;
    }
    return el;
  }

  start() {
    if (this._unlisten) {
      return Promise.resolve();
    }
    this._unlisten = this.history.listen(location => this._matchLocation(location));
    return new Promise(resolve => this.once('history_updated', resolve));
  }

  stop() {
    if (!this._unlisten) {
      return;
    }
    this._unlisten();
    delete this._unlisten;
  }

  _matchLocation(location) {
    let pathname = location.pathname;
    if (pathname == this.context.pathname) {
      return;
    }
    let found = Object.keys(this.states).find(name => {
      let state = this.states[name];
      let matched = state.match(pathname);
      if (matched) {
        debug('match url %s -> %s', pathname, name);
        this.go({
          name: name,
          params: matched,
          replace: true
        });
        return true;
      }
    });
    if (!found) {
      /* eslint-disable no-console */
      console.warn('No states match URL: ' + pathname);
      /* eslint-enable no-console */
      this._updateHistory(true);
    }
  }

  _updateHistory(replace) {
    let state = this.context.state;
    let pathname = state ? state.urlFormat(this.context.params) : '/';
    if (pathname == this.context.pathname) {
      return;
    }
    this.context.pathname = pathname;
    if (replace) {
      this.history.replace(pathname);
    } else {
      this.history.push(pathname);
    }
    this.emit('history_updated', {
      pathname: pathname,
      ctx: this.context
    });
  }

};
