<template>
  <div class="root">
    <div class="root-container">
      <Sidenav></Sidenav>
      <v-view class="main-container">
        <div class="loading">
          Please wait...
        </div>
      </v-view>
    </div>
  </div>
</template>

<script>
export default {

  components: {
    Sidenav: require('./sidenav.vue')
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

  .main-container {
    flex: 3;
    display: flex;
    padding: 1em;
  }

  .loading {
    flex: 1;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
  }
</style>
