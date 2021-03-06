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
      type: Number,
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
  },
  data() {
    return {
      localRenderingReady: true,
    };
  },
  computed: {
    localStyle() {
      return this.mode === 'local' && this.localRenderingReady
        ? TOP_Z_INDEX
        : BOTTOM_Z_INDEX;
    },
    remoteStyle() {
      return this.mode === 'remote' || !this.localRenderingReady
        ? TOP_Z_INDEX
        : BOTTOM_Z_INDEX;
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
      return this.$refs.localView.resetCamera();
    },
    getCamera() {
      return this.$refs.localView.getCamera();
    },
    setCamera(props) {
      return this.$refs.localView.setCamera(props);
    },
  },
  inject: ['get', 'set', 'trigger'],
};
