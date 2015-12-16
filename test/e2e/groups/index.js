import app from '../app';
import groups from '../data/groups';

import GroupsLayout from './layout.vue';
import GroupsList from './list.vue';

app.add('groups', {
  url: '/groups',
  parent: 'root',
  redirect: 'groups.list',
  enter: (ctx) => new Promise(resolve => {
    // We emulate a small network latency here
    setTimeout(() => {
      ctx.data.groups = groups;
      resolve();
    }, 500);
  }),
  component: GroupsLayout
});

app.add('groups.list', {
  component: GroupsList
});
