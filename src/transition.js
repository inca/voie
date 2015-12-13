import Debug from 'debug';
import { StateNotFoundError } from './error';

const debug = Debug('voie:transition');

export default class Transition {

  constructor(manager, spec) {
    this.manager = manager;
    let dstStateName;
    if (typeof spec === 'string') {
      dstStateName = spec;
      spec = {};
    } else {
      dstStateName = options.name;
    }
    debug('go to %s', dstStateName);
    this.dstState = this.resolveDstState(dstStateName);
    this.params = spec.params || {};
  }

  resolveDstState(name) {
    var state = this.manager.get(name);
    if (!state) {
      throw new StateNotFoundError(name);
    }
    if (state.redirect) {
      debug('redirect from %s to %s', name, state.redirect);
      return this.resolveDstState(state.redirect);
    }
    return state;
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
      // TODO check if can be reused
      return Promise.resolve();
    }
    return Promise.resolve()
      .then(() => state.leave(ctx))
      .then(() => {
        debug(' <- left %s', state.name);
        if (ctx.vm) {
          ctx.vm.$destroy();
        }
        this.manager.context = ctx.parent;
        return this.goUpstream();
      });
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
      .then(obj => {
        obj = obj || {};
        // enter can return { redirect: 'new.state.name' }
        if (typeof obj.redirect == 'string') {
          var redirectToState = this.manager.get(obj.redirect);
          if (!redirectToState) {
            return Promise.reject(new StateNotFoundError(obj.redirect));
          }
          debug('redirect to', redirectToState.name, redirectToState);
          this.dstState = redirectToState;
          return this.run();
        }
        // context entered
        this.manager.context = nextContext;
        debug(' -> entered', nextState.name);
        // render component, if any
        if (nextState.component) {
          nextContext.vm = new nextState.component({
            data: nextContext.data,
            el: this.manager.getCurrentEl(),
            params: nextContext.params,
            ctx: nextContext,
            state: nextState,
            manager: this.manager
          });
        }
        // Go further
        if (nextState != this.dstState) {
          return this.goDownstream();
        }
      });
  }

}
