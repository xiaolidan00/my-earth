const fs = require('fs');

const cfg = {
  'src/world.html': '地球贴图',
  'src/earth.html': '地球柱体',
  'src/earth1.html': 'InstancedMesh 地球柱体优化',
  'src/earth2.html': 'BufferGeometryUtils.mergeGeometries 地球柱体合并优化',
  'src/earth3.html': '动画地球柱体',
  'src/mergeGeometry.html': '合并形状监测单个形状动作',
  'src/UnrealBloom.html': '部分泛光',
  'src/mapBoundary.html': '3D 区块泛光轮廓',
  'src/mapBoundary1.html': '3D 区块渐变围栏',
  'src/mapBoundary2.html': '3D 区块多重渐变围栏',
  'src/building.html': '生成随机建筑，俯视 UV',
  'src/radar.html': '雷达扩散特效',
  'src/radar1.html': '雷达扫描特效',
  'src/heatmap.html': '2D 热力图',
  'src/heatmap3d.html': '3D 热力山丘图',
  'src/FrameBuffer.html': '帧缓存贴图',
  'src/RainSnow.html': '雨雪雾',
  'src/EarthScan.html': '地球渐变扫光',
  'src/EarthScan1.html': '地球斑点扫光',
  'src/lineBase.html': '无限光束',
  'src/line.html': '顺着公路无限光束',
  'src/lineHeart.html': '心形流动光束',
  'src/mapTravel.html': '高德地图+Three.js实现炫酷飞线+标牌',
  'src/wind/windCanvas.html': 'canvas 2D风场图',
  'src/wind/windPic.html': '风场uv风向数据图片',
  'src/wind/wind.html': 'canvas贴图3D风场图',
  'src/wind/wind1.html': '平面3D风场图',
  'src/wind/wind2.html': '地球3D风场图',
  'src/ContourLine.html': '纯色3D等高线图',
  'src/ContourLine1.html': '彩色3D等高线图',
  'src/ContourLine2.html': '3D等高线图+热力图',
  'src/ContourLine3.html': '3D断层阶梯热力图',
  'src/kmeans/map.html': '高德地图聚类分析',
  'src/areaBar/areaCanvas.html': '行政区卫星贴图',
  'src/areaBar/areaCanvasTest.html': '行政区卫星贴图在高德3D地图',
  'src/areaBar/areaBar.html': '动态卫星贴图行政区块和递增柱体'
};

const list = [];
const readme = [];
for (const k in cfg) {
  list.push(`<li><a href="${k}" target="_blank">${cfg[k]}</a></li>`);
  readme.push(`## ${cfg[k]}`);
  readme.push('');
  readme.push(`- [源码地址:${k}](${k})`);
  readme.push(`- [预览效果](https://xiaolidan00.github.io/my-earth/${k})`);
  readme.push('');
}
const f = `<!DOCTYPE html>
<html":"lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ThreeJs炫酷效果</title>
    <style>
    body{
    padding:0px;
    margin:0px;
    position:absolute;
    height:100%;
    width:100%;
    }
    .content{
    width:800px;
    margin:10px auto;
    }
    a{
      font-size: 16px;
      line-height: 2;
    }
    </style>
  </head>
  <body>
  <div class="content">
  <h1>ThreeJs炫酷效果</h1>
  <ul>
${list.join('')}
</ul>
</div>  
</body>
</html>
`;
fs.writeFile('./index.html', f, () => {});

fs.writeFile(
  './README.md',
  '# 用three.js实现各种炫酷效果\n\n## 掘金博客：敲敲敲敲暴你脑袋\n\n- [详细实现过程讲解请看博客](https://juejin.cn/user/224781403162798/posts)\n\n' +
    readme.join('\n'),
  () => {}
);
