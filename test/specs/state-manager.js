'use strict';

import { StateManager } from '../../lib';

describe('State Manager', function() {

  it('should add states', function() {
    var sm = new StateManager({
      el: document.body
    });
    sm.add({ name: 'users' });
    sm.add({ name: 'groups' });
    assert.ok(sm.get('users'));
    assert.ok(sm.get('groups'));
    assert.notOk(sm.get('something'));
  });

});
