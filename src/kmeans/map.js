const PI2 = 2 * Math.PI;
class MyThreeAMap {
  constructor() {
    this.isStats = true;
    this.minSize = 20;
    this.maxSize = 50;
    this.size = this.maxSize - this.minSize;
    this.minOpacity = 0.3;
    this.maxOpacity = 1;
    this.opacity = this.maxOpacity - this.minOpacity;
    this.center = [103, 32];
    this.imgWidth = 32;
    this.imgHeight = 32;
    this.halfWidth = this.imgHeight * 0.5;
    this.halfHeight = this.imgHeight * 0.5;

    const img = new Image();
    img.src = 'restaurant.png';
    this.img = img;
  }
  setView(c) {
    this.map.setCenter(c.pos);
    this.map.setZoom(c.zoom);
    this.map.setPitch(c.pitch, true, 1000);
    this.map.setRotation(c.rotate, true, 1000);
  }
  getView() {
    console.log({
      center: this.map.getCenter(),
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      rotate: this.map.getRotation()
    });
  }
  init(dom) {
    this.container = dom;

    this.map = new AMap.Map(this.container, {
      //缩放范围
      zooms: [2, 20],
      zoom: 4.35,
      //倾斜角度
      pitch: 0,

      //隐藏标签
      // showLabel: false,

      //初始化地图中心点
      center: this.center,
      //暗色风格
      mapStyle: 'amap://styles/dark'
    });
    this.createChart();
  }
  onRender() {
    const canvas = this.canvas;
    const map = this.map;
    //调整画布大小
    const retina = AMap.Browser.retina;
    const size = map.getSize();
    const width = size.width;
    const height = size.height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    if (retina) {
      //高清适配
      width *= 2;
      height *= 2;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    const zoom = map.getZoom();
    let color = 'green';
    let result = this.result1;
    //不同缩放等级对应的设置聚类点颜色和不同簇数量的结果
    if (zoom < 8) {
      color = 'green';
      result = this.result1;
    } else if (zoom >= 8 && zoom <= 15) {
      color = '#00BBFF';
      result = this.result2;
    }
    if (zoom <= 15) {
      //关闭信息提示框
      this.infoWindow.close();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      //当地图缩放等级小于等于15时绘制聚类点
      for (let i = 0; i < result.countList.length; i += 1) {
        const item = result.countList[i];
        const center = result.centroids[item.idx];
        const pos = map.lngLatToContainer(center);
        //簇包含的数量
        const v = item.num;

        let r = result.lerpSize(v);
        //根据分辨率放缩
        if (retina) {
          pos = pos.multiplyBy(2);
          r *= 2;
        }
        //只绘制可视范围内的聚类点

        if (pos.x >= -r && pos.y >= -r && pos.x <= width + r && pos.y <= height + r) {
          //根据簇包含的数量绘制不同透明度和大小的圆
          ctx.globalAlpha = result.lerpOpacity(v);
          ctx.shadowBlur = r;

          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(pos.x, pos.y, r, 0, PI2);
          ctx.fill();

          //绘制簇包含点数量的文本
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'white';
          const fontSize = r * 0.7;
          ctx.font = fontSize + 'px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(v + '', pos.x, pos.y);
        }
      }
    } else {
      //当地图缩放等级大于15时绘制原始数据点所在的图标

      //收集可视范围内的点，用于map事件代理点击动作，选择对应的点
      const showPoints = {};
      this.showPoints = showPoints;
      for (let i = 0; i < this.data.length; i++) {
        const center = this.data[i];
        const pos = map.lngLatToContainer(center);
        //只绘制可视范围内的聚类点
        if (
          pos.x >= -this.halfWidth &&
          pos.y >= -this.halfHeight &&
          pos.x <= width + this.halfWidth &&
          pos.y <= height + this.halfHeight
        ) {
          //利用toFixed向下取整，创建一个不同经纬度作为关键词的对象集合，方便分区域获取点
          const id = `${center[0].toFixed(2)}-${center[1].toFixed(2)}`;
          if (showPoints[id]) {
            showPoints[id].push({ center, idx: i });
          } else {
            showPoints[id] = [{ center, idx: i }];
          }
          ctx.drawImage(
            this.img,
            //需偏移图标大小一半的位置
            pos.x - this.halfWidth,
            pos.y - this.halfHeight,
            this.imgWidth,
            this.imgHeight
          );
        }
      }
    }
  }
  calcKmeans(k) {
    const result = skmeans(this.data, k, 'kmpp');
    const count = {};
    //统计每个簇的点数
    result.idxs.forEach((clusterId) => {
      count[clusterId] = (count[clusterId] || 0) + 1;
    });

    let min = Number.MAX_SAFE_INTEGER;
    let max = Number.MIN_SAFE_INTEGER;
    const countList = [];
    for (let k in count) {
      const vv = count[k];
      min = Math.min(min, vv);
      max = Math.max(max, vv);
      countList.push({ idx: k, num: vv });
    }
    //排序簇包含的点数
    countList.sort((a, b) => a.num - b.num);
    const len = max - min;
    return {
      centroids: result.centroids,
      count,
      countList,
      min,
      max,
      len,
      //获取大小值
      lerpSize: (val) => {
        return this.minSize + ((val - min) / len) * this.size;
      },
      //获取透明度
      lerpOpacity: (val) => {
        return this.minOpacity + ((val - min) / len) * this.opacity;
      }
    };
  }

  async createChart() {
    const originData = await fetch('cuisine.json')
      .then((res) => res.json())
      .then((res) => res.features);
    this.originData = originData;
    //转换数据格式成数组
    this.data = originData.map((item) => {
      item.geometry.coordinates[0] = Number(item.geometry.coordinates[0]);
      item.geometry.coordinates[1] = Number(item.geometry.coordinates[1]);
      return item.geometry.coordinates;
    });
    //提前计算好聚类结果，并缓存，减少重复计算
    if (localStorage.getItem('kmeans50')) {
      this.result1 = JSON.parse(localStorage.getItem('kmeans50'));
      this.result1.lerpSize = (val) => {
        return this.minSize + ((val - this.result1.min) / this.result1.len) * this.size;
      };
      this.result1.lerpOpacity = (val) => {
        return this.minOpacity + ((val - this.result1.min) / this.result1.len) * this.opacity;
      };
    } else {
      this.result1 = this.calcKmeans(50);
      localStorage.setItem('kmeans50', JSON.stringify(this.result1));
    }
    if (localStorage.getItem('kmeans250')) {
      this.result2 = JSON.parse(localStorage.getItem('kmeans250'));
      this.result2.lerpSize = (val) => {
        return this.minSize + ((val - this.result2.min) / this.result2.len) * this.size;
      };
      this.result2.lerpOpacity = (val) => {
        return this.minOpacity + ((val - this.result2.min) / this.result2.len) * this.opacity;
      };
    } else {
      this.result2 = this.calcKmeans(250);
      localStorage.setItem('kmeans250', JSON.stringify(this.result2));
    }

    const canvas = document.createElement('canvas');
    this.canvas = canvas;
    const customLayer = new AMap.CustomLayer(canvas, {
      zooms: [3, 20],
      zIndex: 120
    });
    customLayer.render = this.onRender.bind(this);
    customLayer.setMap(this.map);

    const infoWindow = new AMap.InfoWindow({
      content: `info`, //传入字符串拼接的 DOM 元素
      anchor: 'bottom-center',
      isCustom: true,
      offset: new AMap.Pixel(0, 5)
    });
    this.infoWindow = infoWindow;
    //map顶层事件代理
    this.map.on('click', (ev) => {
      const zoom = this.map.getZoom();
      //根据图标大小调整
      const MIN = 0.000005 * zoom;

      if (zoom > 15) {
        const { lat, lng } = ev.lnglat;
        console.log(lat, lng);
        const fLat = Number(lat.toFixed(2)),
          fLng = Number(lng.toFixed(2));
        const points = [];
        //点击坐标附近的点
        for (let i = -0.01; i <= 0.01; i += 0.01) {
          for (let j = -0.01; j <= 0.01; j += 0.01) {
            const id = `${fLng + i}-${fLat + j}`;
            if (this.showPoints[id]) {
              points.push(...this.showPoints[id]);
            }
          }
        }
        let selectItem;
        let distance = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          //查找最接近的点
          if (Math.abs(p.center[0] - lng) <= MIN && Math.abs(p.center[1] - lat) <= MIN) {
            const d = Math.sqrt((p.center[0] - lng) ^ (2 + (p.center[1] - lat)) ^ 2);
            if (d <= distance) {
              selectItem = p;
              distance = d;
            }
          }
        }
        if (selectItem) {
          infoWindow.setContent(`<div class="info-box">
          <div>第${selectItem.idx + 1}个数据</div>
          <div>经度：${selectItem.center[0]}</div>
           <div>纬度：${selectItem.center[1]}</div>
          </div>
          <div  class="info-box-triangle"><span></span></div>`);
          infoWindow.open(this.map, selectItem.center);
        }
      }
    });
  }
  animateAction() {}
}
const myThreeMap = new MyThreeAMap();
myThreeMap.init(document.getElementById('mapContainer'));
window.ThreeMap = myThreeMap;
