import VtkRemoteView from '../VtkRemoteView';
import VtkSyncView from '../VtkSyncView';

const BOTTOM_Z_INDEX = { position: 'absolute !important', left: '-20000px' };
const TOP_Z_INDEX = { position: 'absolute !important', left: 0 };

export default {
  name: 'VtkRemoteLocalView',
  components: {
    VtkRemoteView,
    VtkSyncView,
  },
  props: {
    mode: {
      type: String,
      default: 'local',
    },
    namespace: {
      type: String,
      default: '',
    },
    id: {
      type: String,
      default: '-1',
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
      default: () => ['EndAnimation'],
    },
    interactorSettings: {
      type: Array,
      default: () => [
        {
          button: 1,
          action: 'Rotate',
        },
        {
          button: 2,
          action: 'Pan',
        },
        {
          button: 3,
          action: 'Zoom',
          scrollEnabled: true,
        },
        {
          button: 1,
          action: 'Pan',
          shift: true,
        },
        {
          button: 1,
          action: 'Zoom',
          alt: true,
        },
        {
          button: 1,
          action: 'Zoom',
          control: true,
        },
        {
          button: 1,
          action: 'Roll',
          alt: true,
          shift: true,
        },
      ],
    },
    contextName: {
      type: String,
      default: 'LocalRenderingContext',
    },
    boxSelection: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      localRenderingReady: false,
    };
  },
  watch: {
    id(viewId) {
      this.$refs.localView.setSynchronizedViewId(viewId);
    },
  },
  computed: {
    localStyle() {
      const useLocal = this.mode === 'local' && this.localRenderingReady;
      return useLocal ? TOP_Z_INDEX : BOTTOM_Z_INDEX;
    },
    remoteStyle() {
      const useRemote = this.mode === 'remote' || !this.localRenderingReady;
      return useRemote ? TOP_Z_INDEX : BOTTOM_Z_INDEX;
    },
    sceneKey() {
      if (this.namespace) {
        return `${this.namespace}Scene`;
      }
      return 'scene';
    },
    cameraKey() {
      if (this.namespace) {
        return `${this.namespace}Camera`;
      }
      return 'camera';
    },
  },
  methods: {
    getViewState() {
      const scene = this.get(this.sceneKey);
      return scene;
    },
    resetCamera() {
      return this.$refs.localView.resetCamera();
    },
    getCamera() {
      return this.$refs.localView.getCamera();
    },
    setCamera(props) {
      return this.$refs.localView.setCamera(props);
    },
    resize() {
      this.$refs.localView.resize();
      this.$refs.remoteView.resize();
    },
  },
  inject: ['get', 'set', 'trigger'],
};
