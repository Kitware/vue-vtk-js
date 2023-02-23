import {
  ref,
  toRefs,
  inject,
  provide,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";

import { capitalize } from "@kitware/vtk.js/macro";
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor";
import vtkColorMaps from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";

export const props = {
  id: {
    type: String,
  },
  colorMapPreset: {
    type: String,
    default: "erdc_rainbow_bright",
  },
  colorDataRange: {
    type: Array,
    default: () => [0, 1],
  },
  actor: { type: Object },
  mapper: { type: Object },
  property: { type: Object },
};

class Representation {
  constructor(mapperNewInstance, presetName, colorRange, view) {
    this.refs = { presetName, colorRange };
    this.view = view;
    this.actor = vtkActor.newInstance();
    this.lookupTable = vtkColorTransferFunction.newInstance();
    this.mapper = mapperNewInstance({
      lookupTable: this.lookupTable,
      useLookupTableScalarRange: true,
    });
    this.actor.setMapper(this.mapper);
    this.property = this.actor.getProperty();
  }

  updateColorPreset() {
    const preset = vtkColorMaps.getPresetByName(this.refs.presetName.value);
    this.lookupTable.applyColorMap(preset);
    this.updateColorDataRange();
  }

  updateColorDataRange() {
    this.lookupTable.setMappingRange(...this.refs.colorRange.value);
    this.lookupTable.updateRange();
    this.dataChanged();
  }

  dataChanged() {
    if (this.view) {
      nextTick(this.view.render);
    }
  }
}

export function useRepresentation(props, mapperNewInstance) {
  const view = inject("view"); // not a ref
  const { colorMapPreset, colorDataRange } = toRefs(props);
  const representation = new Representation(
    mapperNewInstance,
    colorMapPreset,
    colorDataRange,
    view
  );

  const downstream = ref(representation.mapper);

  provide("representation", representation);
  provide("downstream", downstream);

  onMounted(() => {
    // Update to initial setup
    ["actor", "mapper", "property"].forEach((name) => {
      representation[name].set(props[name]);
    });
    representation.actor.set({ representationId: props.id }, true);

    // Initial update
    representation.updateColorPreset();

    // Use parent inject
    view.renderer.addActor(representation.actor);
  });

  onBeforeUnmount(() => {
    view.renderer.removeActor(representation.actor);

    representation.actor.delete();
    representation.actor = null;

    representation.mapper.delete();
    representation.mapper = null;

    representation.lookupTable.delete();
    representation.lookupTable = null;
  });

  // Monitor changes
  ["actor", "mapper", "property"].forEach((name) => {
    watch(
      () => props[name],
      (v) => {
        if (representation[name].set(v)) {
          representation.dataChanged();
        }
      }
    );
  });
  ["colorMapPreset", "colorDataRange"].forEach((name) => {
    watch(
      () => props[name],
      () => representation[`update${capitalize(name)}`]()
    );
  });
  watch(
    () => props.id,
    (representationId) => representation.actor.set({ representationId }, true)
  );
}
