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
    let state = this.manager.get(name);
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
    let ctx = this.manager.context;
    if (!ctx.state) {
      // We're at root state, no cleanup is necessary
      return Promise.resolve();
    }
    // Stop going up if state is common with dst branch
    let state = ctx.state;
    if (this.dstState.includes(state)) {
      // All ctx params must match target ones
      // (e.g. when going from /user/1 to /user/2)
      let paramsMatch = Object.keys(ctx.params)
        .every(key => ctx.params[key] == this.params[key]);
      if (paramsMatch) {
        return Promise.resolve();
      }
    }
    return Promise.resolve()
      .then(() => state.leave(ctx, this))
      .then(() => this.manager.afterEach(ctx, this))
      .then(() => {
        debug(' <- left %s', state.name);
        this.cleanup(ctx);
      })
      .then(() => this.goUpstream());
  }

  cleanup(ctx) {
    if (ctx.vm) {
      // Destroy vm and restore v-view element
      let el = ctx.vm.$el;
      let mp = ctx.mountPoint;
      ctx.vm.$destroy();
      if (mp) {
        let viewEl = ctx.mountPoint.viewEl;
        el.parentNode.replaceChild(viewEl, el);
        mp.viewElChildren.forEach(el => viewEl.appendChild(el));
      }
    }
    this.manager.context = ctx.parent;
    this.manager.emit('context_updated', this.manager.context);
  }

  goDownstream() {
    let prevCtx = this.manager.context;
    let dstLineage = this.dstState.lineage;
    let nextState = dstLineage[dstLineage.indexOf(prevCtx.state) + 1];
    if (!nextState) {
      return Promise.resolve();
    }

    // New context inherits params and data from parent
    let nextContext = {
      parent: prevCtx,
      state: nextState,
      params: Object.assign({}, prevCtx.params, nextState._makeParams(this.params)),
      data: Object.assign({}, prevCtx.data)
    };

    return Promise.resolve()
      .then(() => this.manager.beforeEach(nextContext, this))
      .then(_handleEnterHook)
      .then(proceed => {
        if (proceed) {
          return nextState.enter(nextContext, this)
            .then(_handleEnterHook);
        }
        return false;
      })
      .then(proceed => {
        if (proceed && nextState != this.dstState) {
          return this.goDownstream();
        }
      })
      .catch(err => nextState.handleError(err, nextContext));

    function _handleEnterHook(obj) {
      obj = obj || {};
      debug(' -> entered %s', nextState.name);
      // hooks can return { redirect: 'new.state.name' }
      // or { redirect: { name, params } }
      if (obj.redirect) {
        return this.handleRedirect(obj.redirect)
          .then(() => false);
      }
      this.manager.context = nextContext;
      this.manager.emit('context_updated', this.manager.context);
      // hooks can also return { component: <VueComponent> }
      this.render(nextContext, obj.component);
      return true;
    }

  }

  render(ctx, comp) {
    let state = ctx.state;
    comp = comp || state.component;
    if (!comp) {
      return;
    }
    let Comp = toVueComponent(comp);
    let mp = this.manager._getMountPoint();
    ctx.mountPoint = mp;
    ctx.vm = new Comp({
      data: ctx.data,
      el: mp.viewEl,
      parent: mp.hostVm,
      params: ctx.params,
      ctx: ctx,
      state: state,
      manager: this.manager
    });
  }

}
