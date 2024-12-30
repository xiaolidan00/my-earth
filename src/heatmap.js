function createColors(option) {
  const canvas = document.createElement('canvas');
  // document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 1;
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  for (let k in option.colors) {
    grad.addColorStop(k, option.colors[k]);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return ctx.getImageData(0, 0, canvas.width, 1).data;
}

//https://www.jianshu.com/p/f795cc2c14f5
//https://github.com/pa7/heatmap.js/blob/master/src/renderer/canvas2d.js
export function drawCircle(ctx, option, item) {
  let { lng, lat, value } = item;
  let x = lng - option.minlng + option.radius;
  let y = lat - option.minlat + option.radius;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, option.radius);
  grad.addColorStop(0.0, 'rgba(0,0,0,1)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, option.radius, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.globalAlpha = (value - option.min) / option.size;
  ctx.fill();
}
export function createHeatmap(option) {
  const canvas = document.createElement('canvas');
  // document.body.appendChild(canvas);
  canvas.width = option.width;
  canvas.height = option.height;
  const ctx = canvas.getContext('2d');

  option.size = option.max - option.min;
  option.data.forEach((item) => {
    drawCircle(ctx, option, item);
  });
  const colorData = createColors(option);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 3; i < imageData.data.length; i = i + 4) {
    let opacity = imageData.data[i];
    let offset = opacity * 4;

    //red
    imageData.data[i - 3] = colorData[offset];
    //green
    imageData.data[i - 2] = colorData[offset + 1];
    //blue
    imageData.data[i - 1] = colorData[offset + 2];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
