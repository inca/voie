import StateManager from '../../src/state-manager';

describe('Transitions', function() {

  it('should leave upstream and enter downstream states', function(done) {
    var sm = createStateManager();
    var entered = [];
    var left = [];
    ['app', 'users', 'users.list', 'groups', 'groups.list'].forEach(name => {
      var state = sm.get(name);
      state.enter = () => { entered.push(state.name) };
      state.leave = () => { left.push(state.name) };
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

  function createStateManager() {
    var sm = new StateManager({
      el: document.body
    });
    sm.add({ name: 'app' });
    sm.add({ name: 'users', parent: 'app', redirect: 'users.list' });
    sm.add({ name: 'users.list' });
    sm.add({ name: 'groups', parent: 'app', redirect: 'groups.list' });
    sm.add({ name: 'groups.list' });
    return sm;
  }

});
