import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as TWEEN from 'three/addons/libs/tween.module.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import Stats from 'three/addons/libs/stats.module.js';
import {
  createAreaCanvas,
  drawRectLayer,
  loadGeojson,
  getGeojsonBound,
  getBoundOrigin
} from './createAreaCanvas.js';
export default class MyThreeAMap {
  constructor() {
    this.isStats = false;
    this.colors = ['#f77b66', '#3edce0', '#f94e76', '#018ef1', '#9e60f9'];
    this.vector = new THREE.Vector2();
    this.center = [113.264499, 23.130061];
    this.zoom = 10;
    this.pitch = 68;
    this.adcode = 440100;
    this.size = Math.pow(2, this.zoom);
    this.height = 5 * this.size;
    this.infoMap = {};
    this.pitch = 68;
    //2024年广州市各区GDP https://www.sohu.com/a/879892073_121119015
    this.data = [
      {
        name: '海珠区',
        value: 3008.35
      },
      {
        name: '从化区',
        value: 441.66
      },
      {
        name: '花都区',
        value: 1860.06
      },
      {
        name: '南沙区',
        value: 2301.29
      },
      {
        name: '天河区',
        value: 6614.69
      },
      {
        name: '荔湾区',
        value: 1316.36
      },
      {
        name: '越秀区',
        value: 3511.89
      },
      {
        name: '番禺区',
        value: 3070.56
      },
      {
        name: '白云区',
        value: 3156.37
      },
      {
        name: '黄埔区',
        value: 4438.9
      },
      {
        name: '增城区',
        value: 1412.37
      }
    ];
    this.valMap = {};
    let max = 0;
    let min = Number.MAX_VALUE;
    this.data.forEach((it) => {
      this.valMap[it.name] = it.value;
      min = Math.min(min, it.value);
      max = Math.max(max, it.value);
    });
    this.maxVal = max;
    this.minVal = min;
    this.valLen = max - min;
    this.isBloom = false;
  }
  init(dom) {
    window.ThreeAMapBase = this;
    this.container = dom;
    THREE.Cache.enabled = true;

    this.map = new AMap.Map(this.container, {
      //缩放范围
      zooms: [9, 12],
      zoom: this.zoom,
      //倾斜角度
      pitch: this.pitch,
      // pitch: 68,
      // rotation: 24,
      //隐藏标签
      showLabel: false,
      showBuildingBlock: false,
      //3D地图模式
      viewMode: '3D',
      //初始化地图中心点
      center: this.center,
      //暗色风格
      mapStyle: 'amap://styles/dark'
      // layers: [new AMap.TileLayer.Satellite()]
    });

    // 数据转换工具
    this.customCoords = this.map.customCoords;
    console.log('🚀 ~ ThreeAMapBase ~ init ~ this.customCoords:', this.customCoords);
    //设置坐标转换中心
    this.customCoords.setCenter(this.center);

    // 创建 GL 图层
    var gllayer = new AMap.GLCustomLayer({
      //zIndex: 10,
      // 初始化的操作，创建图层过程中执行一次。
      init: (gl) => {
        //初始化Three相机
        this.camera = new THREE.PerspectiveCamera(
          60,
          this.container.offsetWidth / this.container.offsetHeight,
          1,
          1 << 30
        );
        //初始化Three渲染器
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0px';
        canvas.style.left = '0px';
        //不妨碍界面上事件行为
        canvas.style.pointerEvents = 'none';
        document.body.appendChild(canvas);
        canvas.width = dom.offsetWidth;
        canvas.height = dom.offsetHeight;
        this.canvas = canvas;
        const webgl = canvas.getContext('webgl');
        this.renderer = new THREE.WebGLRenderer({
          context: webgl // 地图的 gl 上下文
        });
        //分辨率
        this.renderer.setPixelRatio(window.devicePixelRatio);
        //设置渲染画面大小
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(container.offsetWidth, container.offsetHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        //不妨碍界面上事件行为
        labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(labelRenderer.domElement);
        this.labelRenderer = labelRenderer;
        // 自动清空画布这里必须设置为 false，否则地图底图将无法显示

        this.scene = new THREE.Scene();
        if (this.isStats) {
          this.stats = new Stats();
          this.stats.domElement.style.position = 'absolute';
          this.stats.domElement.style.top = '0px';
          this.container.appendChild(this.stats.domElement);
        }

        this.addBloom();
        this.addFrameBuffer();
        this.createChart();
      },

      render: () => {
        //设置坐标转换中心
        this.customCoords.setCenter(this.center);
        var { near, far, fov, up, lookAt, position } = this.customCoords.getCameraParams();

        // 这里的顺序不能颠倒，否则可能会出现绘制卡顿的效果。
        this.camera.near = near;
        this.camera.far = far;
        this.camera.fov = fov;
        this.camera.position.set(...position);
        this.camera.up.set(...up);
        this.camera.lookAt(...lookAt);
        this.camera.updateProjectionMatrix();
      }
    });
    this.map.add(gllayer);

    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('unload', this.cleanAll.bind(this));
  }
  createPlane(canvas, b) {
    //计算行政区范围的中心点
    const center = [(b.minlng + b.maxlng) * 0.5, (b.minlat + b.maxlat) * 0.5];

    //获取行政区范围对应的墨卡托投影坐标xyz
    const startp = this.customCoords.lngLatToCoord([b.minlng, b.minlat]);
    const endp = this.customCoords.lngLatToCoord([b.maxlng, b.maxlat]);
    //计算行政区范围的宽高
    const w = Math.abs(startp[0] - endp[0]);
    const h = Math.abs(startp[1] - endp[1]);
    //创建平面
    const geometry = new THREE.PlaneGeometry(w, h);
    //将行政区卫星贴图作为材质贴图，开启透明
    const tex = new THREE.CanvasTexture(canvas);
    //像素采样取最接近颜色
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    const material = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geometry, material);
    //行政区中心点的墨卡托投影坐标xyz
    const p = this.customCoords.lngLatToCoord(center);
    //将平面坐标设置成行政区中心点墨卡托投影坐标
    plane.position.set(p[0], p[1], 0);
    return { plane, center, p, material };
  }
  async createChart() {
    {
      //设置光照
      const light = new THREE.AmbientLight(0xffffff, 1.0);
      this.scene.add(light);
      //绿色平行光
      const dirLight = new THREE.DirectionalLight('#00ff00', 1);
      const lightH = this.size * 20;
      dirLight.position.set(0, -lightH, lightH);
      this.scene.add(dirLight);
    }

    const geojson = await loadGeojson(this.adcode);
    //行政区范围
    const bound = getGeojsonBound(geojson);
    {
      const center = [(bound.minlng + bound.maxlng) * 0.5, (bound.minlat + bound.maxlat) * 0.5];
      //高德地图中心设为行政区中心位置
      this.map.setCenter(center);
      this.viewCenter = center;
      //获取2D墨卡托像素范围
      const { width: w, height: h } = getBoundOrigin(bound, this.zoom + 1);
      //绘制宽高最大值两倍大小的卫星底图canvas
      const { canvas, bounds } = await drawRectLayer(center, this.zoom + 1, Math.max(w, h) * 2);
      //添加卫星底图平面
      const { plane: ground, material: gMat } = this.createPlane(canvas, bounds);
      this.ground = ground;
      this.scene.add(ground);

      gMat.onBeforeCompile = (shader, render) => {
        this.shader = shader;
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          // 开启uv
          `#define USE_UV\n#include <common>`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          // 开启uv
          `#define USE_UV\n#include <common>\nuniform float uTime;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          // 随着时间从中心扩散变透明
          `#include <dithering_fragment>
             float d=length(vUv-vec2(0.5));
             gl_FragColor.a= mix(1.,0.,sign(clamp(uTime -d,0.,1.)));
               `
        );
      };
    }

    const height = this.height;
    const group = new THREE.Group();
    this.group = group;
    this.scene.add(group);
    group.position.z = -height + 1;

    const material = new THREE.MeshStandardMaterial({
      color: '#FFEFD5'
    });
    //拆分子行政区块，分别绘制
    for (let i = 0; i < geojson.features.length; i++) {
      //分组
      const g = new THREE.Group();
      //形状区块轮廓形状
      const shape = new THREE.Shape();
      const f = geojson.features[i];
      //绘制行政区卫星canvas贴图,顺便绘制3D形状轮廓
      const { canvas, bound: b } = await createAreaCanvas({ features: [f] }, this.zoom + 1, (c) => {
        const pos = this.customCoords.lngLatToCoord(c[0]);
        shape.moveTo(...pos);
        for (let i = 1; i < c.length; i++) {
          const p = this.customCoords.lngLatToCoord(c[i]);
          shape.lineTo(...p);
        }
        shape.lineTo(...pos);
      });
      const mesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, {
          bevelEnabled: false,
          depth: height
        }),
        material
      );
      //区块名称用于后续点击事件识别
      mesh.name = f.properties.name;
      g.add(mesh);

      //上方的行政区块卫星贴图平面
      const { plane, center, p } = this.createPlane(canvas, b);
      plane.name = f.properties.name;
      plane.position.z = this.height + 1;
      g.add(plane);
      g.name = f.properties.name;
      group.add(g);
      //收集相关位置信息，用于后续点击事件
      this.infoMap[f.properties.name] = {
        //下钻后的地图观察点
        viewPos: [center[0], b.minlat + this.getOffsetLat(this.height * 20)],
        center,
        p,
        //柱体颜色
        color: this.colors[i % this.colors.length]
      };
    }
    this.animate();
    await this.sleep(1000);
    await this.addAnimate({ h: group.position.z }, { h: 0 }, 1000, (obj) => {
      group.position.z = obj.h;
    });
    this.isBloom = true;
    await this.addAnimate({ t: 0 }, { t: 1 }, 1000, (obj) => {
      //修改shader的时间值
      if (this.shader) this.shader.uniforms.uTime.value = obj.t;
    });
    //全透明后删除卫星底图
    this.cleanObj(this.ground);
    this.ground = null;
    this.play();
    //点击下钻
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    window.addEventListener('pointerdown', this.onClickItem.bind(this));
  }
  getOffsetLat(height) {
    return (0.00001 * (0.5 * height)) / Math.abs(Math.tan((Math.abs(this.pitch) * Math.PI) / 180));
  }
  async play() {
    //让每个3D区块移动到浮动起始位置
    for (let i = 0; i < this.group.children.length; i++) {
      const g = this.group.children[i];
      const s = i % 2 === 1 ? Math.sin(i * 0.1 * Math.PI) : Math.cos(i * 0.1 * Math.PI);
      this.addAnimate({ t: 0 }, { t: s * this.height }, 1500, (obj) => {
        g.position.z = obj.t;
      });
    }

    await this.sleep(1500);
    //重复上下运动
    const tw = new TWEEN.Tween({ t: 0 })
      .to({ t: 2 }, 2000)
      .repeat(Infinity)
      .onUpdate((obj) => {
        if (!this.activeItem) {
          this.group.children.forEach((item, i) => {
            const s =
              i % 2 === 1
                ? Math.sin((obj.t + i * 0.1) * Math.PI)
                : Math.cos((obj.t + i * 0.1) * Math.PI);
            item.position.z = s * this.height;
          });
        } else {
          //选中区块后停止浮动
          TWEEN.remove(tw);
        }
      })
      .start();
  }

  sleep(time) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
  addAnimate(start, end, time, update) {
    return new Promise((resolve) => {
      const tween = new TWEEN.Tween(start)
        .to(end, time)
        .onUpdate(update)
        .easing(TWEEN.Easing.Quartic.InOut)
        .onComplete(() => {
          resolve(tween);
        })
        .start();
    });
  }
  //设置视角
  setView(c) {
    this.map.setCenter([c.lng, c.lat]);
    this.map.setZoom(c.zoom);
    this.map.setPitch(c.pitch);
    this.map.setRotation(c.rotate);
  }
  //获取当前视角
  getView() {
    const c = this.map.getCenter();
    const v = {
      lng: c.lng,
      lat: c.lat,
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      rotate: this.map.getRotation()
    };
    return v;
  }

  async onClickItem(event) {
    this.mouse.x = (event.offsetX / this.container.offsetWidth) * 2 - 1;
    this.mouse.y = -(event.offsetY / this.container.offsetHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    //如果没有选中3D区块则下钻
    if (!this.activeItem) {
      //检测是否点击到物体
      const intersects = this.raycaster.intersectObjects(this.group.children, true);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (!obj.name) return;
        this.activeItem = obj.name;
        //隐藏除了选中外的3D区块
        this.group.children.forEach((item) => {
          if (item.name == obj.name) {
            item.visible = true;
            item.position.z = 0;
          } else {
            item.visible = false;
          }
        });
        //获取行政区块观察点位置
        const { viewPos: c, p, color } = this.infoMap[obj.name];
        //切换到视角
        await this.addAnimate(
          this.getView(),
          {
            lng: c[0],
            lat: c[1],
            zoom: 11,
            pitch: this.pitch,
            rotate: -25
          },
          1000,
          (v) => {
            this.setView(v);
          }
        );
        //在行政区块上绘制柱体
        const box = new THREE.BoxGeometry(this.height, this.height, this.size);
        const boxMat = new THREE.MeshStandardMaterial({
          // color: '#FFE4B5',
          color
        });
        const cube = new THREE.Mesh(box, boxMat);
        //柱体位置在行政区块中心点上
        cube.position.set(p[0], p[1], this.height + 2 + this.size * 0.5);
        this.scene.add(cube);
        this.cube = cube;
        //显示数据标签
        const value = this.valMap[obj.name];
        const dom = document.createElement('div');
        dom.className = 'text-box';
        const label = new CSS2DObject(dom);
        label.position.set(p[0], p[1], this.height + 2 + this.size);
        this.scene.add(label);
        this.label = label;
        //标签与柱体递增
        this.addAnimate(
          { t: 1, value: 0 },
          {
            t: 2 + 20 * ((value - this.minVal) / this.valLen),
            value: value
          },
          1000,
          (v) => {
            //柱体高度增加
            cube.scale.set(1, 1, v.t);
            //柱体位置跟着增长
            cube.position.z = this.height + 2 + v.t * this.size * 0.5;
            //数据标签跟着增长
            label.position.z = this.height + 2 + v.t * this.size;
            //数据标签内容跟着增长
            dom.innerHTML = `<div> ${v.value.toFixed(2)}亿元<br/>${obj.name} </div>`;
          }
        );
      }
    } else {
      //如果有选中3D区块则删除柱体和标签,返回
      this.scene.remove(this.cube);
      this.scene.remove(this.label);
      //视角恢复成原视图
      const c = this.viewCenter;
      this.addAnimate(
        this.getView(true),
        {
          lng: c[0],
          lat: c[1],
          zoom: this.zoom,
          pitch: this.pitch,
          rotate: 0
        },
        1000,
        (obj) => {
          this.setView(obj);
        }
      );
      //3D 区块全部出现
      this.activeItem = '';
      this.group.children.forEach((item) => {
        item.visible = true;
      });
      //上下浮动
      this.play();
    }
  }
  addBloom() {
    //发光效果相关参数
    const params = {
      threshold: 0,
      strength: 0.6,
      radius: 1
    };
    this.params = params;
    const renderScene = new RenderPass(this.scene, this.camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.offsetWidth, this.container.offsetHeight),
      params.strength,
      params.radius,
      params.threshold
    );
    this.bloomPass = bloomPass;
    const bloomComposer = new EffectComposer(this.renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
    this.bloomComposer = bloomComposer;
    this.bloomComposer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }
  addFrameBuffer() {
    const dpr = window.devicePixelRatio;
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    const sceneOrtho = new THREE.Scene();
    this.sceneOrtho = sceneOrtho;
    //创建正交投影
    const cameraOrtho = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      1,
      10
    );
    cameraOrtho.position.z = 10;
    cameraOrtho.left = -width / 2;
    cameraOrtho.right = width / 2;
    cameraOrtho.top = height / 2;
    cameraOrtho.bottom = -height / 2;
    this.cameraOrtho = cameraOrtho;
    //将发光效果渲染结果作为材质贴图和透明度贴图，让黑色背景透明化
    const mat = new THREE.MeshBasicMaterial({
      map: this.bloomComposer.renderTarget2.texture,
      alphaMap: this.bloomComposer.renderTarget2.texture,
      transparent: true
    });
    this.mat = mat;
    //添加平面
    const g = new THREE.PlaneGeometry(width * dpr, height * dpr);
    const mesh = new THREE.Mesh(g, mat);
    sceneOrtho.add(mesh);
  }

  animate() {
    if (this.isStats && this.stats) {
      this.stats.update();
    }

    if (TWEEN.getAll().length) {
      TWEEN.update();
    }
    //更新地图渲染和相机参数
    this.map.render();
    //更新HTML
    this.labelRenderer.render(this.scene, this.camera);

    //关闭自动清空
    this.renderer.autoClear = false;
    //手动清空
    this.renderer.clear();
    if (this.isBloom) {
      //开启发光
      for (const k in this.params) {
        this.bloomPass[k] = this.params[k];
      }
    } else {
      //关闭发光
      for (const k in this.params) {
        this.bloomPass[k] = 0;
      }
    }
    //卫星地图平面隐藏，不发光
    if (this.ground) this.ground.visible = false;
    //柱体隐藏，不发光
    if (this.cube) this.cube.visible = false;
    //渲染发光效果
    if (this.bloomComposer) this.bloomComposer.render();
    //清空深度
    this.renderer.clearDepth();
    //卫星地图平面显示
    if (this.ground) this.ground.visible = true;
    //柱体显示
    if (this.cube) this.cube.visible = true;
    //渲染场景全部物体
    this.renderer.render(this.scene, this.camera);
    //渲染到正交投影场景中
    this.renderer.render(this.sceneOrtho, this.cameraOrtho);
    this.threeAnim = requestAnimationFrame(this.animate.bind(this));
  }
  cleanNext(obj, idx) {
    if (idx < obj.children.length) {
      this.cleanElmt(obj.children[idx]);
    }
    if (idx + 1 < obj.children.length) {
      this.cleanNext(obj, idx + 1);
    }
  }

  cleanElmt(obj) {
    if (obj) {
      if (obj.children && obj.children.length > 0) {
        this.cleanNext(obj, 0);
        obj.remove(...obj.children);
      }
      if (obj.geometry) {
        obj.geometry.dispose && obj.geometry.dispose();
      }
      if (obj instanceof THREE.Material) {
        for (const v of Object.values(obj)) {
          if (v instanceof THREE.Texture) {
            v.dispose && v.dispose();
          }
        }

        obj.dispose && obj.dispose();
      }
      if (Array.isArray(obj)) {
        obj.material.forEach((m) => {
          this.cleanElmt(m);
        });
      }

      obj.dispose && obj.dispose();
      obj.clear && obj.clear();
    }
  }

  cleanObj(obj) {
    this.cleanElmt(obj);
    obj?.parent?.remove && obj.parent.remove(obj);
  }
  cleanAll() {
    cancelAnimationFrame(this.threeAnim);

    if (this.stats) {
      this.container.removeChild(this.stats.domElement);
      this.stats = null;
    }

    this.cleanObj(this.scene);
    this.controls && this.controls.dispose();

    this.renderer.renderLists && this.renderer.renderLists.dispose();
    this.renderer.dispose && this.renderer.dispose();
    this.renderer.forceContextLoss();
    let gl = this.renderer.domElement.getContext('webgl');
    gl && gl.getExtension('WEBGL_lose_context').loseContext();
    this.renderer.setAnimationLoop(null);
    this.renderer.domElement = null;
    this.renderer.content = null;
    console.log('清空资源', this.renderer.info);
    this.renderer = null;
    THREE.Cache.clear();
    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('unload', this.cleanAll.bind(this));
  }

  onResize() {
    if (this.container) {
      const w = this.container.offsetWidth;
      const h = this.container.offsetHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer?.setSize(w, h);
      this.labelRenderer?.setSize(w, h);
      this.bloomComposer?.setSize(w, h);
      if (this.canvas) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }
  }
}
