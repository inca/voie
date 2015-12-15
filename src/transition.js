import Debug from 'debug';
import { StateNotFoundError, RedirectLoopError } from './error';
import { toVueComponent } from './utils';

const debug = Debug('voie:transition');

export default class Transition {

  constructor(manager, spec) {
    this.manager = manager;
    this.redirectsCount = 0;
    let dstStateName;
    if (typeof spec === 'string') {
      dstStateName = spec;
      spec = {};
    } else {
      dstStateName = spec.name;
    }
    debug('go to %s', dstStateName);
    this.resolveDstState(dstStateName);
    this.params = spec.params || {};
  }

  resolveDstState(name, isRedirect) {
    if (isRedirect) {
      debug('redirect to %s', name);
    }
    var state = this.manager.get(name);
    if (!state) {
      throw new StateNotFoundError(name);
    }
    this.dstState = state;
    if (state.redirect) {
      this.redirectsCount++;
      if (this.redirectsCount > this.manager.maxRedirects) {
        throw new RedirectLoopError(this);
      }
      this.resolveDstState(state.redirect, true);
    }
  }

  run() {
    return this.goUpstream()
      .then(() => this.goDownstream());
  }

  goUpstream() {
    var ctx = this.manager.context;
    if (!ctx.state) {
      // We're at root state, no cleanup is necessary
      return Promise.resolve();
    }
    // Stop going up if state is common with dst branch
    var state = ctx.state;
    if (this.dstState.includes(state)) {
      return Promise.resolve();
    }
    return Promise.resolve()
      .then(() => state.leave(ctx))
      .then(() => {
        debug(' <- left %s', state.name);
        this.cleanup(ctx);
      })
      .then(() => this.goUpstream());
  }

  cleanup(ctx) {
    if (ctx.vm) {
      var el = ctx.vm.$el;
      ctx.vm.$destroy();
      if (ctx.mountPoint) {
        el.parentNode.replaceChild(ctx.mountPoint, el);
      }
    }
    this.manager.context = ctx.parent;
    this.manager.emit('state_changed', this.manager.context);
  }

  goDownstream() {
    var prevCtx = this.manager.context;
    var dstLineage = this.dstState.lineage;
    var nextState = dstLineage[dstLineage.indexOf(prevCtx.state) + 1];
    if (!nextState) {
      return Promise.resolve();
    }
    // New context inherits params and data from parent
    var nextContext = {
      parent: prevCtx,
      state: nextState,
      params: Object.assign({}, prevCtx.params, this.params),
      data: Object.assign({}, prevCtx.data)
    };
    return Promise.resolve()
      .then(() => nextState.enter(nextContext))
      .catch(err => nextState.handleError(err, nextContext))
      .then(obj => {
        obj = obj || {};
        debug(' -> entered %s', nextState.name);
        // hooks can return { redirect: 'new.state.name' }
        if (typeof obj.redirect == 'string') {
          this.resolveDstState(obj.redirect, true);
          return this.run();
        }
        this.manager.context = nextContext;
        // hooks can also return { component: <VueComponent> }
        this.render(nextContext, obj.component);
        this.manager.emit('state_changed', this.manager.context);
        if (nextState != this.dstState) {
          return this.goDownstream();
        }
      });
  }

  render(ctx, comp) {
    var state = ctx.state;
    comp = comp || state.component;
    if (!comp) {
      return;
    }
    var Comp = toVueComponent(comp);
    var mp = this.manager.getMountPoint();
    ctx.mountPoint = mp;
    ctx.vm = new Comp({
      data: ctx.data,
      el: mp,
      params: ctx.params,
      ctx: ctx,
      state: state,
      manager: this.manager
    });
  }

}
