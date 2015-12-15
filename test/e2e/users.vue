<template>
  <div class="users">
    <div class="users-container">
      <h1>Users list</h1>
      <ul>
        <li v-for="user in users">{{ user.name }}</li>
      </ul>
    </div>
  </div>
</template>

<style>
  .users {
    flex: 3;
  }

  .users-container {
    padding: 1em;
  }
</style>
