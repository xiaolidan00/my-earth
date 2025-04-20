import * as THREE from 'three';

import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import Stats from 'three/addons/libs/stats.module.js';

export default class ThreeAMapBase {
  constructor() {
    this.isStats = false;
    this.zoom = 4.5;
    this.pitch = 0;
    this.center = [101.8, 39];

    this.mapConfig = {};
  }

  createChart() {}
  setView(c) {
    this.map.setCenter(c.pos);
    this.map.setZoom(c.zoom);
    this.map.setPitch(c.pitch, true, 1000);
    this.map.setRotation(c.rotate, true, 1000);
    // this.camera.position.x = c.camera.x;
    // this.camera.position.y = c.camera.y;
    // this.camera.position.z = c.camera.z;
  }
  getView() {
    console.log({
      center: this.map.getCenter(),
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      rotate: this.map.getRotation()
      // camera: this.camera.position
    });
  }

  init(dom) {
    window.ThreeAMapBase = this;
    this.container = dom;
    THREE.Cache.enabled = true;

    this.map = new AMap.Map(this.container, {
      //缩放范围
      zooms: [2, 20],
      zoom: this.zoom,
      //倾斜角度
      pitch: this.pitch,
      // rotation: 24,
      //隐藏标签
      showLabel: false,
      //3D地图模式
      viewMode: '3D',
      //初始化地图中心点
      center: this.center,
      //暗色风格
      mapStyle: 'amap://styles/dark',
      ...this.mapConfig
    });

    // 数据转换工具
    this.customCoords = this.map.customCoords;
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
        this.renderer = new THREE.WebGLRenderer({
          context: gl // 地图的 gl 上下文
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // 自动清空画布这里必须设置为 false，否则地图底图将无法显示
        this.renderer.autoClear = false;
        this.scene = new THREE.Scene();

        if (this.isStats) {
          this.stats = new Stats();
          this.stats.domElement.style.position = 'absolute';
          this.stats.domElement.style.top = '0px';
          this.container.appendChild(this.stats.domElement);
        }

        let labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(container.offsetWidth, container.offsetHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        //不妨碍界面上点击冲突
        labelRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(labelRenderer.domElement);

        this.labelRenderer = labelRenderer;
        this.createChart();
      },

      render: () => {
        // 这里必须执行！！重新设置 three 的 gl 上下文状态。
        this.renderer.resetState();
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
        //渲染器渲染场景
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
        // 这里必须执行！！重新设置 three 的 gl 上下文状态。
        this.renderer.resetState();
      }
    });
    this.map.add(gllayer);

    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('unload', this.cleanAll.bind(this));
  }
  addLabel(dom, pos) {
    //label的dom可以触发事件
    dom.style.pointerEvents = 'auto';
    const label = new CSS2DObject(dom);
    label.position.set(...pos);
    this.scene.add(label);
    return label;
  }
  animate() {
    if (this.isStats && this.stats) {
      this.stats.update();
    }

    this.animateAction();
    this.map.render();
    this.threeAnim = requestAnimationFrame(this.animate.bind(this));
  }
  //执行动画动作
  animateAction() {}
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
      this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
      this.labelRenderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    }
  }
}
