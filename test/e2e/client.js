import Vue from 'vue';
import { StateManager } from '../../src';

const app = new StateManager({
  el: '#app'
});

app.add('root', {
  redirect: 'users',
  component: require('./root.vue')
});

app.add('users', {
  url: '/users',
  parent: 'root',
  component: require('./users.vue')
});

app.add('groups', {
  url: '/groups',
  parent: 'root',
  component: require('./groups.vue')
});

app.go('root');
