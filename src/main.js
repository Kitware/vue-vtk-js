// Ensure vtk.js classes available for Algorithm and Reader
import "./AvailableClasses";
import components from "./components";

export function install(Vue) {
  Object.keys(components).forEach((name) => {
    Vue.component(name, components[name]);
  });
}
