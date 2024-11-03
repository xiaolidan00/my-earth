const fs = require('fs');
const output = require('./output.json');
let uData = [];
let vData = [];
let header = {};
for (let i = 0; i < output.length; i++) {
  if (output[i].header.parameterNumber === 2) {
    //u的数据集
    uData = output[i].data;
    header = output[i].header;
  } else if (output[i].header.parameterNumber === 3) {
    //v的数据集
    vData = output[i].data;
  }
}

const len = uData.length;
const list = [];
const info = {
  minU: Number.MAX_SAFE_INTEGER,
  maxU: Number.MIN_SAFE_INTEGER,
  minV: Number.MAX_SAFE_INTEGER,
  maxV: Number.MIN_SAFE_INTEGER,
  ...header
};
for (let i = 0; i < len; i++) {
  //uv数据组合
  list.push([uData[i], vData[i]]);
  //计算最大最小边界值
  info.minU = Math.min(uData[i], info.minU);
  info.maxU = Math.max(uData[i], info.maxU);
  info.minV = Math.min(vData[i], info.minV);
  info.maxV = Math.max(vData[i], info.maxV);
}

fs.writeFileSync('./wind.json', JSON.stringify(list));
fs.writeFileSync('./info.json', JSON.stringify(info));
