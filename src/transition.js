import Debug from 'debug';

const debug = Debug('voie:transition');

export default class Transition {

  constructor(manager, spec) {
    this.manager = manager;
    this.srcContext = spec.srcContext;
    this.dstState = spec.dstState;
    this.params = spec.params || {};
  }

  run() {
    return this.goUpstream()
      .then(() => this.goDownstream());
  }

  goUpstream() {
    return new Promise(resolve => {
      var ctx = this.manager.currentContext;
      if (!ctx.state) {
        // We're at root state, no cleanup is necessary
        return resolve();
      }
      // See if state is "common" with dst branch
      var state = ctx.state;
      var dstLineage = this.dstState.getLineage();
      if (dstLineage.indexOf(state) > -1) {
        // Reuse existing context if params match
        var canReuse = state.reuse && Object.keys(ctx.params)
            .every(key => ctx.params[key] === this.params[key]);
        if (canReuse) {
          return resolve();
        }
      }
      // Cleanup current state
      return resolve(state.leave().then(() => {
        debug('left %s', state.name);
        if (ctx.vm) {
          ctx.vm.$destroy();
        }
        this.manager.currentContext = ctx.parent;
        return this.goUpstream();
      }));
    });
  }

  goDownstream() {
    return new Promise(resolve => {
      var ctx = this.manager.currentContext;
      var states = this.dstState.getLineage();
      var i = states.indexOf(ctx.state);
      if (i > -1) {
        states = states.slice(i + 1);
      }
      var nextState = states[0];
      var nextContext = {
        parent: ctx,
        state: nextState,
        params: this.params,
        data: {}
      };
      resolve(nextState.enter(nextContext)
        .then(() => {
          debug('entered %s', nextState.name);
          if (nextState.component) {
            nextContext.vm = new nextState.component({
              data: nextContext.data,
              el: ctx.state ? this.manager.els[ctx.state.name] : this.manager.el,
              params: nextContext.params,
              ctx: nextContext,
              state: nextState,
              manager: this.manager
            });
          }
          this.manager.currentContext = nextContext;
          if (nextState.name != this.dstState.name) {
            return this.goDownstream();
          }
        }));
    });
  }

}
