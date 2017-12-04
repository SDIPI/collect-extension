const AdmZip = require('adm-zip');
const fs = require('fs');
const opn = require('opn');

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
    console.log(filePath);
    zip.addFile(files[i], fileBuffer, '', 0644 << 16);
}
zip.writeZip("build/wdf-extension-" + package.version + ".zip");
console.log("Zip created. Opening Chrome Web Store Developer");
opn('https://chrome.google.com/webstore/developer/dashboard');