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
    viewId: {
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
      scene: null,
    };
  },
  watch: {
    viewId(viewId) {
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
    resetCamera() {
      if (this.mode === 'local' && this.localRenderingReady) {
        return this.$refs.localView.resetCamera();
      }
      return this.$refs.remoteView.resetCamera();
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
    async trigger(name, args = [], kwargs = {}) {
      return this.trame.trigger(name, args, kwargs);
    },
  },
  mounted() {
    this.onSceneUpdate = (names) => {
      if (this.sceneKey && names.includes(this.sceneKey)) {
        this.scene = this.trame.state.get(this.sceneKey);
      }
    };
    if (this.sceneKey && this.trame.state.get(this.sceneKey)) {
      this.scene = this.trame.state.get(this.sceneKey);
    }
    this.trame.$on('stateChange', this.onSceneUpdate);
  },
  beforeDestroy() {
    this.trame.$off('stateChange', this.onSceneUpdate);
  },
  inject: ['trame'],
};
