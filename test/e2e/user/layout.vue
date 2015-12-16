<template>
  <div class="user">
    <h1>Hi, {{ user.name }}!</h1>
    <a v-link="{ name: 'users' }">&larr; back to users list</a>
    <v-view>
    </v-view>
  </div>
</template>
