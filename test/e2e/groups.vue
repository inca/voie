<template>
  <div class="groups">
    <div class="groups-container">
      <h1>Groups list</h1>
      <ul>
        <li v-for="user in groups">{{ user.name }}</li>
      </ul>
    </div>
  </div>
</template>

<style>
  .groups {
    flex: 3;
  }

  .groups-container {
    padding: 1em;
  }
</style>
