// Ensure vtk.js classes available for Algorithm and Reader
import './AvailableClasses';
import components from './components';
import filters from './filters';

export default {
  install(Vue) {
    Object.keys(components).forEach((name) => {
      Vue.component(name, components[name]);
    });
    Object.keys(filters).forEach((name) => {
      Vue.filter(name, filters[name]);
    });
  },
};
