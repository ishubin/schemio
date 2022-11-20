import { BrowserWindow, dialog } from "electron";
import { startStaticExporter } from "../../common/fs/exporter";

const path = require('path');
const fs = require('fs-extra');

/**
 *
 * @param {ContextData} contextData
 * @param {BrowserWindow} browserWindow
 */
export function startElectronProjectExporter(contextData, browserWindow) {
    const fileIndex = contextData.fileIndex;

    dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
    })
    .then( ({canceled, filePaths}) => {
        if (canceled) {
            return;
        }
        const dstPath = filePaths[0];

        browserWindow.webContents.send('file:exportStatic:started');
        startStaticExporter(fileIndex.rootPath)
        .then(exporterPath => {
            fs.copy(exporterPath, dstPath, {recursive: true})
            .then(() => {
                browserWindow.webContents.send('file:exportStatic:stopped');
            })
            .catch(err =>{
                console.error('Failed to copy exported project');
                browserWindow.webContents.send('file:exportStatic:stopped');
            });
        })
        .catch(err => {
            browserWindow.webContents.send('file:exportStatic:stopped');
        });
    });
    /*
    browserWindow.webContents.send('file:exportStatic:started');
    const fileIndex = contextData.fileIndex;

    startStaticExporter(fileIndex.rootPath)
    .then(exporterPath => {

        dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        })
        .then( ({canceled, filePaths}) => {
            if (canceled) {
                browserWindow.webContents.send('file:exportStatic:stopped');
                return;
            }
            const dstPath = filePaths[0];

            fs.copy(exporterPath, dstPath, {recursive: true})
            .then(() => {
                browserWindow.webContents.send('file:exportStatic:stopped');
            })
            .catch(err =>{
                console.error('Failed to copy exported project');
                browserWindow.webContents.send('file:exportStatic:stopped');
            });
        });
    });*/
}
