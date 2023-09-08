import * as THREE from '../node_modules/three/build/three.module.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import Stats from '../node_modules/three/examples/jsm/libs/stats.module.js';
import * as TWEEN from '../node_modules/three/examples/jsm/libs/tween.module.js';

export default class ThreeBase {
  constructor() {
    this.isModelRGB = false;
    this.isStats = false;
    this.isAxis = false;
    this.isRaycaster = false;
    this.initCameraPos = [0, 100, 0];
  }
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
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    if (this.isModelRGB) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    this.renderer.shadowMap.enable = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      40,
      this.container.offsetWidth / this.container.offsetHeight,
      1,
      100000
    );
    this.camera.position.set(...this.initCameraPos);

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
    if (this.isRaycaster) {
      this.initRaycaster();
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    let thiz = this;
    function animate() {
      if (thiz.isStats && thiz.stats) {
        thiz.stats.update();
      }
      if (thiz.controls) {
        thiz.controls.update();
      }

      thiz.animateAction();
      thiz.renderer.render(thiz.scene, thiz.camera);
      thiz.threeAnim = requestAnimationFrame(animate);
    }
    animate();
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
    let orgCamera = this.camera.position;
    let orgControl = this.controls.target;
    let tween = new TWEEN({
      cameraX: orgCamera.x,
      cameraY: orgCamera.y,
      cameraZ: orgCamera.z,
      controlsX: orgControl.x,
      controlsY: orgControl.y,
      controlsZ: orgControl.z
    })
      .to({
        cameraX: cameraPos.x,
        cameraY: cameraPos.y,
        cameraZ: cameraPos.z,
        controlsX: controlPos.x,
        controlsY: controlPos.y,
        controlsZ: controlPos.z
      })
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
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            this.cleanElmt(m);
          });
        } else {
          for (const v of Object.values(obj.material)) {
            if (v instanceof THREE.Texture) {
              v.dispose && v.dispose();
            }
          }

          obj.material.dispose && obj.material.dispose();
        }
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

    // 获得包围盒得min和max
    const box = new THREE.Box3().setFromObject(object);

    let objSize = box.getSize();
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
  }

  setModelCenter(object, viewControl) {
    if (!object) {
      return;
    }
    if (object.updateMatrixWorld) {
      object.updateMatrixWorld();
    }

    // 获得包围盒得min和max
    const box = new THREE.Box3().setFromObject(object);

    let objSize = box.getSize();
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

  onResize() {
    if (this.container) {
      this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    }
  }
}
