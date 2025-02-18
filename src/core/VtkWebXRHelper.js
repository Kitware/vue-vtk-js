import { inject } from "vue";
import vtkResourceLoader from "@kitware/vtk.js/IO/Core/ResourceLoader";
import vtkWebXRRenderWindowHelper from "@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper";
import vtkInteractorStyleHMDXR from "@kitware/vtk.js/Interaction/Style/InteractorStyleHMDXR";

export default {
  props: {
    drawControllersRay: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["enterXR", "exitXR"],
  setup(props, { attrs, emit }) {
    // Dynamically load WebXR polyfill from CDN for WebVR and Cardboard API backwards compatibility
    if (navigator.xr === undefined) {
      vtkResourceLoader
        .loadScript(
          "https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js"
        )
        .then(() => {
          // eslint-disable-next-line no-new, no-undef
          new WebXRPolyfill();
        });
    }

    // WebXR helper from VTK.js
    const XRHelper = vtkWebXRRenderWindowHelper.newInstance();
    const view = inject("view");

    const startXR = () => {
      // Returns if we're using an unsupported view (RemoteView)
      if (!view || !view.openglRenderWindow) {
        console.error("WebXR is not supported by VtkRemoteView");
        return;
      }
      XRHelper.setRenderWindow(view.openglRenderWindow);
      XRHelper.setDrawControllersRay(props.drawControllersRay);

      // Setup interactor style HMDXR
      attrs.oldInteractorStyle = view.renderWindow
        .getInteractor()
        .getInteractorStyle();
      view.renderWindow
        .getInteractor()
        .setInteractorStyle(vtkInteractorStyleHMDXR.newInstance());

      XRHelper.startXR();
      emit("enterXR");
    };
    const stopXR = () => {
      // Returns if we're using an unsupported view (RemoteView)
      if (!view || !view.openglRenderWindow) {
        console.error("WebXR is not supported by VtkRemoteView");
        return;
      }

      // Revert interactor style
      view.renderWindow
        .getInteractor()
        .setInteractorStyle(attrs.oldInteractorStyle);

      XRHelper.stopXR();
      emit("exitXR");
    };

    return {
      startXR,
      stopXR,
    };
  },
};
