import Debug from 'debug';

const debug = Debug('voie:manager');

import EventEmitter from 'eventemitter3';
import Vue from 'vue';
import State from './state';
import Transition from './transition';
import { createHistory, useBasename} from 'history';
import './directives';

/**
 * State manager holds the hierarchy of application states,
 * exposes methods for navigating around states and
 * keeps track of current state and its `context`
 * (object `{ state, params, data, ... }`).
 *
 * A typical application will have a single instance
 * of state manager exposed as a module.
 *
 * ```es6
 * import { StateManager } from 'voie';
 *
 * export default new StateManager({ ... });
 * ```
 *
 * State manager emits following events:
 *
 *   * `history_updated`
 *   * `transition_finished`
 *
 */
export default class StateManager extends EventEmitter {

  /**
   * Instantiates new state manager.
   *
   * Options:
   *
   *   * `el` — required, root DOM element for rendering views
   *     (can be either `HTMLElement` or selector string)
   *
   *   * history — a history object (see `rackt/history`)
   *
   *   * base — (only used when `history` is not specified), base href
   *     for application (URL pathname prefix)
   *
   *   * `maxRedirects` — maximum number of redirects within
   *     a single transition, when exceeded transition will fail with
   *     `RedirectLoopError` (default is 10)
   *
   *   * `activeClass` — active class for `v-link` directive
   *     (default is "active")'
   *
   *   * `handleUncaught` — `function(err) => Promise` invoked
   *     when transition fails with error
   */
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
    this.mountPoints = {
      '': {
        viewEl: this.el,
        viewElChildren: [].slice.call(this.el.children)
      }
    };
    this.transition = null;
  }

  /**
   * Handles errors uncaught during transition.
   * Used for overriding on a per-instance basis.
   *
   * @returns {Promise}
   */
  handleUncaught(err) {
    return Promise.reject(err);
  }

  /**
   * Registers a new state with specified `name`.
   *
   * You can use one of two styles:
   *
   * ```es6
   * sm.add('foo', { ... });
   * sm.add({ name: 'foo', ... });
   * ```
   *
   * All options are passed to `State` constructor.
   *
   * @returns {State}
   */
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

  /**
   * Retrieves a state previously registered via `add`.
   *
   * @returns {State}
   */
  get(name) {
    return this.states[name];
  }

  /**
   * Navigates to a state with specified `name`.
   * Navigation is performed asynchronously, allowing
   * state enter/leave hook to perform async tasks
   * (e.g. fetch data).
   *
   * Throws an exception if another transition is
   * taking place.
   *
   * Options:
   *
   *   * `name` — target state name (if null, will transition to same state
   *     with updated params)
   *   * `params` — object containing state parameters
   *     (either path variables or query string parameters)
   *   * `replace` — if `true` don't create a separate record
   *     in browser history (default is `false`)
   *
   * Transition process:
   *
   *   * find nearest common ancestor state with matching parameters
   *   * go "upstream", leaving states, cleaning up states,
   *     destroying components
   *   * go "downstream", entering states, instantiating and rendering
   *     components
   *   * update browser history to reflect target state
   *     (e.g. set new URL in address bar)
   *
   *  Note that it is the responsibility of the state to compute
   *  target URL.
   *
   *  @returns {Promise} resolved when navigation is finished.
   */
  go(options) {
    if (this.transition) {
      throw new Error('Transition is in progress. Abort it before going elsewhere.')
    }
    this.transition = new Transition(this, options);
    return this.transition.run()
      .then(result => {
        this.transition = null;
        this.emit('transition_finished');
        return result;
      })
      .catch(err => {
        this.transition = null;
        this.emit('transition_finished', err);
        return this.handleUncaught(err);
      })
      .then(() => this._updateHistory(options.replace || false));
  }

  /**
   * Updates browser history without actually performing
   * any transitions.
   *
   * Typically used to serialize parameters into query string
   * without performing navigation (e.g. when params are used
   * only in Vue components).
   */
  update(params, replace) {
    Object.assign(this.context.params, params);
    return Promise.resolve()
      .then(() => this._updateHistory(replace));
  }

  /**
   * Resolves nearest mount point in current context tree.
   *
   * Mount point is a "slot" that corresponds to `v-view` directive
   * (and the component that hosts it).
   */
  _getMountPoint() {
    let el = null;
    let ctx = this.context;
    while (ctx && !el) {
      let state = ctx.state;
      if (state) {
        el = this.mountPoints[state.name];
      } else {
        el = this.mountPoints[''];
      }
      ctx = ctx.parent;
    }
    return el;
  }

  /**
   * Begins listening for history events (e.g. browser back button)
   * and performs initial navigation by matching current URL.
   *
   * @returns {Promise} resolved when initial navigation is finished.
   */
  start() {
    if (this._unlisten) {
      return Promise.resolve();
    }
    this._unlisten = this.history.listen(location => this._matchLocation(location));
    return new Promise(resolve => this.once('history_updated', resolve));
  }

  /**
   * Stops listening for history events.
   */
  stop() {
    if (!this._unlisten) {
      return;
    }
    this._unlisten();
    delete this._unlisten;
  }

  _matchLocation(location) {
    let url = location.pathname + location.search;
    if (url == this.context.url) {
      return;
    }
    let found = Object.keys(this.states).find(name => {
      let state = this.states[name];
      let matched = state._match(location);
      if (matched) {
        debug('match url %s -> %s', location.pathname, name);
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
      console.warn('No states match URL: ' + location.pathname);
      /* eslint-enable no-console */
      this._updateHistory(true);
    }
  }

  _updateHistory(replace) {
    let state = this.context.state;
    let url = state ? state._makeUrl(this.context.params) : '/';
    if (url == this.context.url) {
      return;
    }
    this.context.url = url;
    if (replace) {
      this.history.replace(url);
    } else {
      this.history.push(url);
    }
    this.emit('history_updated', {
      url: url,
      ctx: this.context
    });
  }

};
