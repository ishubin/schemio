const fs = require('fs');
const _ = require('lodash');

const version = process.env['ASSETS_VERSION'] || `${new Date().getTime()}${Math.round(Math.random()* 1000000)}`;

const files = [
    'src/html/index.html',
    'src/html/embed.html',
];

function fileNameFromPath(filePath) {
    const idx = filePath.lastIndexOf('/');
    if (idx >= 0) {
        return filePath.substring(idx + 1);
    }
    return filePath;
}

_.forEach(files, filePath => {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Could not read html: ${filePath}`, err);
            process.exit(1);
        }
        const compiledData = data.replace(/\{\{VERSION\}\}/g, version);
        

        const fileName = fileNameFromPath(filePath);
        fs.writeFile(`dist/assets/${fileName}`, compiledData, (err) => {
            if (err) {
                console.error(`Could not render html: ${filePath}`, err);
                process.exit(1);
            }
        });
    });
});

