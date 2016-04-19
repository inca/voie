import Debug from 'debug';
import { StateNotFoundError, RedirectLoopError } from './error';
import { toVueComponent } from './utils';

const debug = Debug('voie:transition');

export default class Transition {

  constructor(manager) {
    this.manager = manager;
    this.redirectsCount = 0;
    this.params = Object.assign({}, manager.context.params);
  }

  get to() {
    return this.dstState;
  }

  go(name, params, isRedirect) {
    debug(isRedirect ? 'redirect to %s' : 'go to %s', name);
    Object.assign(this.params, params || {});
    const state = this.manager.get(name);
    if (!state) {
      throw new StateNotFoundError(name);
    }
    this.dstState = state;
    if (state.redirect) {
      return this.handleRedirect(state.redirect);
    }
    return this.goUpstream()
      .then(() => this.goDownstream());
  }

  handleRedirect(redirect) {
    this.redirectsCount++;
    if (this.redirectsCount > this.manager.maxRedirects) {
      throw new RedirectLoopError(this);
    }
    switch (typeof redirect) {
      case 'string':
        return this.go(redirect, {}, true);
      case 'object':
        return this.go(redirect.name, redirect.params, true);
      case 'function':
        return Promise.resolve()
          .then(() => redirect(this))
          .then(redirect => this.handleRedirect(redirect));
      default:
        throw new Error('Unknown redirect: ' + redirect);
    }
  }

  goUpstream() {
    const ctx = this.manager.context;
    if (!ctx.state) {
      // We're at root state, no cleanup is necessary
      return Promise.resolve();
    }
    // Stop going up if state is common with dst branch
    const state = ctx.state;
    if (this.dstState.includes(state)) {
      // All ctx params must match target ones
      // (e.g. when going from /user/1 to /user/2)
      const paramsMatch = Object.keys(ctx.params)
        .every(key => ctx.params[key] === this.params[key]);
      if (paramsMatch) {
        return Promise.resolve();
      }
    }
    return Promise.resolve()
      .then(() => state.leave(ctx))
      .then(() => this.manager.afterEach(ctx))
      .then(() => {
        debug(' <- left %s', state.name);
        this.cleanup(ctx);
      })
      .then(() => this.goUpstream());
  }

  cleanup(ctx) {
    if (ctx.vm) {
      // Destroy vm and restore v-view element
      const el = ctx.vm.$el;
      const mp = ctx.mountPoint;
      ctx.vm.$destroy();
      if (mp) {
        const viewEl = ctx.mountPoint.viewEl;
        el.parentNode.replaceChild(viewEl, el);
        mp.viewElChildren.forEach(el => viewEl.appendChild(el));
      }
    }
    this.manager.context = ctx.parent;
    this.manager.emit('context_updated', this.manager.context);
  }

  goDownstream() {
    const prevCtx = this.manager.context;
    const dstLineage = this.dstState.lineage;
    const nextState = dstLineage[dstLineage.indexOf(prevCtx.state) + 1];
    if (!nextState) {
      return Promise.resolve();
    }

    // New context inherits params and data from parent
    const nextContext = {
      parent: prevCtx,
      state: nextState,
      params: Object.assign({}, prevCtx.params, nextState._makeParams(this.params)),
      data: Object.assign({}, prevCtx.data)
    };

    return Promise.resolve(true)
      .then(() => this.manager.beforeEach(nextContext))
      .catch(err => nextState.handleError(err, nextContext))
      .then(obj => this._handleEnterHook(obj, nextContext))
      .then(proceed => {
        if (!proceed) {
          return false;
        }
        return Promise.resolve()
          .then(() => nextState.enter(nextContext))
          .catch(err => nextState.handleError(err, nextContext))
          .then(obj => this._handleEnterHook(obj, nextContext));
      })
      .then(proceed => {
        if (!proceed) {
          return false;
        }
        this.manager.context = nextContext;
        this.manager.emit('context_updated', this.manager.context);
        this.render(nextContext, nextState.component);
        if (nextState !== this.dstState) {
          return this.goDownstream();
        }
      });
  }

  /**
   * @return {Boolean} proceed
   * @private
   */
  _handleEnterHook(obj, nextContext) {
    obj = obj || {};
    const nextState = nextContext.state;
    debug(' -> entered %s', nextState.name);
    // hooks can return { redirect: 'new.state.name' }
    // or { redirect: { name, params } }
    if (obj.redirect) {
      return this.handleRedirect(obj.redirect)
        .then(() => false);
    }
    // hooks can also return { component: <VueComponent> }
    const rendered = this.render(nextContext, obj.component);
    return !rendered;
  }

  render(ctx, comp) {
    if (!comp) {
      return false;
    }
    const Comp = toVueComponent(comp);
    const mp = this.manager._getMountPoint();
    ctx.mountPoint = mp;
    ctx.vm = new Comp({
      data: ctx.data,
      el: mp.viewEl,
      parent: mp.hostVm,
      params: ctx.params,
      ctx: ctx,
      state: ctx.state,
      manager: this.manager
    });
    return true;
  }

}
