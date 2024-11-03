class Windy {
  constructor({
    header,
    data,
    canvas,
    maxAge,
    speed,
    particlesCount,
    bgImage,
    frame,
    color,
    lineWidth,
    imageUrl,
    autoAnimate,
    pointCallback
  }) {
    this.header = header;
    this.pointCallback = pointCallback;
    this.speed = speed;
    this.maxAge = maxAge;
    this.clearAge = maxAge * 10;
    this.frame = Math.floor(60 / frame);
    this.particlesCount = particlesCount;
    this.imageUrl = imageUrl;
    this.lineWidth = lineWidth;

    this.color = color;

    if (canvas) {
      this.canvas = canvas;
      const ctx = this.canvas.getContext('2d');
      this.ctx = ctx;
      ctx.lineWidth = this.lineWidth;
      ctx.fillStyle = 'white';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
    }

    this.autoAnimate = autoAnimate;

    this.init(header, data);
  }
  async init(header, data) {
    //生成风场网格
    this.grid = [];
    let index = 0;
    //读取图片存储的风场数据
    if (this.imageUrl) {
      data = await this.loadImageData();

      const minU = Math.abs(header.minU);
      const minV = Math.abs(header.minV);
      //uv风方向范围
      const uSize = header.maxU - header.minU;
      const vSize = header.maxV - header.minV;

      let index = 0;
      for (let j = 0; j < header.ny; j++) {
        const row = [];
        for (let i = 0; i < header.nx; i++) {
          //将颜色数据转化成风向uv数据
          const u = (data[index] / 255) * uSize - minU;
          const v = (data[index + 1] / 255) * vSize - minV;
          row.push([u, v]);
          index = index + 4;
        }
        this.grid.push(row);
      }
    } else {
      for (let j = 0; j < header.ny; j++) {
        const row = [];
        for (let i = 0; i < header.nx; i++) {
          const item = this.data[index++];
          row.push(item);
        }
        this.grid.push(row);
      }
    }
    console.log(this.grid);
    //生成随机点
    this.particles = [];
    for (let i = 0; i < this.particlesCount; i++) {
      const p = this.createRandParticle();
      this.particles.push(p);
      if (this.pointCallback) {
        this.pointCallback(p);
      }
    }

    this.frameCount = 0;
    if (this.autoAnimate) {
      this.animate.bind(this)();
    }
  }
  //加载风场方向数据图片
  loadImageData() {
    return new Promise((resolve) => {
      const image = new Image();
      image.src = this.imageUrl;
      image.onload = () => {
        const c = document.createElement('canvas');
        c.width = image.naturalWidth;
        c.height = image.naturalHeight;
        const ctx = c.getContext('2d');
        //绘制图片
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
        //获取ImageData像素数据
        const imageData = ctx.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
        // console.log(imageData.data);
        resolve(imageData.data);
      };
    });
  }
  animate() {
    this.render();

    window.requestAnimationFrame(this.animate.bind(this));
  }
  movePoints(pointAction) {
    //遍历随机点更新位置
    this.particles.forEach((p) => {
      if (p.age <= 0) {
        //生命周期耗尽重新设置随机点值
        this.setParticleRand(p);
      } else {
        if (!this.inBound(p.x, p.y)) {
          //画出范围外重新设置随机点值
          this.setParticleRand(p);
        } else {
          //根据下一个点的风向，计算出下一个点的位置
          const uv = this.getUV(p.tx, p.ty);
          const nextx = p.tx + this.speed * uv[0];
          const nexty = p.ty + this.speed * uv[1];
          //将起点换成之前的终点
          p.x = p.tx;
          p.y = p.ty;
          //终点设置成计算出的下一个点
          p.tx = nextx;
          p.ty = nexty;
          //生命周期递减
          p.age--;
        }
      }
      pointAction(p);
    });
  }

  render() {
    if (this.frameCount % this.frame === 0) {
      const ctx = this.ctx;
      console.log('draw');
      //缓存之前的合成操作类型
      const pre = ctx.globalCompositeOperation;
      // //仅保留现有画布内容和新形状重叠的部分。其他的都是透明的。
      ctx.globalCompositeOperation = 'destination-in';
      //之前绘制的保留重叠部分
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      //  还原合成操作类型
      ctx.globalCompositeOperation = pre;
      // ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      //设置全局透明度
      ctx.globalAlpha = 0.8;
      if (typeof this.color === 'object') {
        this.movePoints((p) => {
          //起始点和终点转换成显示的画布大小
          const start = this.getCanvasPos(p.x, p.y);
          const end = this.getCanvasPos(p.tx, p.ty);
          //渐变跟随线段的方向
          const gradient = ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
          for (let k in this.color) {
            gradient.addColorStop(+k, this.color[k]);
          }
          //绘制线段
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.moveTo(start[0], start[1]);
          ctx.lineTo(end[0], end[1]);
          ctx.stroke();
        });
      } else {
        //线段绘制开始
        ctx.beginPath();
        //设置纯颜色
        ctx.strokeStyle = this.color;

        this.movePoints((p) => {
          //起始点和终点转换成显示的画布大小
          const start = this.getCanvasPos(p.x, p.y);
          const end = this.getCanvasPos(p.tx, p.ty);
          //通过moveTo和lineTo绘制多个线段
          ctx.moveTo(start[0], start[1]);
          ctx.lineTo(end[0], end[1]);
        });

        //最终统一绘制线段
        ctx.stroke();
      }
    }
    this.frameCount++;
  }
  //将点xy转换为画布显示大小
  getCanvasPos(x, y) {
    return [
      Math.floor(this.canvas.width * (x / this.header.nx)),
      Math.floor(this.canvas.height * (y / this.header.ny))
    ];
  }

  setParticleRand(p) {
    const newp = this.createRandParticle();
    for (let k in p) {
      p[k] = newp[k];
    }
  }

  getGrid(x, y) {
    const h = this.header;
    if (x < 0) {
      x = 0;
    } else if (x > h.nx - 1) {
      x = h.nx - 1;
    }

    if (y < 0) {
      y = 0;
    } else if (y > h.ny - 1) {
      y = h.ny - 1;
    }

    return this.grid[y][x];
  }
  createRandParticle() {
    const x = Math.random() * this.header.nx;
    const y = Math.random() * this.header.ny;

    const uv = this.getUV(x, y);

    return {
      //起点位置
      x,
      y,
      //终点位置=当前位置加上风向偏移
      tx: x + this.speed * uv[0],
      ty: y + this.speed * uv[1],
      //生命周期，将生命周期归零的时候重新设置起点坐标
      age: Math.floor(Math.random() * this.maxAge)
    };
  }

  /**双线性插值
   * g00, g10, g01, g11对应临近可映射的四个点
   * x为当前点与最近点x坐标差
   * y为当前点与最近点y坐标差
   * ***/
  bilinearInterpolation(x, y, g00, g10, g01, g11) {
    let rx = 1 - x;
    let ry = 1 - y;
    let a = rx * ry,
      b = x * ry,
      c = rx * y,
      d = x * y;
    let u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
    let v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
    return [u, v];
  }
  getUV(x, y) {
    let x0 = Math.floor(x),
      y0 = Math.floor(y);
    //正好落在网格里
    if (x0 === x && y0 === y) return this.getGrid(x, y);

    let x1 = x0 + 1;
    let y1 = y0 + 1;

    //临近四周的点
    let g00 = this.getGrid(x0, y0),
      g10 = this.getGrid(x1, y0),
      g01 = this.getGrid(x0, y1),
      g11 = this.getGrid(x1, y1);
    return this.bilinearInterpolation(x - x0, y - y0, g00, g10, g01, g11);
  }
  inBound(x, y) {
    const h = this.header;

    if (x >= 0 && x <= h.nx - 1 && y >= 0 && y <= h.ny - 1) return true;
    return false;
  }
}

window.Windy = Windy;
