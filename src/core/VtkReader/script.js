import vtk from 'vtk.js/Sources/vtk';
import Base64 from 'vtk.js/Sources/Common/Core/Base64';

export default {
  name: 'VtkReader',
  props: {
    port: {
      type: Number,
      default: 0,
    },
    vtkClass: {
      type: String,
      default: '',
    },
    url: {
      type: String,
    },
    parseAsText: {
      type: String,
    },
    parseAsArrayBuffer: {
      type: String,
    },
    renderOnUpdate: {
      type: Boolean,
      default: false,
    },
    resetCameraOnUpdate: {
      type: Boolean,
      default: false,
    },
  },
  beforeCreate() {
    this.reader = null;
  },
  mounted() {
    const { vtkClass } = this;
    this.reader = vtk({ vtkClass });
    this.downstream.setInputConnection(this.reader.getOutputPort(), this.port);
  },
  beforeDestroy() {
    this.reader.delete();
    this.reader = null;
  },
  methods: {
    updateAfterDataLoaded() {
      if (this.representation) {
        this.representation.dataChanged();
      }
      if (this.resetCameraOnUpdate) {
        this.view.resetCamera();
      }
      if (this.renderOnUpdate) {
        this.view.render();
      }
    },
  },
  watch: {
    vtkClass(newClassName) {
      this.reader = vtk({ vtkClass: newClassName });
      this.downstream.setInputConnection(
        this.reader.getOutputPort(),
        this.port
      );
    },
    async url(v) {
      await this.reader.setUrl(v);
      this.updateAfterDataLoaded();
    },
    parseAsText(v) {
      this.reader.parseAsText(v);
      this.updateAfterDataLoaded();
    },
    parseAsArrayBuffer(v) {
      this.reader.parseAsArrayBuffer(Base64.toArrayBuffer(v));
      this.updateAfterDataLoaded();
    },
  },
  inject: ['view', 'representation', 'downstream'],
};
