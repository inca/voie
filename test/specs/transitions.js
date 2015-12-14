import StateManager from '../../src/state-manager';

describe('Transitions', function() {

  beforeEach(() => {
    var root = document.createElement('div');
    root.setAttribute('id', 'root');
    document.body.appendChild(root);
  });

  afterEach(() => {
    var root = document.getElementById('root');
    document.body.removeChild(root);
  });

  it('should leave upstream and enter downstream states', function(done) {
    var sm = createStateManager();
    var entered = [];
    var left = [];
    ['app', 'users', 'users.list', 'groups', 'groups.list'].forEach(name => {
      var state = sm.get(name);
      var e = state.enter;
      var l = state.leave;
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
        done();
      })
      .catch(done);
  });

  it('should allow visiting redirect-only states', function(done) {
    var sm = createStateManager();
    sm.go('users')
      .then(() => {
        assert.equal(sm.context.state.name, 'users.list');
        done();
      })
      .catch(done);
  });

  it('should load state data and render component in layout hierarchy', function(done) {
    var sm = createStateManager();
    sm.go('users')
      .then(() => {
        assert.equal(document.querySelector('#root h1').innerText, 'Users');
        assert.lengthOf(document.querySelectorAll('#root li'), 3);
        assert.equal(document.querySelector('#root li:first-child').innerText, 'Alice');
        done();
      })
      .catch(done);
  });

  it('should dispose of stale components and render new data', function(done) {
    var sm = createStateManager();
    sm.go('users')
      .then(() => sm.go('groups'))
      .then(() => {
        assert.lengthOf(document.querySelectorAll('#root h1'), 0);
        assert.lengthOf(document.querySelectorAll('#root li'), 2);
        assert.equal(document.querySelector('#root li:first-child').innerText, 'Admins');
        done();
      })
      .catch(done);
  });

  it('should support returning redirect from state.enter hook', function(done) {
    var sm = createStateManager();
    sm.get('groups.list').enter = () => ({ redirect: 'users' });
    sm.go('groups')
      .then(() => {
        assert.equal(sm.context.state.name, 'users.list');
        done();
      })
      .catch(done);
  });

  function createStateManager() {
    var sm = new StateManager({
      el: '#root'
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
      redirect: 'groups.list',
      enter: (ctx) => {
        ctx.data.groups = [
          { name: 'Admins' },
          { name: 'Guests'}
        ];
      }
    });

    sm.add({
      name: 'groups.list',
      component: {
        template: '<ul><li v-for="group in groups">{{ group.name }}</li></ul>'
      }
    });

    return sm;
  }

});
