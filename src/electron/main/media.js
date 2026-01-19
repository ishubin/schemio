const path = require('path');
const fs = require('fs-extra');
import { nanoid } from "nanoid";
import { getFileExtension, leftZeroPad, mediaFolder } from "../../common/fs/fsUtils";
import { ContextHolder } from "./context";

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function copyFileToProjectMedia(contextHolder) {
    return (event, fileName, arrayBuffer) => {
        const projectPath = contextHolder.from(event).projectPath;

        const extension = getFileExtension(fileName).toLowerCase();
        const date = new Date();

        const pathParts = [ '' + date.getFullYear(), leftZeroPad(date.getMonth()), leftZeroPad(date.getDate())];
        const firstPart = path.join(...pathParts);

        const id = nanoid(6);
        const mediaFileName = `${fileName}-${id}.${extension}`;

        const mediaStoragePath = path.join(projectPath, mediaFolder);
        const folderPath = path.join(mediaStoragePath, firstPart);
        const fullMediaFilePath = path.join(folderPath, mediaFileName);

        return fs.stat(folderPath).then(stat => {
            if (!stat.isDirectory()) {
                return Promise.reject('media storage is not a directory' + folderPath);
            }
        })
        .catch(() => {
            return fs.mkdirs(folderPath);
        })
        .then(() => {
            return fs.writeFile(fullMediaFilePath, Buffer.from(arrayBuffer));
        })
        .then(() => {
            return 'media://local/' + pathParts.join('/') + '/' + mediaFileName;
        });
    };
}

export function uploadDiagramPreview(contextHolder) {
    return (event, docId, preview) => {
        if (!preview.startsWith('data:')) {
            throw new Error('Unsupported diagram preview format: expected data-url');
        }

        const data = decodeDataURL(preview);


        const projectPath = contextHolder.from(event).projectPath;
        const folderPath = path.join(projectPath, mediaFolder, 'previews');
        const previewPath = path.join(folderPath, `${docId}.${data.extension}`);

        return fs.stat(folderPath).then(stat => {
            if (!stat.isDirectory()) {
                return Promise.reject('media storage is not a directory' + folderPath);
            }
        })
        .catch(() => {
            return fs.mkdirs(folderPath);
        })
        .then(() => {
            return fs.writeFile(previewPath, data.buffer);
        })
        .then(() => {
            return {status: 'ok'};
        });
    };
}

function decodeDataURL(content) {
    content = content.substring(5);
    let idx = content.indexOf(';');
    if (idx < 0) {
        throw new Error('Cannot decode data url: cannot extract media type');
    }
    const mimeType = content.substring(0, idx);
    content = content.substring(idx+1);

    if (!content.startsWith('base64,')) {
        throw new Error('Cannot decode data url: expected base64 encoding');
    }
    content = content.substring(7);
    const buffer = Buffer.from(content, "base64");
    return {
        mimeType,
        extension: mimeTypeToFileExtension(mimeType),
        buffer
    };
}


const mimeTypeExtensionMappings = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
};

function mimeTypeToFileExtension(mimeType) {
    mimeType = mimeType.toLowerCase();
    if (mimeTypeExtensionMappings.hasOwnProperty(mimeType)) {
        return mimeTypeExtensionMappings[mimeType];
    }
    throw new Error('Unsupported mime type: ' + mimeType);
}