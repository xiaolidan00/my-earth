import { SphericalMercator } from './SphericalMercator.js';
const tileSize = 256;
export function travelGeo(geojson, cb) {
  geojson.features.forEach((a) => {
    if (a.geometry.type === 'MultiPolygon') {
      a.geometry.coordinates.forEach((b) => {
        b.forEach((c) => {
          cb(c);
        });
      });
    } else {
      a.geometry.coordinates.forEach((c) => {
        cb(c);
      });
    }
  });
}
const cacheTiles = {};
const domain = [1, 2, 3, 4];
let sIndex = 0;
function getTileImage(x, y, z) {
  return new Promise((resolve) => {
    const id = `${x}-${y}-${z}`;
    //缓存瓦片底图
    if (cacheTiles[id]) {
      resolve(cacheTiles[id]);
    } else {
      //加载卫星瓦片底图
      const s = domain[sIndex % domain.length];
      const url = `http://wprd0${s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=6&x=${x}&y=${y}&z=${z}`;
      // const url = `http://wprd0${s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x=${x}&y=${y}&z=${z}`;
      sIndex++;
      const image = new Image();
      image.src = url;
      image.crossOrigin = '*';
      image.onload = () => {
        cacheTiles[id] = image;
        resolve(image);
      };
    }
  });
}
//绘制瓦片到canvas上
async function drawTileImage(ctx, x, y, z, imageX, imageY) {
  const image = await getTileImage(x, y, z);
  ctx.drawImage(image, imageX, imageY);
}
//绘制瓦片底图
export async function drawTileLayer(z, start, end, ctx) {
  // 计算瓦片索引范围
  const bounds = [
    [Math.floor(start[0] / tileSize), Math.floor(start[1] / tileSize)],
    [Math.ceil(end[0] / tileSize), Math.ceil(end[1] / tileSize)]
  ];
  const queue = [];
  //瓦片偏移
  const offset = [bounds[0][0] * tileSize - start[0], bounds[0][1] * tileSize - start[1]];
  //收集需要绘制的瓦片索引和瓦片在canvas上的位置
  for (let x = bounds[0][0], i = 0; x < bounds[1][0]; x++, i++) {
    for (let y = bounds[0][1], j = 0; y < bounds[1][1]; y++, j++) {
      queue.push({
        x,
        y,
        imageX: i * tileSize + offset[0],
        imageY: j * tileSize + offset[1]
      });
    }
  }
  //异步加载图片绘制到canvas上
  for (let i = 0; i < queue.length; i = i + 24) {
    const list = queue.slice(i, i + 24);
    await Promise.all(list.map((a) => drawTileImage(ctx, a.x, a.y, z, a.imageX, a.imageY)));
  }
}
export async function drawRectLayer(center, z, size) {
  const canvas = document.createElement('canvas');

  const ctx = canvas.getContext('2d');
  canvas.width = Math.ceil(size);
  canvas.height = Math.ceil(size);
  const pos = SphericalMercator.lnglat2px(center, z);
  const s = size * 0.5;
  const start = [pos[0] - s, pos[1] - s];
  const end = [pos[0] + s, pos[1] + s];

  await drawTileLayer(z, start, end, ctx);
  const startPos = SphericalMercator.px2lnglat(start, z);
  const endPos = SphericalMercator.px2lnglat(end, z);
  return {
    canvas,
    bounds: {
      minlng: startPos[0],
      minlat: startPos[1],
      maxlng: endPos[0],
      maxlat: endPos[1]
    }
  };
}
const cacheGeojson = {};
export async function loadGeojson(adcode) {
  let geojson;
  if (cacheGeojson[adcode]) {
    geojson = cacheGeojson[adcode];
  } else {
    geojson = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`).then(
      (res) => res.json()
    );
    cacheGeojson[adcode] = geojson;
  }
  return geojson;
}
export function getGeojsonBound(geojson) {
  const bound = {
    minlng: Number.MAX_SAFE_INTEGER,
    minlat: Number.MAX_SAFE_INTEGER,
    maxlng: 0,
    maxlat: 0
  };
  travelGeo(geojson, (c) => {
    c.forEach((item) => {
      bound.minlng = Math.min(bound.minlng, item[0]);
      bound.minlat = Math.min(bound.minlat, item[1]);
      bound.maxlng = Math.max(bound.maxlng, item[0]);
      bound.maxlat = Math.max(bound.maxlat, item[1]);
    });
  });
  return bound;
}
export function getBoundOrigin(bound, z) {
  const start = SphericalMercator.lnglat2px([bound.minlng, bound.minlat], z);

  const end = SphericalMercator.lnglat2px([bound.maxlng, bound.maxlat], z);

  const origin = [Math.min(start[0], end[0]), Math.min(start[1], end[1])];

  const origin1 = [Math.max(start[0], end[0]), Math.max(start[1], end[1])];
  return {
    start: origin,
    end: origin1,
    width: Math.abs(origin1[0] - origin[0]),
    height: Math.abs(origin1[1] - origin[1])
  };
}

export async function createAreaCanvas(geojson, z, cb) {
  const canvas = document.createElement('canvas');

  const ctx = canvas.getContext('2d');
  //经纬度范围
  const bound = getGeojsonBound(geojson);
  //墨卡托投影像素坐标，canvas宽高大小
  const { start, end, width, height } = getBoundOrigin(bound, z);
  canvas.width = width;
  canvas.height = height;
  //绘制瓦片底图
  await drawTileLayer(z, start, end, ctx);
  //将经纬度坐标转为墨卡托投影像素坐标，减去行政区范围的起始坐标，即显示在canvas上的坐标
  const lnglat2Canvas = (p) => {
    const a = SphericalMercator.lnglat2px(p, z);
    return [a[0] - start[0], a[1] - start[1]];
  };
  //遍历行政区，绘制轮廓
  ctx.beginPath();
  travelGeo(geojson, (c) => {
    const s = lnglat2Canvas(c[0]);
    ctx.moveTo(s[0], s[1]);
    for (let i = 1; i < c.length; i++) {
      const item = lnglat2Canvas(c[i]);
      ctx.lineTo(item[0], item[1]);
    }
    ctx.lineTo(s[0], s[1]);
    if (cb) cb(c);
  });
  //截取中间行政区块的底图
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = 'white';
  ctx.fill();
  //绘制轮廓线条
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'orange';
  ctx.stroke();

  return { canvas: canvas, geojson, bound };
}
