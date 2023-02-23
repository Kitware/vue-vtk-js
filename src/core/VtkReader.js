import { ref, toRefs, inject, onMounted, onBeforeUnmount, watch } from "vue";

import vtk from "@kitware/vtk.js/vtk";
import Base64 from "@kitware/vtk.js/Common/Core/Base64";

export default {
  props: {
    port: {
      type: Number,
      default: 0,
    },
    vtkClass: {
      type: String,
      default: "",
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
  setup(props) {
    const reader = ref(null);
    const downstream = inject("downstream");
    const representation = inject("representation");
    const view = inject("view");

    function updateAfterDataLoaded() {
      if (!reader.value) {
        return;
      }

      if (representation) {
        representation.dataChanged();
      }
      if (props.resetCameraOnUpdate) {
        view.resetCamera();
      }
      if (props.renderOnUpdate) {
        view.render();
      }
    }

    const { vtkClass, url, parseAsText, parseAsArrayBuffer } = toRefs(props);
    watch(vtkClass, (newClassName) => {
      let oldReader = reader.value;
      reader.value = vtk({ vtkClass: newClassName });
      downstream.setInputConnection(reader.value.getOutputPort(), props.port);
      if (oldReader) {
        oldReader.delete();
      }
    });
    watch(url, async (v) => {
      await reader.value.setUrl(v);
      updateAfterDataLoaded();
    });
    watch(parseAsText, (v) => {
      reader.value.parseAsText(v);
      updateAfterDataLoaded();
    });
    watch(parseAsArrayBuffer, (v) => {
      reader.value.parseAsArrayBuffer(Base64.toArrayBuffer(v));
      updateAfterDataLoaded();
    });

    onMounted(async () => {
      let ready = false;
      reader.value = vtk({ vtkClass: props.vtkClass });
      downstream.value.setInputConnection(
        reader.value.getOutputPort(),
        props.port
      );

      if (props.url) {
        await reader.value.setUrl(props.url);
        ready = true;
      }
      if (props.parseAsText) {
        reader.value.parseAsText(props.parseAsText);
        ready = true;
      }
      if (props.parseAsArrayBuffer) {
        reader.value.parseAsArrayBuffer(
          Base64.toArrayBuffer(props.parseAsArrayBuffer)
        );
        ready = true;
      }
      if (ready) {
        updateAfterDataLoaded();
      }
    });

    onBeforeUnmount(() => {
      if (reader.value) {
        reader.value.delete();
        reader.value = null;
      }
    });
  },
};
