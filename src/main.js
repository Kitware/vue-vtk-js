// Ensure vtk.js classes available for Algorithm and Reader
import "./AvailableClasses";
import components from "./components";
import filters from "./filters";

export function install(Vue) {
  Object.keys(components).forEach((name) => {
    Vue.component(name, components[name]);
  });

  if (window?.trame?.utils?.vtk) {
    Object.keys(filters).forEach((name) => {
      window.trame.utils.vtk[name] = filters[name];
    });
  }
}

export const vtkColorPresetNames = filters.vtkColorPresetNames;
export const vtkLabel = filters.vtkLabel;
export const ListToItem = filters.ListToItem;
export const vtkColorPresetItems = filters.vtkColorPresetItems;
