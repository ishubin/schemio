const { net } = require('electron');
const nodeUrl = require('node:url');

export function getShapes(event) {
    return readJSONAsset('shapes/shapes.json');
}

const ASSET_PREFIX = '/assets/';
const MEDIA_PREFIX = 'media://assets/';
export function getShapeGroup(event, ref) {
    if (ref.startsWith(ASSET_PREFIX)) {
        ref = ref.substring(ASSET_PREFIX.length);
    } else if (ref.startsWith(MEDIA_PREFIX)) {
        ref = ref.substring(MEDIA_PREFIX.length);
    } else {
        throw new Error('Invalid asset location:', ref);
    }
    return readJSONAsset(ref);
}

export function getGlobalArt(event) {
    return readJSONAsset('art/art.json');
}

function readJSONAsset(assetPath) {
    const fullPath = nodeUrl.pathToFileURL(`./assets/${assetPath}`).toString();
    return net.fetch(fullPath)
    .then(response => response.json())
    .catch(err => {
        console.error('Failed to read asset', assetPath, err);
        throw err;
    });
}