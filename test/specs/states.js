import StateManager from '../../src/state-manager';
import { createMemoryHistory } from 'history';

describe('States', function() {

  describe('hierarchy', function() {

    const sm = new StateManager({
      el: document.body,
      history: createMemoryHistory()
    });
    sm.add({ name: 'app' });
    sm.add({ name: 'app.welcome' });
    sm.add({ name: 'app.welcome.hello' });
    sm.add({ name: 'users', parent: 'app' });
    sm.add({ name: 'users.list' });
    sm.add({ name: 'groups', parent: 'app' });

    it('state manager should register states', function() {
      assert.ok(sm.get('app'));
      assert.ok(sm.get('app.welcome'));
      assert.notOk(sm.get('app.wut'));
    });

    it('parents are inferred from names', function() {
      assert.equal(sm.get('app.welcome').parentState, sm.get('app'));
      assert.equal(sm.get('app.welcome.hello').parentState, sm.get('app.welcome'));
    });

    it('parent states can be specified explicitly', function() {
      assert.equal(sm.get('users').parentState, sm.get('app'));
      assert.equal(sm.get('groups').parentState, sm.get('app'));
    });

    it('lineage shows upstream path from state to root', function() {
      const usersList = sm.get('users.list');
      const groups = sm.get('groups');
      assert.lengthOf(usersList.lineage, 3);
      assert.equal(usersList.lineage[0], sm.get('app'));
      assert.equal(usersList.lineage[1], sm.get('users'));
      assert.equal(usersList.lineage[2], usersList);
      assert.lengthOf(groups.lineage, 2);
      assert.equal(groups.lineage[0], sm.get('app'));
      assert.equal(groups.lineage[1], groups);
    });

    it('should detect included state (check if self or ancestor)', function() {
      assert.ok(sm.get('users.list').includes('users'));
      assert.notOk(sm.get('users.list').includes('groups'));
      // By state
      assert.ok(sm.get('users').includes(sm.get('app')));
    });

  });

  describe('params processing', function() {

    const sm = new StateManager({
      el: document.body,
      history: createMemoryHistory()
    });

    sm.add({
      name: 'user',
      params: {
        name: null,
        display: 'short',
        greeting: 'Hello'
      }
    });

    it('should apply param defaults from spec', function() {
      const params = sm.get('user')._makeParams({
        name: 'Alice',
        display: 'full'
      });
      assert.equal(params.name, 'Alice');     // overridden
      assert.equal(params.display, 'full');   // overridden
      assert.equal(params.greeting, 'Hello'); // default
    });

    it('should drop param not from spec', function() {
      const params = sm.get('user')._makeParams({
        name: 'Alice',
        something: '?'
      });
      assert.notOk(params.something);
    });

  });

});
