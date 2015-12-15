import StateManager from '../../src/state-manager';

describe('URL routing', function() {

  it('should register URL patterns', function() {
    var sm = createStateManager();
    assert.equal(sm.get('app').fullUrl, '/');
    assert.equal(sm.get('users').fullUrl, '/users');
    assert.equal(sm.get('users.list').fullUrl, '/users/list');
    assert.equal(sm.get('user').fullUrl, '/user/:userName');
    assert.equal(sm.get('user.dashboard').fullUrl, '/user/:userName');
    assert.equal(sm.get('user.messages').fullUrl, '/user/:userName/messages');
  });

  it('should register named URL params', function() {
    var sm = createStateManager();
    assert.lengthOf(sm.get('users').urlParams, 0);
    assert.lengthOf(sm.get('user').urlParams, 1);
    assert.equal(sm.get('user').urlParams[0].name, 'userName');
  });

  it('should match simple URLs', function() {
    var sm = createStateManager();
    assert.ok(sm.get('app').match('/'));
    assert.ok(sm.get('app').match(''));
    assert.notOk(sm.get('app').match('/users'));
    assert.ok(sm.get('users').match('/users'));
    assert.ok(sm.get('users').match('/users/'));
    assert.notOk(sm.get('users').match('/users/list'));
  });

  it('should match URLs with parameters', function() {
    var sm = createStateManager();
    assert.notOk(sm.get('user').match('/user/'));
    assert.ok(sm.get('user').match('/user/Jane'));
  });

  it('should extract named params from URL', function() {
    var sm = createStateManager();
    var st = sm.get('user.messages');
    assert.equal(st.match('/user/Alice/messages').userName, 'Alice');
  });

  it('should format URLs with parameters', function() {
    var sm = createStateManager();
    var st = sm.get('user.messages');
    assert.equal(st.urlFormat({ userName: 'Alice' }), '/user/Alice/messages');
  });

  function createStateManager() {

    var sm = new StateManager({
      el: document.body
    });

    sm.add({
      name: 'app',
      redirect: 'users'
    });

    sm.add({
      name: 'users',
      url: '/users',
      parent: 'app',
      redirect: 'users.list'
    });

    sm.add({
      name: 'users.list',
      url: 'list'
    });

    sm.add({
      name: 'user',
      parent: 'users',
      url: '/user/:userName'
    });

    sm.add({
      name: 'user.dashboard'
    });

    sm.add({
      name: 'user.messages',
      url: 'messages'
    });

    return sm;
  }

});
