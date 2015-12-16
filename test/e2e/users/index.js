import app from '../app';
import users from '../data/users';

import UsersLayout from './layout.vue';
import UsersList from './list.vue';

app.add('users', {
  url: '/users',
  parent: 'root',
  redirect: 'users.list',
  enter: (ctx) => new Promise(resolve => {
    // We emulate a small network latency here
    setTimeout(() => {
      ctx.data.users = users;
      resolve();
    }, 500);
  }),
  component: UsersLayout
});

app.add('users.list', {
  component: UsersList
});
