const nodeUrl = require('node:url');
const { app } = require('electron');
const path    = require('path');
const fs      = require('fs');

export function getShapes(event) {
    return readJSONAsset('shapes/shapes.json');
}

const ASSET_PREFIX = '/assets/';
const MEDIA_PREFIX = 'media://assets/';
export function getShapeGroup(event, ref) {
    return readJSONAsset(ref);
}

export function getGlobalArt() {
    return readJSONAsset('art/art.json');
}

export function getAllTemplates() {
    return readJSONAsset('templates/index.json');
}

export function getTemplate(event, ref) {
    return readJSONAsset(ref);
}

function readJSONAsset(assetPath) {
    if (assetPath.startsWith(ASSET_PREFIX)) {
        assetPath = assetPath.substring(ASSET_PREFIX.length);
    } else if (assetPath.startsWith(MEDIA_PREFIX)) {
        assetPath = assetPath.substring(MEDIA_PREFIX.length);
    }

    const assetsDir = path.join(app.getAppPath(), 'assets');
    const fullPath = path.join(assetsDir, assetPath);

    try {
        const data = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Failed to read asset', assetPath, err);
        throw err;
    }
}