import app from '../app';

app.add('root', {
  redirect: 'users',
  component: require('./root.vue')
});
