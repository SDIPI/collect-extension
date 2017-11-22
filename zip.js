const AdmZip = require('adm-zip');
const fs = require('fs');

const srcFolder = './src/';
const package = require('./package.json');

var zip = new AdmZip();
var files = [];

fs.readdirSync(srcFolder).forEach(file => {
    files.push(file);
});

for (var i in files) {
    var filePath = "src/" + files[i];
    var fileBuffer = fs.readFileSync(filePath);
    zip.addFile(files[i], fileBuffer, '', 0644 << 16);
}
zip.writeZip("build/wdf-extension-" + package.version + ".zip");