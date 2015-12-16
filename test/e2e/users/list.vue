<template>
  <div class="users-list">
    <h1>Users ({{ users.length }})</h1>
    <ul>
      <li v-for="user in users">
        <a v-link="{ name: 'user', params: { id: user.id }}">
          {{ user.name }}
        </a>
      </li>
    </ul>
  </div>
</template>
