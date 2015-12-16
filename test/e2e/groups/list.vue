<template>
  <div class="groups-list">
    <h1>Groups</h1>
    <ul>
      <li v-for="group in groups">
        {{ group.name }}
      </li>
    </ul>
  </div>
</template>
