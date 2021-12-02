import VtkAlgorithm from './core/VtkAlgorithm';
import VtkCalculator from './core/VtkCalculator';
import VtkCellData from './core/VtkCellData';
import VtkDataArray from './core/VtkDataArray';
import VtkFieldData from './core/VtkFieldData';
import VtkGeometryRepresentation from './core/VtkGeometryRepresentation';
import VtkGlyphRepresentation from './core/VtkGlyphRepresentation';
import VtkMesh from './core/VtkMesh';
import VtkPointData from './core/VtkPointData';
import VtkPolydata from './core/VtkPolydata';
import VtkReader from './core/VtkReader';
import VtkRemoteLocalView from './core/VtkRemoteLocalView';
import VtkRemoteView from './core/VtkRemoteView';
import VtkShareDataset from './core/VtkShareDataset';
import VtkSyncView from './core/VtkSyncView';
import VtkView from './core/VtkView';

export default {
  VtkAlgorithm,
  VtkCalculator,
  VtkCellData,
  VtkDataArray,
  VtkFieldData,
  VtkGeometryRepresentation,
  VtkGlyphRepresentation,
  VtkMesh,
  VtkPointData,
  VtkPolydata,
  VtkReader,
  VtkRemoteLocalView,
  VtkRemoteView,
  VtkShareDataset,
  VtkSyncView,
  VtkLocalView: VtkSyncView,
  VtkView,
};
