import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';

function vtkColorPresetNames() {
  return vtkColorMaps.rgbPresetNames;
}

function vtkLabel(str) {
  return str
    .split('_')
    .map((v) => `${v.charAt(0).toUpperCase()}${v.slice(1)}`)
    .join(' ');
}

function ListToItem(list) {
  return list.map((value) => ({ text: vtkLabel(value), value }));
}

function vtkColorPresetItems() {
  return ListToItem(vtkColorMaps.rgbPresetNames);
}

export default {
  vtkColorPresetNames,
  vtkLabel,
  ListToItem,
  vtkColorPresetItems,
};
