import StateManager from '../../src/state-manager';

describe('States', function() {

  it('state manager should add/get states', function() {
    var sm = new StateManager({
      el: document.body
    });
    sm.add({ name: 'users' });
    sm.add({ name: 'groups' });
    assert.ok(sm.get('users'));
    assert.ok(sm.get('groups'));
    assert.notOk(sm.get('something.else'));
  });

  it('parents are inferred from names', function() {
    var sm = new StateManager({
      el: document.body
    });
    sm.add({ name: 'app' });
    sm.add({ name: 'app.users' });
    sm.add({ name: 'app.users.list' });
    sm.add({ name: 'app.groups' });
    var usersList = sm.get('app.users.list');
    var groups = sm.get('app.groups');
    assert.equal(usersList.parentState, sm.get('app.users'));
    assert.equal(groups.parentState, sm.get('app'));
  });

  function createStateManager() {
    var sm = new StateManager({
      el: document.body
    });
    sm.add({ name: 'app' });
    sm.add({ name: 'users', parent: 'app' });
    sm.add({ name: 'users.list' });
    sm.add({ name: 'groups', parent: 'app' });
    return sm;
  }

  it('parent states can be specified explicitly', function() {
    var sm = createStateManager();
    var usersList = sm.get('users.list');
    var groups = sm.get('groups');
    assert.equal(usersList.parentState, sm.get('users'));
    assert.equal(groups.parentState, sm.get('app'));
  });

  it('lineage shows upstream path from state to root', function() {
    var sm = createStateManager();
    var usersList = sm.get('users.list');
    var groups = sm.get('groups');
    assert.lengthOf(usersList.lineage, 3);
    assert.equal(usersList.lineage[0], usersList);
    assert.equal(usersList.lineage[1], sm.get('users'));
    assert.equal(usersList.lineage[2], sm.get('app'));
    assert.lengthOf(groups.lineage, 2);
    assert.equal(groups.lineage[0], groups);
    assert.equal(groups.lineage[1], sm.get('app'));
  });

});
