import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkGlyph3DMapper from 'vtk.js/Sources/Rendering/Core/Glyph3DMapper';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';

export default {
  name: 'VtkGlypRepresentation',
  props: {
    colorMapPreset: {
      type: String,
      default: 'erdc_rainbow_bright',
    },
    colorDataRange: {
      type: Array,
      default: () => [0, 1],
    },
    actor: { type: Object },
    mapper: { type: Object },
    property: { type: Object },
  },
  watch: {
    actor(v) {
      this.representation.actor.set(v);
    },
    mapper(v) {
      this.representation.mapper.set(v);
    },
    property(v) {
      this.representation.property.set(v);
    },
    colorMapPreset() {
      this.updateColorPreset();
    },
    colorDataRange() {
      this.$nextTick(this.updateColorRange);
    },
  },
  beforeCreate() {
    this.representation = {};
    this.representation.actor = vtkActor.newInstance();
    this.representation.lookupTable = vtkColorTransferFunction.newInstance();
    this.representation.mapper = vtkGlyph3DMapper.newInstance({
      lookupTable: this.representation.lookupTable,
      useLookupTableScalarRange: true,
    });
    this.representation.property = this.representation.actor.getProperty();
    this.representation.actor.setMapper(this.representation.mapper);

    // Map methods to representation
    this.representation.updateColorPreset = () => this.updateColorPreset();
    this.representation.updateColorRange = () => this.updateColorRange();
    this.representation.dataChanged = () => this.dataChanged();
  },
  mounted() {
    // Update to initial setup
    ['actor', 'mapper', 'property'].forEach((name) => {
      this.representation[name].set(this[name]);
    });

    // Initial update
    this.updateColorPreset();

    // Use parent inject
    this.view.renderer.addActor(this.representation.actor);
  },
  beforeDestroy() {
    this.view.renderer.removeActor(this.representation.actor);

    this.representation.actor.delete();
    this.representation.actor = null;

    this.representation.mapper.delete();
    this.representation.mapper = null;

    this.representation.lookupTable.delete();
    this.representation.lookupTable = null;
  },
  methods: {
    updateColorPreset() {
      const preset = vtkColorMaps.getPresetByName(this.colorMapPreset);
      this.representation.lookupTable.applyColorMap(preset);
      this.updateColorRange();
    },
    updateColorRange() {
      this.representation.lookupTable.setMappingRange(...this.colorDataRange);
      this.representation.lookupTable.updateRange();
      this.dataChanged();
    },
    dataChanged() {
      if (this.view) {
        this.$nextTick(this.view.render);
      }
    },
  },
  inject: ['view'],
  provide() {
    return {
      representation: this.representation,
      downstream: this.representation.mapper,
    };
  },
};
