import app from '../app';
import users from '../data/users';

import UserLayout from './layout.vue';
import UserDashboard from './dashboard.vue';

app.add('user', {
  url: '/user/:id',
  parent: 'users',
  redirect: 'user.dashboard',
  enter: (ctx) => {
    ctx.data.user = users.find(u => u.id == ctx.params.id);
  },
  component: UserLayout
});

app.add('user.dashboard', {
  component: UserDashboard
});
