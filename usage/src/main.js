import Vue from 'vue';
import App from './App.vue';
import VueVtkJs from 'vue-vtk-js';

Vue.use(VueVtkJs);

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount('#app');
