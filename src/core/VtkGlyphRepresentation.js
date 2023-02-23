import vtkGlyph3DMapper from "@kitware/vtk.js/Rendering/Core/Glyph3DMapper";
import { props, useRepresentation } from "./representations";

export default {
  props,
  setup(props) {
    useRepresentation(props, vtkGlyph3DMapper.newInstance);
  },
  template: '<div class="vtk-glyph-representation"><slot></slot></div>',
};
