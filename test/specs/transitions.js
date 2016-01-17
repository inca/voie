import StateManager from '../../src/state-manager';
import { createMemoryHistory } from 'history';

describe('Transitions', function() {

  beforeEach(() => {
    let root = document.createElement('div');
    root.setAttribute('id', 'root');
    document.body.appendChild(root);
  });

  afterEach(() => {
    let root = document.getElementById('root');
    document.body.removeChild(root);
  });

  it('should leave upstream and enter downstream states', function(done) {
    let sm = createStateManager();
    let entered = [];
    let left = [];
    ['app', 'users', 'users.list', 'groups', 'groups.list'].forEach(name => {
      let state = sm.get(name);
      let e = state.enter;
      let l = state.leave;
      state.enter = (ctx) => { entered.push(state.name); return e(ctx); };
      state.leave = (ctx) => { left.push(state.name); return l(ctx) };
    });
    sm.go('users.list')
      .then(() => {
        assert.include(entered, 'app');
        assert.include(entered, 'users');
        assert.include(entered, 'users.list');
        assert.notInclude(entered, 'groups');
        assert.notInclude(entered, 'groups.list');
        assert.notInclude(left, 'users.list');
        assert.notInclude(left, 'users');
        return sm.go('groups.list');
      })
      .then(() => {
        assert.include(left, 'users.list');
        assert.include(left, 'users');
        assert.notInclude(left, 'app');
        assert.notInclude(left, 'groups');
        assert.notInclude(left, 'groups.list');
        assert.include(entered, 'groups');
        assert.include(entered, 'groups.list');
      })
      .then(done, done);
  });

  it('should allow visiting redirect-only states', function(done) {
    let sm = createStateManager();
    sm.go('users')
      .then(() => {
        assert.equal(sm.context.state.name, 'users.list');
      })
      .then(done, done);
  });

  it('should redirect with params', function(done) {
    let sm = createStateManager();
    sm.go('groups')
      .then(() => {
        assert.equal(sm.context.state.name, 'groups.list');
        assert.equal(sm.context.params.sort, '+name');
      })
      .then(done, done);
  });

  it('should load state data and render component in layout hierarchy', function(done) {
    let sm = createStateManager();
    sm.go('users')
      .then(() => {
        assert.equal(document.querySelector('#root h1').innerText, 'Users');
        assert.lengthOf(document.querySelectorAll('#root li'), 3);
        assert.equal(document.querySelector('#root li:first-child').innerText, 'Alice');
      })
      .then(done, done);
  });

  it('should dispose of stale components and render new data', function(done) {
    let sm = createStateManager();
    sm.go('users')
      .then(() => sm.go('groups'))
      .then(() => {
        assert.lengthOf(document.querySelectorAll('#root h1'), 0);
        assert.lengthOf(document.querySelectorAll('#root li'), 2);
        assert.equal(document.querySelector('#root li:first-child').innerText, 'Admins');
      })
      .then(done, done);
  });

  it('should support redirect via state.enter hook', function(done) {
    let sm = createStateManager();
    sm.get('groups.list').enter = () => ({ redirect: 'users' });
    sm.go('groups')
      .then(() => {
        assert.equal(sm.context.state.name, 'users.list');
      })
      .then(done, done);
  });

  it('should support rendering component via state.enter hook', function(done) {
    let sm = createStateManager();
    sm.get('groups.list').enter = () => ({
      component: { template: '<h2>Groups</h2>' }
    });
    sm.go('groups')
      .then(() => {
        assert.equal(document.querySelector('h2#root').innerText, 'Groups');
      })
      .then(done, done);
  });

  it('should detect redirect loops', function(done) {
    let sm = createStateManager();
    sm.get('groups.list').enter = () => ({ redirect: 'users' });
    sm.get('users.list').enter = () => ({ redirect: 'groups' });
    sm.go('groups')
      .then(() => done(new Error('Redirect loop not detected.')))
      .catch(err => {
        assert.isDefined(err.transition);
        done();
      });
  });

  it('should handle uncaught errors ', function(done) {
    let sm = createStateManager();
    let handled = null;
    sm.handleUncaught = function(err) {
      handled = err;
    };
    sm.get('users.list').enter = () => {
      throw new Error('oopsie');
    };
    sm.go('users.list')
      .then(() => {
        assert.ok(handled);
        assert.equal(handled.message, 'oopsie');
      })
      .then(done, done);
  });

  it('should allow redirecting on errors', function(done) {
    let sm = createStateManager();
    let handled = false;
    sm.get('users.list').enter = () => {
      throw new Error('oopsie');
    };
    sm.get('users.list').handleError = () => {
      handled = true;
      return { redirect: 'groups.list' };
    };
    sm.go('users.list')
      .then(() => {
        assert.equal(sm.context.state.name, 'groups.list');
      })
      .then(done, done);
  });

  it('should render custom components on errors', function(done) {
    let sm = createStateManager();
    let handled = false;
    sm.get('users.list').enter = () => {
      throw new Error('oopsie');
    };
    sm.get('users.list').handleError = () => {
      handled = true;
      return { component: { template: '<h2>Error</h2>' } };
    };
    sm.go('users.list')
      .then(() => {
        assert.equal(document.querySelector('#root h2').innerText, 'Error');
      })
      .then(done, done);
  });

  function createStateManager() {
    let sm = new StateManager({
      el: '#root',
      history: createMemoryHistory()
    });

    sm.add({ name: 'app' });

    sm.add({
      name: 'users',
      parent: 'app',
      redirect: 'users.list',
      component: {
        template: '<div class="users"><h1>Users</h1><v-view/></div>'
      }
    });

    sm.add({
      name: 'users.list',
      enter: (ctx) => {
        ctx.data.users = [
          { name: 'Alice' },
          { name: 'Bob' },
          { name: 'Greg' }
        ];
      },
      component: {
        template: '<ul><li v-for="user in users">{{ user.name }}</li></ul>'
      }
    });

    sm.add({
      name: 'groups',
      parent: 'app',
      redirect: {
        name: 'groups.list',
        params: {
          sort: '+name'
        }
      },
      enter: (ctx) => {
        ctx.data.groups = [
          { name: 'Admins' },
          { name: 'Guests'}
        ];
      }
    });

    sm.add({
      name: 'groups.list',
      params: {
        sort: null
      },
      component: {
        template: '<ul><li v-for="group in groups">{{ group.name }}</li></ul>'
      }
    });

    return sm;
  }

});
