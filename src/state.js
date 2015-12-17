import { toVueComponent } from './utils';
import pathToRegexp from 'path-to-regexp';

export default class State {

  constructor(manager, spec) {
    this.manager = manager;
    this._setupName(spec);
    this._setupHierarchy(spec);
    this._setupComponent(spec);
    this._setupHooks(spec);
    this._setupUrl(spec);
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
    this.lineage = this.parentState ? this.parentState.lineage.concat([this]) : [this];
  }

  _setupComponent(spec) {
    if (spec.component) {
      this.component = toVueComponent(spec.component);
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

  _setupUrl(spec) {
    this.url = spec.url || '';
    if (this.url.indexOf('/') == 0) {
      this.fullUrl = this.url;
    } else {
      let parentUrl = this.parentState ? this.parentState.fullUrl : '/';
      this.fullUrl = parentUrl.replace(/\/+$/, '') + (this.url ? '/' + this.url : '');
    }
    if (!this.fullUrl) {
      this.fullUrl = '/';
    }
    this.urlParams = [];
    this.urlRegex = pathToRegexp(this.fullUrl, this.urlParams);
    this.urlFormat = pathToRegexp.compile(this.fullUrl);
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
    let state = stateOrName instanceof State ? stateOrName : this.manager.get(stateOrName);
    return this.lineage.indexOf(state) > -1;
  }

  /**
   * Attempt to match `pathname` to this state's URL pattern.
   *
   * @param {string} pathname
   * @returns an object with extracted params or `null` if don't match.
   */
  match(pathname) {
    let result = this.urlRegex.exec(pathname);
    if (!result) {
      return null;
    }
    return this.urlParams.reduce((params, p, i) => {
      params[p.name] = result[i + 1];
      return params;
    }, {});
  }

  createHref(params) {
    return this.manager.history.createHref(this.urlFormat(params));
  }

};
