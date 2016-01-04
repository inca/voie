import StateManager from '../../src/state-manager';
import { createHashHistory } from 'history';

describe('URL routing', function() {

  beforeEach(() => {
    let root = document.createElement('div');
    root.setAttribute('id', 'root');
    document.body.appendChild(root);
  });

  afterEach(() => {
    let root = document.getElementById('root');
    document.body.removeChild(root);
    // We use hash history here to simplify test infrastructure
    location.hash = '';
  });

  it('should register URL patterns', function() {
    let sm = createStateManager();
    assert.equal(sm.get('app').fullPath, '/');
    assert.equal(sm.get('users').fullPath, '/users');
    assert.equal(sm.get('users.list').fullPath, '/users/list');
    assert.equal(sm.get('user').fullPath, '/user/:userName');
    assert.equal(sm.get('user.dashboard').fullPath, '/user/:userName');
    assert.equal(sm.get('user.messages').fullPath, '/user/:userName/messages');
  });

  it('should register named URL params', function() {
    let sm = createStateManager();
    assert.lengthOf(sm.get('users')._pathParams, 0);
    assert.lengthOf(sm.get('user')._pathParams, 1);
    assert.equal(sm.get('user')._pathParams[0].name, 'userName');
  });

  it('should match simple URLs', function() {
    let sm = createStateManager();
    assert.ok(sm.get('app')._match({ pathname: '/' }));
    assert.ok(sm.get('app')._match({ pathname: '' }));
    assert.notOk(sm.get('app')._match({ pathname: '/users' }));
    assert.ok(sm.get('users')._match({ pathname: '/users' }));
    assert.ok(sm.get('users')._match({ pathname: '/users/' }));
    assert.notOk(sm.get('users')._match({ pathname: '/users/list' }));
  });

  it('should match URLs with parameters', function() {
    let sm = createStateManager();
    assert.notOk(sm.get('user')._match({ pathname: '/user/' }));
    assert.ok(sm.get('user')._match({ pathname: '/user/Jane' }));
  });

  it('should extract named params from URL', function() {
    let sm = createStateManager();
    let st = sm.get('user.messages');
    assert.equal(st._match({ pathname: '/user/Alice/messages' }).userName, 'Alice');
  });

  it('should format URLs with parameters', function() {
    let sm = createStateManager();
    let st = sm.get('user.messages');
    assert.equal(st._pathFormat({ userName: 'Alice' }), '/user/Alice/messages');
  });

  it('should visit root state automatically after start', function(done) {
    let sm = createStateManager();
    sm.start()
      .then(() => {
        assert.equal(sm.context.state.name, 'users.list');
      })
      .then(() => sm.stop())
      .then(done, done);
  });

  it('should update URL after start', function(done) {
    let sm = createStateManager();
    sm.start()
      .then(() => {
        assert.equal(location.hash, '#/users/list');
      })
      .then(() => sm.stop())
      .then(done, done);
  });

  it('should update URL after visiting another state', function(done) {
    let sm = createStateManager();
    sm.start()
      .then(() => sm.go({ name: 'user.messages', params: { userName: 'Alice' } }))
      .then(() => {
        assert.equal(location.hash, '#/user/Alice/messages');
      })
      .then(() => sm.stop())
      .then(done, done);
  });

  it('should update URL after visiting same state with different params', function(done) {
    let sm = createStateManager();
    sm.start()
      .then(() => sm.go({ name: 'user', params: { userName: 'Alice' } }))
      .then(() => {
        assert.equal(sm.context.state.name, 'user.dashboard');
        assert.equal(location.hash, '#/user/Alice');
      })
      .then(() => sm.go({ name: 'user', params: { userName: 'Bob' } }))
      .then(() => {
        assert.equal(sm.context.state.name, 'user.dashboard');
        assert.equal(location.hash, '#/user/Bob');
      })
      .then(() => sm.stop())
      .then(done, done);
  });

  function createStateManager() {

    let sm = new StateManager({
      el: '#root',
      history: createHashHistory({
        queryKey: false
      })
    });

    sm.add({
      name: 'app',
      redirect: 'users'
    });

    sm.add({
      name: 'users',
      path: '/users',
      parent: 'app',
      redirect: 'users.list'
    });

    sm.add({
      name: 'users.list',
      path: 'list'
    });

    sm.add({
      name: 'user',
      parent: 'users',
      redirect: 'user.dashboard',
      path: '/user/:userName'
    });

    sm.add({
      name: 'user.dashboard'
    });

    sm.add({
      name: 'user.messages',
      path: 'messages'
    });

    return sm;
  }

});
