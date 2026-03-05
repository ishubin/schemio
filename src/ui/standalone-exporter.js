import JSZip from 'jszip';
import utils from './utils';
import Shape from './components/editor/items/shapes/Shape';
import { forEachObject } from './collections';
import shortid from 'shortid';
import { traverseItems } from './scheme/Item';


function createMediaMapper() {
    const images = new Map();
    return {

        /**
         * @param {string} imagePath
         * @param {string}
         */
        add(imagePath) {
            if (images.has(imagePath)) {
                return images.get(imagePath);
            }

            const parts = imagePath.split('/');
            let imageName = parts[parts.length - 1];
            if (images.has(imageName)) {
                imageName = `${shortid.generate()}-${imageName}`;
            }
            images.set(imagePath, imageName);
            return imageName;
        },

        /**
         *
         * @param {JSZip} zip
         * @returns {Promise}
         */
        export(zip) {
            const allUrls = Array.from(images.keys());
            return Promise.all(allUrls.map(url => {
                return convertRemoteFilesToArrayBuffer(url)
                .then(buff => {
                    const fileName = images.get(url);
                    zip.file(fileName, buff)
                })
                .catch(err => {
                    console.error('Failed to download file: ' + url, err);
                    return null;
                });
            }));
        }
    }
}

/**
 *
 * @param {string} fileUrl
 * @returns {Promise<ArrayBuffer>}
 */
function convertRemoteFilesToArrayBuffer(fileUrl) {
    // adding unique get parameter because Chrome may cache the image when it was loaded without passing the origin
    // so in its cache there might be an image without the CORS allow header.
    const argName = fileUrl.indexOf('?') < 0 ? '?_schuid=' : '&_schuid=';
    const retryUrl = fileUrl + argName + new Date().getTime() + '' + Math.round(Math.random()*10000);

    return urlToArrayBuffer(fileUrl)
    .catch(err => {
        return urlToArrayBuffer(retryUrl);
    })
    .catch(err => {
        if (retryUrl.charAt(0) !== '/') {
            return urlToArrayBuffer('https://corsproxy.io/?' + encodeURIComponent(fileUrl));
        }
        throw err;
    });
}

/**
 *
 * @param {string} url
 * @returns {Promise<ArrayBuffer>}
 */
function urlToArrayBuffer(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('get', url);
        xhr.responseType = 'blob';
        xhr.onload = function() {
            const fr = new FileReader();
            fr.onload = function() {
                resolve(this.result);
            };
            fr.onerror = function(err) {
                reject(err);
            };
            fr.readAsArrayBuffer(xhr.response);
        };
        xhr.onerror = function(err) {
            reject(err);
        };
        xhr.send();
    })
}

export function exportSchemeAsStandaloneArchive(scheme, apiClient, assetsPath) {
    const zip = new JSZip();

    const modifiedScheme = utils.clone(scheme);


    const mediaMapper = createMediaMapper();

    traverseItems(modifiedScheme.items, item => {
        if (item.shape === 'image') {
            item.shapeProps.image = './assets/' + mediaMapper.add(item.shapeProps.image);
        }

        const shape = Shape.find(item.shape);
        if (shape) {
            const args = Shape.getShapeArgs(shape);
            forEachObject(args, (argDef, argName) => {
                const argValue = item.shapeProps[argName];
                if (argDef.type === 'advanced-color' && argValue && argValue.type === 'image') {
                    item.shapeProps[argName].image = './assets/' + mediaMapper.add(item.shapeProps[argName].image);
                }
            });
        }
    });

    zip.file('scheme.json', JSON.stringify(modifiedScheme));

    const assetsFolder = zip.folder('assets');

    return Promise.all([
        apiClient.getExportHTMLResources(assetsPath),
        mediaMapper.export(assetsFolder)
    ])
    .then(([resources]) => {
        zip.file('schemio-standalone.css', resources.css);
        zip.file('index.html', resources.html);
        zip.file('schemio-standalone.js', resources.js);
        zip.file('syntax-highlight-worker.js', resources.syntaxHighlightWorker);
        zip.file('syntax-highlight.css', resources.syntaxHighlightCSS);

        return zip.generateAsync({
            type: 'base64',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 9
            }
        });
    });
}
