const fs = require('fs');

fs.readdir('./src', (err, files) => {
  const ds = files.filter((a) => a.endsWith('.html'));

  const f = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ThreeJs炫酷效果</title>
  </head>
  <body>
${ds.map((it) => `<a href="src/${it}">${it}</a>`).join('<br />')}
  </body>
</html>
`;
  fs.writeFile('./src/index.html', f, () => {});
});
