const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(``, {
    url: 'http://localhost',
    referrer: 'http://localhost',
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000
});


global.window = dom.window;
global.document = dom.window.document;

global.performance = {
    now() {
        return new Date().getTime() * 1000;
    }
};

const { patchTestData } = require("./test/data/patch/patch-test-data");
const fs = require('fs-extra');
const { getSchemioDocSchema } = require("./src/ui/scheme/SchemioDocSchema");

const exportFolder = '.exported-patcher-schema'
const patcherTestDataPath = `${exportFolder}/schemio-patcher-test-data.json`;
const patcherSchemaPath = `${exportFolder}/schemio-patcher-schema.json`


console.log(JSON.stringify(getSchemioDocSchema()));

// function exportObject(filePath, obj) {
//     return fs.writeFile(filePath, JSON.stringify(obj, null, 2))
//     .then(() => {
//         console.log('Exported', filePath);
//     })
// }

// fs.mkdir(exportFolder, {recursive: true})
// .then(() => {
//     return exportObject(patcherTestDataPath, patchTestData);
// })
// .then(() => {
//     return exportObject(patcherSchemaPath, getSchemioDocSchema());
// })
// .catch(err => {
//     console.error(err);
//     process.exit(2);
// });
