world-geo-json-zh
===============
[![](https://img.shields.io/github/license/Surbowl/world-geo-json-zh)](https://github.com/Surbowl/world-geo-json-zh/blob/main/LICENSE)
[![](https://img.shields.io/github/package-json/v/Surbowl/world-geo-json-zh)](https://github.com/Surbowl/world-geo-json-zh/releases)

简体中文 Geo JSON 世界地图，带有国家（地区）的 ISO 3166 代码、中文简称与全称。

A simplified Chinese world map in GeoJSON format, including ISO 3166 codes, Chinese short names, and full names of countries (regions).

👉 [See Demo](https://surbowl.github.io/world-geo-json-zh/demo-echarts.html)

Install
--------
[![](https://data.jsdelivr.com/v1/package/npm/@surbowl/world-geo-json-zh/badge)](https://www.jsdelivr.com/package/npm/@surbowl/world-geo-json-zh)
[![](https://img.shields.io/npm/dm/@surbowl/world-geo-json-zh?label=npm)](https://www.npmjs.com/package/@surbowl/world-geo-json-zh)

```
<script type="module">
    import worldGeoJsonZh from 'https://cdn.jsdelivr.net/npm/@surbowl/world-geo-json-zh/+esm'
</script>
```
**or**
```
npm i @surbowl/world-geo-json-zh
```

Data
--------
**Properties**

```javascript
{
   "type": "FeatureCollection",
   "features": [
      {
         "type": "Feature",
         "properties": {
            "name": "中国",
            "full_name": "中华人民共和国",
            "iso_a2": "CN",   // ISO 3166 Alpha-2 code
            "iso_a3": "CHN",  // ISO 3166 Alpha-3 code
            "iso_n3": "156"   // ISO 3166 Numeric code
         },
         "geometry": {
            "type": "MultiPolygon",
            "coordinates": [ ...... ]
         }
      },
      {
         "type": "Feature",
         "properties": {
            "name": "智利",
            "full_name": "智利共和国",
            "iso_a2": "CL",
            "iso_a3": "CHL",
            "iso_n3": "152"
         },
         "geometry": {
            "type": "MultiPolygon",
            "coordinates": [ ...... ]
         }
      },
      
      ......
      
   ]
}
``` 

**Source**

本项目基于 Natural Earth [1:50m Cultural Vectors Admin 0 – Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/) 地图生成，为降低文件体积，使用 [Mapshaper](https://github.com/mbloch/mapshaper) 以 Douglas-Peucker 方法进行简化处理（-simplify dp 10% keep-shapes），Polygon 坐标精确到小数点后 6 位。

此外通过参考下列地图对结果进行调整：
- 参照阿里云 DataV [高德地图](https://datav.aliyun.com/portal/school/atlas/area_selector)
    - 增加：中国南海海域十段线与群岛地图
    - 调整：中国黑瞎子岛界限
    - 调整：中国藏南地区界限
    - 调整：中国西藏阿里地区同印度喜马偕尔邦和北方邦接壤部分界限
- 参照 Natural Earth [1:10m Cultural Vectors Admin 0 – Countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/) 地图
    - 增加：美国本土外小岛屿（iso_a2: UM）地图

**Note**

- 如果您需要区分中国内地、中国香港、中国澳门、中国台湾，请参考 Issue [《有没有内地和港澳台四个单独拿出来绘制的版本呢》](https://github.com/Surbowl/world-geo-json-zh/issues/5)。
  
- 国际标准化组织尚未制定下列国家（地区）的 ISO 3166 代码，无法通过 ISO 3166 代码匹配到下列国家（地区），您可根据业务需要将 -99 替换为自定义值。
  
    |name|iso_a2|iso_a3|iso_n3|
    |------|------|------|----|
    |科索沃|XK|-99|-99|
    |北塞浦路斯|-99|-99|-99|
    |索马里兰|-99|-99|-99|
    |锡亚琴冰川|-99|-99|-99|

**References**

- [1] [Natural Earth](https://www.naturalearthdata.com/). [1:50m Cultural Vectors Admin 0 – Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/). （version 5.1.1）.
- [2] [Natural Earth](https://www.naturalearthdata.com/). [1:10m Cultural Vectors Admin 0 – Countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/). （version 5.1.1）.
- [3] [阿里云 DataV](https://datav.aliyun.com/). [高德地图](https://datav.aliyun.com/portal/school/atlas/area_selector). （2021.5 版本数据）.
- [4] [中华人民共和国自然资源部](https://www.mnr.gov.cn/). [中国地图 1∶740万 对开](http://bzdt.ch.mnr.gov.cn/browse.html?picId=%224o28b0625501ad13015501ad2bfc2187%22).
- [5] [中华人民共和国外交部](https://www.mfa.gov.cn/). [国家（地区）列表](https://www.mfa.gov.cn/web/gjhdq_676201/gj_676203/yz_676205/).
- [6] [国际标准化组织](https://www.iso.org/). [ISO 3166 Country Codes](https://www.iso.org/iso-3166-country-codes.html).
- [7] [联合国](https://www.un.org/). [会员国名单](https://www.un.org/zh/about-us/member-states).
- [8] [联合国](https://www.un.org/). [非自治领土](https://www.un.org/dppa/decolonization/zh/nsgt).
- [9] [联合国](https://www.un.org/). [前托管和非自治领土名单](https://www.un.org/dppa/decolonization/zh/history/former-trust-and-nsgts).

License
------------
[The Unlicense](https://github.com/Surbowl/world-geo-json-zh/blob/main/LICENSE)

Contributing
------------
欢迎大家在 Issues 中提供建议、反馈 Bug ❤
