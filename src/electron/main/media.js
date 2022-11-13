const path = require('path');
const fs = require('fs-extra');
import { nanoid } from "nanoid";
import { getFileExtension, leftZeroPad, supportedMediaExtensions } from "../../common/fs/fsUtils";
import { ContextHolder } from "./context";

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function copyFileToProjectMedia(contextHolder) {
    return (event, filePath, fileName) => {
        const fileIndex = contextHolder.from(event).fileIndex;

        const extension = getFileExtension(fileName).toLowerCase();
        if (!supportedMediaExtensions.has(extension)) {
            return Promise.reject('Unsupported file type');
        }

        const date = new Date();

        const pathParts = [ '' + date.getFullYear(), leftZeroPad(date.getMonth()), leftZeroPad(date.getDate())];
        const firstPart = path.join(...pathParts);

        const id = nanoid(6);
        const mediaFileName = `${fileName}-${id}.${extension}`;

        const mediaStoragePath = path.join(fileIndex.rootPath, '.media');
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
            return fs.copyFile(filePath, fullMediaFilePath);
        })
        .then(() => {
            return 'media://local/' + pathParts.join('/') + '/' + mediaFileName;
        });
    };
}