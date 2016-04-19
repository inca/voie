import pathToRegexp from 'path-to-regexp';
import querystring from 'query-string';

/**
 * Represents a node in application states hierarchy.
 *
 * Most state features are optional, the only required
 * setting is a unique `name` and a reference to `parent` state.
 *
 * Depending on features a state can represent:
 *
 *   * an abstract view (e.g. layout containing a component with `<v-view>`
 *     directive)
 *   * a concrete view
 *   * a route with path pattern and query parameters
 *   * a data resolver that provides data to its descendants
 *   * a mix of above
 *
 * Invoking constructor directly is not recommended,
 * use `StateManager#add` instead.
 *
 * @private
 */
export default class State {

  /**
   * Options:
   *
   *   * `name` — required, state name; if contains dots `.`
   *     then parent state will be inferred from this name
   *     (e.g. `layout.users` will become a parent of `layout.users.list`)
   *     unless `parent` is specified explicitly
   *
   *   * `parent` — optional, parent state (this option disables
   *     parent-from-name inference)
   *
   *   * `path` — optional pathname pattern for matching URLs and
   *     extracting parameters (e.g. `/user/:userId`). If started with `/`,
   *     then path is treated as an absolute pathname, otherwise
   *     path is treated as a fragment (absolute pathname is inherited
   *     from parent)
   *
   *   * `params` — optional object that specifies default values for
   *     additional params that this state accepts; these params
   *     will be encoded into query string
   *
   *   * `component` — optional Vue component to be rendered
   *     when entering this state
   *
   *   * `redirect` — optional state name to redirect when navigating
   *     to this state; typically used in "abstract" states (e.g. layouts,
   *     data-preparation, etc.) to specify default sub-state
   *
   *   * `enter` — optional `function(ctx, transition) => Promise` hook invoked
   *     when transitioning into this state or its descendants
   *
   *   * `leave` — optional `function(ctx, transition) => Promise` hook invoked
   *     when transitioning from this state or its descendants
   *
   *   * `handleError` — optional `function(err, ctx) => Promise` invoked
   *     when error occurs during transition into/over this state
   *
   * @param manager
   * @param spec
   */
  constructor(manager, spec) {
    this.manager = manager;
    this._setupName(spec);
    this._setupHierarchy(spec);
    this._setupComponent(spec);
    this._setupHooks(spec);
    this._setupPath(spec);
    this._setupParams(spec);
    this._setupOptions(spec);
  }

  _setupName(spec) {
    this.name = spec.name;
    if (!this.name) {
      throw new Error('State `name` is required');
    }
  }

  _setupHierarchy(spec) {
    this.parentState = this.manager.get(spec.parent || this.name.split('.').slice(0, -1).join('.')) || null;
    this.lineage = this.parentState ?
      this.parentState.lineage.concat([this]) : [this];
  }

  _setupComponent(spec) {
    if (spec.component) {
      this.component = spec.component;
      if (!this.component.name) {
        this.component.name = this.name.replace(/\./g, '-');
      }
    }
  }

  _setupHooks(spec) {
    if (spec.enter) {
      this.enter = spec.enter;
    }
    if (spec.leave) {
      this.leave = spec.leave;
    }
    if (spec.handleError) {
      this.handleError = spec.handleError;
    }
  }

  _setupPath(spec) {
    if (!spec.path && spec.url) {
      /* eslint-disable no-console */
      console.warn('state.url is deprecated; use state.path instead');
      /* eslint-enable no-console */
      spec.path = spec.url;
    }
    this.path = spec.path || '';
    if (this.path.indexOf('/') === 0) {
      this.fullPath = this.path;
    } else {
      const parentPath = this.parentState ? this.parentState.fullPath : '/';
      this.fullPath = parentPath.replace(/\/+$/, '') +
        (this.path ? '/' + this.path : '');
    }
    if (!this.fullPath) {
      this.fullPath = '/';
    }
    this._pathParams = [];
    this._pathRegex = pathToRegexp(this.fullPath, this._pathParams);
    this._pathFormat = pathToRegexp.compile(this.fullPath);
  }

