import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';

const fileWatchers = new Map();



export function startWatchingFile(mainWindow, projectPath, filePath) {
    // Skip if already watching this file

    const fullPath = path.join(projectPath, filePath);
    if (fileWatchers.has(fullPath)) {
        return;
    }

    console.log('Starting to watch file', fullPath);
    const watcher = chokidar.watch(fullPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 300 },
    });

    watcher.on('change', (changedPath) => {
        console.log('File channged in the backend', changedPath);
        fs.readFile(changedPath, 'utf-8', (err, content) => {
            if (err) {
                console.error(`Error reading file ${changedPath}:`, err);
                return;
            }
            console.log('Sending the contents of changed file', changedPath);
            mainWindow.webContents.send('file-changed', {
                projectPath: projectPath,
                filePath: filePath,
                content
            });
        });

    });

    fileWatchers.set(fullPath, watcher);
}

export function stopWatchingFile(mainWindow, projectPath, filePath) {
    const fullPath = path.join(projectPath, filePath);
    console.log('Stoping to watch file', fullPath);
    const watcher = fileWatchers.get(fullPath);
    if (watcher) {
        watcher.close();
        fileWatchers.delete(fullPath);
    }
}

export function cleanupAllFileWatchers() {
    fileWatchers.forEach((watcher) => watcher.close());
    fileWatchers.clear();
}