<template>
  <div class="sidenav">
    <a class="sidenav-link"
       v-link="{ name: 'users' }">
      Users
    </a>
    <a class="sidenav-link"
       v-link="{ name: 'groups' }">
      Groups
    </a>
  </div>
</template>

<style>
  .sidenav {
    flex: 1;
    background: hsl(192, 20%, 20%);
  }

  .sidenav-link {
    display: block;
    padding: 1em;
    background: hsl(192, 20%, 20%);
    color: #fff;
    text-decoration: none;
  }

  .sidenav-link.active {
    background: hsl(192, 50%, 50%);
  }
</style>
