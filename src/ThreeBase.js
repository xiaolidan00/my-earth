import * as THREE from '../node_modules/three/build/three.module.js';
import * as TWEEN from '../node_modules/three/examples/jsm/libs/tween.module.js';

import { GUI } from '../node_modules/three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import Stats from '../node_modules/three/examples/jsm/libs/stats.module.js';

export default class ThreeBase {
  constructor() {
    this.isModelRGB = false;
    this.isStats = false;
    this.isAxis = false;
    this.isRaycaster = false;
    this.initCameraPos = [0, 10, 50];
    this.customInit = false;
    this.isGUI = false;
    this.cameraNear = 0.1;
    this.cameraFar = 2000;
    this.isTWEEN = false;
    this.isControl = true;
  }
  initGui() {
    let gui = new GUI();
    if (this.guiSettings) {
      this.guiSettings.forEach((item) => {
        if (item.type == 'color') {
          gui.addColor(this.dataObj, item.key);
        } else if (item.type == 'select') {
          /**
           * gui.add( obj, 'size', [ 'Small', 'Medium', 'Large' ] )
gui.add( obj, 'speed', { Slow: 0.1, Normal: 1, Fast: 5 } )
           */
          gui.add(this.dataObj, item.key, item.options);
        } else if (item.type == 'number') {
          /**
           * gui.add( obj, 'number1', 0, 1 ); // min, max
gui.add( obj, 'number2', 0, 100, 10 ); // min, max, step
           */
          gui.add(this.dataObj, item.key, item.min, item.max, item.step);
        } else {
          gui.add(this.dataObj, item.key);
        }
      });
    }

    gui.open();
    gui.onChange((event) => {
      // event.object; // object that was modified
      // event.property; // string, name of property
      // event.value; // new value of controller
      // event.controller; // controller that was modified
      this.onGuiAction(event);
    });
    this.gui = gui;
  }
  onGuiAction(event) {}
  initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouseHover();
    this.mouseClick();
  }
  mouseClick() {
    this.mouse = new THREE.Vector2();
    this.container.style.cursor = 'pointer';
    this.container.addEventListener('pointerdown', (event) => {
      console.log('click');
      event.preventDefault();

      this.mouse.x =
        ((event.offsetX - this.container.offsetLeft) / this.container.offsetWidth) * 2 - 1;
      this.mouse.y =
        -((event.offsetY - this.container.offsetTop) / this.container.offsetHeight) * 2 + 1;
      let vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 1).unproject(this.camera);

      this.raycaster.set(this.camera.position, vector.sub(this.camera.position).normalize());
      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.raycasterAction();
    });
  }
  mouseHover() {
    this.mouse1 = new THREE.Vector2();
    this.container.addEventListener('pointermove', (event) => {
      event.preventDefault();

      this.mouse1.x =
        ((event.offsetX - this.container.offsetLeft) / this.container.offsetWidth) * 2 - 1;
      this.mouse1.y =
        -((event.offsetY - this.container.offsetTop) / this.container.offsetHeight) * 2 + 1;
      let vector = new THREE.Vector3(this.mouse1.x, this.mouse1.y, 1).unproject(this.camera);

      this.raycaster.set(this.camera.position, vector.sub(this.camera.position).normalize());
      this.raycaster.setFromCamera(this.mouse1, this.camera);
      this.mouseHoverAction();
    });
  }
  mouseHoverAction() {}
  raycasterAction() {}
  createChart(that) {}
  getCameraControl() {
    console.log(this.camera.position);
    console.log(this.controls.target);
  }

  initThree(el) {
    window.ThreeBase = this;
    this.container = el;
    THREE.Cache.enabled = true;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: this.isDepthBuffer || false
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    if (this.isModelRGB) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    let SCREEN_WIDTH = this.container.offsetWidth;
    let SCREEN_HEIGHT = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera(
      45,
      SCREEN_WIDTH / SCREEN_HEIGHT,
      this.cameraNear,
      this.cameraFar
    );
    this.camera.position.set(...this.initCameraPos);
    this.renderer.setViewport(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    if (this.isAxis) {
      const axesHelper = new THREE.AxesHelper(500);
      this.scene.add(axesHelper);
    }

    if (this.isStats) {
      this.stats = new Stats();
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.top = '0px';
      this.container.appendChild(this.stats.domElement);
    }
    if (this.isGUI) {
      this.initGui();
    }
    if (this.isRaycaster) {
      this.initRaycaster();
    }
    if (this.isTWEEN) {
      this.TWEEN = TWEEN;
    }
    if (this.isControl) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }

    this.animate();
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('unload', this.cleanAll.bind(this));
  }
  animate() {
    if (this.isStats && this.stats) {
      this.stats.update();
    }
    if (this.controls) {
      this.controls.update();
    }
    if (TWEEN.getAll().length) {
      TWEEN.update();
    }

    this.animateAction();
    this.renderer.render(this.scene, this.camera);
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
  setView(cameraPos, controlPos) {
    this.camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
    this.controls.target.set(controlPos.x, controlPos.y, controlPos.z);
  }
  flyView(cameraPos, controlPos) {
    let orgCamera = this.camera.position;
    let orgControl = this.controls.target;
    let tween = new TWEEN.Tween({
      cameraX: orgCamera.x,
      cameraY: orgCamera.y,
      cameraZ: orgCamera.z,
      controlsX: orgControl.x,
      controlsY: orgControl.y,
      controlsZ: orgControl.z
    })
      .to(
        {
          cameraX: cameraPos.x,
          cameraY: cameraPos.y,
          cameraZ: cameraPos.z,
          controlsX: controlPos.x,
          controlsY: controlPos.y,
          controlsZ: controlPos.z
        },
        500
      )
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate((obj) => {
        this.camera.position.set(obj.cameraX, obj.cameraY, obj.cameraZ);
        this.controls.target.set(obj.controlsX, obj.controlsY, obj.controlsZ);
      })
      .start();
    TWEEN.add(tween);
  }
  getView() {
    console.log('camera', this.camera.position);
    console.log('controls', this.controls.target);
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
  setModelCenter(object, viewControl) {
    if (!object) {
      return;
    }
    if (object.updateMatrixWorld) {
      object.updateMatrixWorld();
    }
    // object.geometry.computeBoundingBox && object.geometry.computeBoundingBox();
    // const box = object.geometry.boundingBox;

    // 获得包围盒得min和max
    let box = new THREE.Box3().setFromObject(object);
    console.log(box);
    let objSize;
    try {
      objSize = box.getSize();
    } catch (error) {
      console.log(error);
      objSize = new THREE.Vector3(
        Math.abs(box.max.x - box.min.x),
        Math.abs(box.max.y - box.min.y),
        Math.abs(box.max.z - box.min.z)
      );
    }

    // 返回包围盒的中心点
    const center = box.getCenter(new THREE.Vector3());

    object.position.x += object.position.x - center.x;
    object.position.y += object.position.y - center.y;
    object.position.z += object.position.z - center.z;

    let width = objSize.x;
    let height = objSize.y;
    let depth = objSize.z;

    let centroid = new THREE.Vector3().copy(objSize);
    centroid.multiplyScalar(0.5);

    if (viewControl.autoCamera) {
      this.camera.position.x =
        centroid.x * (viewControl.centerX || 0) + width * (viewControl.width || 0);
      this.camera.position.y =
        centroid.y * (viewControl.centerY || 0) + height * (viewControl.height || 0);
      this.camera.position.z =
        centroid.z * (viewControl.centerZ || 0) + depth * (viewControl.depth || 0);
    } else {
      this.camera.position.set(
        viewControl.cameraPosX || 0,
        viewControl.cameraPosY || 0,
        viewControl.cameraPosZ || 0
      );
    }

    this.camera.lookAt(0, 0, 0);
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
    }
  }
}
