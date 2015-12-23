import StateManager from '../../src/state-manager';
import { createHashHistory } from 'history';

describe('Query support', function() {

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

  it('should format URL with query strings', function() {
    let sm = createStateManager();
    let qs = sm.get('user')._makeUrl({
      userName: 'Alice',
      collapsed: true,
      tags: ['one', 'two']
    });
    assert.equal(qs, '/user/Alice?collapsed=true&tags=one&tags=two');
  });

  it('should inherit default query params from hierarchy', function(done) {
    let sm = createStateManager();
    sm.go({
      name: 'user',
      params: {
        userName: 'Alice'
      }
    }).then(() => {
      assert.equal(sm.context.url, '/user/Alice?collapsed=false');
      done();
    });
  });

  it('should override both inherited and own params', function(done) {
    let sm = createStateManager();
    sm.go({
      name: 'user',
      params: {
        userName: 'Alice',
        section: 'some',
        collapsed: true
      }
    }).then(() => {
      assert.equal(sm.context.url, '/user/Alice?collapsed=true&section=some');
      done();
    });
  });

  it('should drop nulls in query params', function(done) {
    let sm = createStateManager();
    sm.go({
      name: 'user',
      params: {
        userName: 'Alice',
        section: null,
        collapsed: null
      }
    }).then(() => {
      assert.equal(sm.context.url, '/user/Alice');
      done();
    });
  });

  it('should parse query params from location', function(done) {
    let sm = createStateManager();
    location.hash = '#/user/Alice?collapsed=true&section=any&tags=foo&tags=bar';
    sm.start().then(() => {
      let ctx = sm.context;
      assert.equal(ctx.params.collapsed, 'true');
      assert.equal(ctx.params.section, 'any');
      assert.lengthOf(ctx.params.tags, 2);
    })
      .then(() => sm.stop())
      .then(done);
  });

  function createStateManager() {

    let sm = new StateManager({
      el: '#root',
      history: createHashHistory({
        queryKey: false
      })
    });

    sm.add({
      name: 'user',
      redirect: 'user.info',
      url: '/user/:userName',
      params: {
        collapsed: false,
        tags: []
      }
    });

    sm.add({
      name: 'user.info',
      params: {
        section: null
      }
    });

    return sm;
  }

});
