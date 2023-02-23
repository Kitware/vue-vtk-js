import { ref, inject, watch, computed } from "vue";

import VtkRemoteView from "./VtkRemoteView";
import VtkSyncView from "./VtkSyncView";

const BOTTOM_Z_INDEX = { position: "absolute !important", left: "-20000px" };
const TOP_Z_INDEX = { position: "absolute !important", left: 0 };

export default {
  components: {
    VtkRemoteView,
    VtkSyncView,
  },
  props: {
    mode: {
      type: String,
      default: "local",
    },
    disableAutoSwitch: {
      type: Boolean,
      default: false,
    },
    namespace: {
      type: String,
      default: "",
    },
    refPrefix: {
      type: String,
      default: "refName",
    },
    viewId: {
      type: String,
      default: "-1",
    },
    wsClient: {
      type: Object,
    },
    interactiveRatio: {
      type: [Number, String],
    },
    interactiveQuality: {
      type: [Number, String],
    },
    stillRatio: {
      type: [Number, String],
    },
    stillQuality: {
      type: [Number, String],
    },
    camera: {
      type: Object,
      default: null,
    },
    interactorEvents: {
      type: Array,
      default: () => ["EndAnimation"],
    },
    interactorSettings: {
      type: Array,
      default: () => [
        {
          button: 1,
          action: "Rotate",
        },
        {
          button: 2,
          action: "Pan",
        },
        {
          button: 3,
          action: "Zoom",
          scrollEnabled: true,
        },
        {
          button: 1,
          action: "Pan",
          shift: true,
        },
        {
          button: 1,
          action: "Zoom",
          alt: true,
        },
        {
          button: 1,
          action: "Zoom",
          control: true,
        },
        {
          button: 1,
          action: "Roll",
          alt: true,
          shift: true,
        },
      ],
    },
    contextName: {
      type: String,
      default: "LocalRenderingContext",
    },
    enablePicking: {
      type: Boolean,
      default: false,
    },
    boxSelection: {
      type: Boolean,
      default: false,
    },
    viewState: {
      // Only used at mount time
      type: Object,
    },
  },
  setup(props, { emit }) {
    const trame = inject("trame");
    const localRenderingReady = ref(false);
    const localViewRef = ref(null);
    const remoteViewRef = ref(null);

    // Computed
    const computedLocalRenderingReady = computed(
      () => props.disableAutoSwitch || localRenderingReady.value
    );
    const useLocal = computed(
      () => props.mode === "local" && computedLocalRenderingReady.value
    );
    const useRemote = computed(
      () => props.mode === "remote" || !computedLocalRenderingReady.value
    );
    const localStyle = computed(() =>
      useLocal.value ? TOP_Z_INDEX : BOTTOM_Z_INDEX
    );
    const remoteStyle = computed(() =>
      useRemote.value ? TOP_Z_INDEX : BOTTOM_Z_INDEX
    );
    const cameraKey = computed(() =>
      props.namespace ? `${props.namespace}Camera` : "camera"
    );

    // Methods
    function resetCamera() {
      if (props.mode === "local" && computedLocalRenderingReady.value) {
        return localViewRef.value.resetCamera();
      }
      return remoteViewRef.value.resetCamera();
    }

    function getCamera() {
      return localViewRef.value.getCamera();
    }
    function setCamera(props) {
      return localViewRef.value.setCamera(props);
    }

    function resize() {
      localViewRef.value.resize();
      remoteViewRef.value.resize();
    }

    watch(
      () => props.viewId,
      (viewId) => localViewRef.value.setSynchronizedViewId(viewId)
    );

    function trigger(name, args = [], kwargs = {}) {
      return trame.trigger(name, args, kwargs);
    }

    function onReady(v) {
      localRenderingReady.value = v;
    }

    return {
      computedLocalRenderingReady,
      onReady,
      localViewRef,
      remoteViewRef,
      trigger,
      getCamera,
      setCamera,
      resize,
      resetCamera,
      cameraKey,
      localStyle,
      remoteStyle,
      emit,
    };
  },
  template: `
        <div style="position:relative;width:100%;height:100%;z-index:0;">
          <vtk-sync-view
            ref="localViewRef"

            :viewId="viewId"
            :wsClient="wsClient"
            :style="localStyle"

            :camera="camera"
            :interactorEvents="interactorEvents"
            :interactorSettings="interactorSettings"
            :contextName="contextName"
            :boxSelection="boxSelection"

            :viewState="viewState"

            @resetCamera="trigger(cameraKey, [getCamera()])"
            @beforeSceneLoaded="onReady(false)"
            @onReady="onReady($event)"

            @BoxSelection="emit('BoxSelection', $event)"
            @StartAnimation="emit('StartAnimation', $event)"
            @Animation="emit('Animation', $event)"
            @EndAnimation="trigger(cameraKey, [getCamera()]); emit('EndAnimation', $event)"
            @MouseEnter="emit('MouseEnter', $event)"
            @MouseLeave="emit('MouseLeave', $event)"
            @StartMouseMove="emit('StartMouseMove', $event)"
            @MouseMove="emit('MouseMove', $event)"
            @EndMouseMove="emit('EndMouseMove', $event)"
            @LeftButtonPress="emit('LeftButtonPress', $event)"
            @LeftButtonRelease="emit('LeftButtonRelease', $event)"
            @MiddleButtonPress="emit('MiddleButtonPress', $event)"
            @MiddleButtonRelease="emit('MiddleButtonRelease', $event)"
            @RightButtonPress="emit('RightButtonPress', $event)"
            @RightButtonRelease="emit('RightButtonRelease', $event)"
            @KeyPress="emit('KeyPress', $event)"
            @KeyDown="emit('KeyDown', $event)"
            @KeyUp="emit('KeyUp', $event)"
            @StartMouseWheel="emit('StartMouseWheel', $event)"
            @MouseWheel="emit('MouseWheel', $event)"
            @EndMouseWheel="emit('EndMouseWheel', $event)"
            @StartPinch="emit('StartPinch', $event)"
            @Pinch="emit('Pinch', $event)"
            @EndPinch="emit('EndPinch', $event)"
            @StartPan="emit('StartPan', $event)"
            @Pan="emit('Pan', $event)"
            @EndPan="emit('EndPan', $event)"
            @StartRotate="emit('StartRotate', $event)"
            @Rotate="emit('Rotate', $event)"
            @EndRotate="emit('EndRotate', $event)"
            @Button3D="emit('Button3D', $event)"
            @Move3D="emit('Move3D', $event)"
            @StartPointerLock="emit('StartPointerLock', $event)"
            @EndPointerLock="emit('EndPointerLock', $event)"
            @StartInteraction="emit('StartInteraction', $event)"
            @Interaction="emit('Interaction', $event)"
            @EndInteraction="emit('EndInteraction', $event)"
          >
            <slot></slot>
          </vtk-sync-view>
          <vtk-remote-view
            ref="remoteViewRef"

            :viewId="viewId"
            :wsClient="wsClient"
            :style="remoteStyle"
            :visible="mode === 'remote' || !computedLocalRenderingReady"

            @onEndAnimation="trigger(cameraKey)"

            :interactiveRatio="interactiveRatio"
            :interactiveQuality="interactiveQuality"
            :stillRatio="stillRatio"
            :stillQuality="stillQuality"
            :boxSelection="boxSelection"
            :enablePicking="enablePicking"

            @BoxSelection="emit('BoxSelection', $event)"
          />
        </div>
  `,
};
