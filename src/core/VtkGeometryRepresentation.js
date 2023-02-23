import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper";
import { props, useRepresentation } from "./representations";

export default {
  props,
  setup(props) {
    useRepresentation(props, vtkMapper.newInstance);
  },
  template: '<div class="vtk-geometry-representation"><slot></slot></div>',
};
