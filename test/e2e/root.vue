<template>
  <div class="root">
    <div class="root-container">
      <sidenav></sidenav>
      <v-view></v-view>
    </div>
  </div>
</template>

<script>
export default {

  components: {
    sidenav: require('./sidenav.vue')
  }

}
</script>

<style>
  .root {
    display: flex;
    flex-flow: column nowrap;
    min-height: 100vh;
    box-sizing: border-box;
  }

  .root-container {
    flex: 1;
    display: flex;
    flex-flow: row nowrap;
  }
</style>