  _setupParams(spec) {
    this._paramsSpec = {};
    this._pathParams.forEach(param => {
      this._paramsSpec[param.name] = null;
    });
    Object.assign(this._paramsSpec, spec.params);
  }

  _setupOptions(spec) {
    if (spec.redirect) {
      this.redirect = spec.redirect;
    }
  }

  /**
   * Invoked when going "downstream" (either into this state or
   * through this state to one of its descendants).
   *
   * Primary usage is to process `ctx.params` and populate `ctx.data`.
   *
   * Can redirect to another state by resolving `{ redirect: anotherStateName }`
   * (e.g. for authentication).
   *
   * It is also possible to render a custom Vue component instead
   * by resolving `{ component: customVueComponent }`.
   *
   * @param ctx — object `{ state, params, data }`
   * @returns {Promise}
   */
  enter(ctx) {
    return Promise.resolve();
  }

  /**
   * Invoked when going "upstream" (either from this state or
   * through this state from one of its descendants).
   * Typically used from cleaning up stuff used by this state.
   *
   * Like with `enter`, it is possible to redirect to another state
   * by resolving `{ redirect: anotherStateName }`.
   *
   * @param ctx — object `{ state, params, data }`
   * @returns {Promise}
   */
  leave(ctx) {
    return Promise.resolve();
  }

  /**
   * Invoked when error occurs during entering this state.
   *
   * Can redirect to another state by resolving `{ redirect: anotherStateName }`
   * (e.g. for authentication).
   *
   * It is also possible to render a custom Vue component instead
   * by resolving `{ component: customVueComponent }`.
   *
   * @param ctx — object `{ state, params, data }`
   * @returns {Promise}
   */
  handleError(err, ctx) {
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
    const state = stateOrName instanceof State ?
      stateOrName : this.manager.get(stateOrName);
    return this.lineage.indexOf(state) > -1;
  }

  /**
   * Attempts to match `location` to this state's `path` pattern.
   *
   * @param {{ pathname, search }} location
   * @returns an object with extracted params or `null` if don't match.
   * @private
   */
  _match(location) {
    const matched = this._pathRegex.exec(location.pathname);
    if (!matched) {
      return null;
    }
    const params = this._pathParams.reduce((params, p, i) => {
      params[p.name] = matched[i + 1];
      return params;
    }, {});
    try {
      const query = querystring.parse(location.search);
      Object.assign(params, query);
    } catch (e) {
      // No query string or parsing failed — we don't care
    }
    return params;
  }

  /**
   * Constructs a `params` object by dropping any parameters
   * not specified in `_paramsSpec` of this state.
   * Values from `_paramsSpec` act as defaults.
   *
   * @param {object} params
   * @private
   */
  _makeParams(params) {
    return Object.keys(this._paramsSpec).reduce((result, name) => {
      result[name] = name in params ? params[name] : this._paramsSpec[name];
      return result;
    }, {});
  }

  /**
   * Constructs search string by serializing query params.
   *
   * @param params
   * @return {string} search
   * @private
   */
  _makeSearch(params) {
    const query = Object.keys(params).reduce((query, key) => {
      const value = params[key];
      if (value != null) {
        query[key] = value;
      }
      return query;
    }, {});
    this._pathParams.forEach(p => {
      delete query[p.name];
    });
    try {
      const search = querystring.stringify(query);
      if (search) {
        return '?' + search;
      }
    } catch (e) {
      // No query string or serialization failed — we don't care
    }
    return '';
  }

  /**
   * Constructs an URL by encoding `params` into URL pattern and query string.
   *
   * Note: params not mentioned in `_paramsSpec` are dropped.
   *
   * @param params
   * @return {string} url
   * @private
   */
  _makeUrl(params) {
    return this._pathFormat(params) + this._makeSearch(params);
  }

  /**
   * Creates href suitable for links (taking into account base URL and
   * hash-based histories).
   *
   * @param params
   * @return {string} href
   */
  createHref(params) {
    return this.manager.history.createHref(this._makeUrl(params));
  }

};
