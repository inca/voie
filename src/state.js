import pathToRegexp from 'path-to-regexp';
import querystring from 'query-string';

export default class State {

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
    if (this.path.indexOf('/') == 0) {
      this.fullPath = this.path;
    } else {
      let parentPath = this.parentState ? this.parentState.fullPath : '/';
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
    this._paramsSpec = Object.assign({}, spec.params);
    this._pathParams.forEach(param => {
      this._paramsSpec[param.name] = null;
    });
  }

  _setupOptions(spec) {
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
    let state = stateOrName instanceof State ?
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
    let matched = this._pathRegex.exec(location.pathname);
    if (!matched) {
      return null;
    }
    let params = this._pathParams.reduce((params, p, i) => {
      params[p.name] = matched[i + 1];
      return params;
    }, {});
    try {
      let query = querystring.parse(location.search);
      Object.assign(params, query);
    } catch (e) {}
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
    let query = Object.keys(params).reduce((query, key) => {
      var value = params[key];
      if (value != null) {
        query[key] = value;
      }
      return query;
    }, {});
    this._pathParams.forEach(p => {
      delete query[p.name];
    });
    try {
      let search = querystring.stringify(query);
      if (search) {
        return '?' + search;
      }
    } catch (e) {}
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
