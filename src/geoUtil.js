import d3geo from './d3-geo.min.js';

let geoFun;
export function initGeoFun(size) {
  //放大倍数
  geoFun = d3geo.geoMercator().scale(size);
}

export const latlng2px = (pos) => {
  if (pos[0] >= -180 && pos[0] <= 180 && pos[1] >= -90 && pos[1] <= 90) {
    return geoFun(pos);
  }
  return pos;
};
