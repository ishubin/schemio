export const schemioExtension = '.schemio.json';
export const supportedMediaExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'tiff',
    'bmp'
]);

export function fileNameFromPath(filePath) {
    const idx = filePath.lastIndexOf('/');
    if (idx >= 0) {
        return filePath.substring(idx + 1);
    }
    return filePath;
}

export function rightFilePad(filePath) {
    if (filePath.charAt(filePath.length - 1) !== '/') {
        return filePath + '/';
    }
    return filePath;
}