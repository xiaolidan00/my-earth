class Transformation {
  _a;
  _b;
  _c;
  _d;
  constructor(a, b, c, d) {
    this._a = a;
    this._b = b;
    this._c = c;
    this._d = d;
  }
  untransform(xy, scale) {
    scale = scale || 1;
    const x = (xy[0] / scale - this._b) / this._a;
    const y = (xy[1] / scale - this._d) / this._c;
    return [x, y];
  }
  transform(xy, scale) {
    scale = scale || 1;
    const x = scale * (this._a * xy[0] + this._b);
    const y = scale * (this._c * xy[1] + this._d);
    return [x, y];
  }
}
const EARTH_R = 6378137;
export const SphericalMercator = {
  //地球半径
  R: EARTH_R,
  //地球周长
  EARTH_LEN: Math.PI * 2 * EARTH_R,
  // 最大纬度
  MAX_LATITUDE: 85.0511287798,
  //范围
  bounds: (function () {
    const d = EARTH_R * Math.PI;
    return [
      [-d, -d],
      [d, d]
    ];
  })(),
  //坐标偏移
  transformation: (function () {
    const scale = 0.5 / (Math.PI * EARTH_R);
    return new Transformation(scale, 0.5, -scale, 0.5);
  })(),
  //投影坐标
  project(lnglat) {
    const d = Math.PI / 180,
      max = this.MAX_LATITUDE,
      lat = Math.max(Math.min(max, lnglat[1]), -max),
      sin = Math.sin(lat * d);
    return [this.R * lnglat[0] * d, (this.R * Math.log((1 + sin) / (1 - sin))) / 2];
  },
  //逆投影坐标
  unproject(xy) {
    const d = 180 / Math.PI;
    const lat = (2 * Math.atan(Math.exp(xy[1] / this.R)) - Math.PI / 2) * d;
    const lng = (xy[0] * d) / this.R;
    return [lng, lat];
  },
  //该缩放等级的像素大小
  scale(zoom) {
    return 256 * Math.pow(2, zoom);
  },
  //该像素大小的缩放等级
  zoom(scale) {
    return Math.log(scale / 256) / Math.LN2;
  },
  //经纬度转像素坐标
  lnglat2px(lnglat, zoom) {
    const p = this.project(lnglat);
    const scale = this.scale(zoom);
    return this.transformation.transform(p, scale);
  },
  //像素坐标转经纬度
  px2lnglat(xy, zoom) {
    const scale = this.scale(zoom);
    const p = this.transformation.untransform(xy, scale);
    return this.unproject(p);
  },
  //米转像素
  meter2px(meter, zoom) {
    const scale = this.scale(zoom);
    const s = scale / this.EARTH_LEN;
    return meter * s;
  }
};
