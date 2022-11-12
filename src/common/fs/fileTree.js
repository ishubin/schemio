

/**
 * @typedef {Object} FileTreeEntry
 * @property {String} path
 * @property {String} name
 * @property {String} kind
 * @property {Array<FileTreeEntry>} children
 *
 */

/**
 *
 * @param {Array<FileTreeEntry>} fileTreeEntries
 * @param {String} entryPath
 * @returns {FileTreeEntry}
 */
export function findEntryInFileTree(fileTreeEntries, entryPath) {
    const bfsQueue = [].concat(fileTreeEntries);
    for (let i = 0; i < bfsQueue.length; i++) {
        const entry = bfsQueue[i];
        if (entry.path === entryPath) {
            return entry;
        }
        if (entry.kind === 'dir' && entry.children) {
            for (let j = 0; j < entry.children.length; j++) {
                const childEntry = entry.children[j];
                if (childEntry.path === entryPath) {
                    return childEntry;
                }
                if (childEntry.kind === 'dir' && entryPath.startsWith(childEntry.path)) {
                    bfsQueue.push(childEntry);
                }
            }
        }
    }
    return null;
}

/**
 *
 * @param {Array<FileTreeEntry>} fileTreeEntries
 * @param {String} path
 * @returns {FileTreeEntry}
 */
export function findParentEntryInFileTree(fileTreeEntries, path) {
    const bfsQueue = [];
    for (let i = 0; i < fileTreeEntries.length; i++) {
        if (fileTreeEntries[i].path === path) {
            return null;
        } else if (fileTreeEntries[i].kind === 'dir' && fileTreeEntries[i].children && path.startsWith(fileTreeEntries[i].path)) {
            bfsQueue.push(fileTreeEntries[i]);
        }
    }

    for (let i = 0; i < bfsQueue.length; i++) {
        const entry = bfsQueue[i];
        for (let j = 0; j < entry.children.length; j++) {
            if (entry.children[j].path === path) {
                return entry;
            }
            if (entry.children[j].kind === 'dir' && path.startsWith(entry.children[j].path)) {
                bfsQueue.push(entry.children[j]);
            }
        }
    }

    return null;
}

/**
 *
 * @param {Array<FileTreeEntry>} fileTree
 * @param {String} parent
 * @param {String} entry
 */
export function addEntryToFileTree(fileTree, parentPath, entry) {
    if (!parentPath) {
        fileTree.push(entry);
    } else {
        const dirEntry = findEntryInFileTree(fileTree, parentPath);
        if (dirEntry && dirEntry.kind === 'dir') {
            if (!dirEntry.children) {
                dirEntry.children = [];
            }
            dirEntry.children.push(entry);
        }
    }
}

/**
 *
 * @param {Array<FileTreeEntry} fileTreeEntries
 * @param {String} path
 * @returns
 */
export function deleteEntryFromFileTree(fileTreeEntries, path) {
    const bfsQueue = [];
    for (let i = 0; i < fileTreeEntries.length; i++) {
        if (fileTreeEntries[i].path === path) {
            fileTreeEntries.splice(i, 1);
            return;
        } else if (fileTreeEntries[i].kind === 'dir' && fileTreeEntries[i].children && path.startsWith(fileTreeEntries[i].path)) {
            bfsQueue.push(fileTreeEntries[i]);
        }
    }

    for (let i = 0; i < bfsQueue.length; i++) {
        const entry = bfsQueue[i];
        for (let j = 0; j < entry.children.length; j++) {
            if (entry.children[j].path === path) {
                entry.children.splice(j, 1);
                return;
            }
            if (entry.children[j].kind === 'dir' && path.startsWith(entry.children[j].path)) {
                bfsQueue.push(entry.children[j]);
            }
        }
    }
}

export function renameEntryInFileTree(fileTreeEntries, entryPath, newName) {
    const entry = findEntryInFileTree(fileTreeEntries, entryPath);

    const renamedPath = entry.path.substring(0, entry.path.length - entry.name.length) + newName;
    entry.path = renamedPath;
    entry.name = newName;

    if (entry.kind === 'dir' && entry.children) {
        traverseFileTree(entry.children, subEntry => {
            subEntry.path = renamedPath + subEntry.path.substring(entryPath.length);
        });
    }
}

/**
 *
 * @param {Array<FileTreeEntry>} fileTreeEntries
 * @param {Function} callback
 */
export function traverseFileTree(fileTreeEntries, callback) {
    fileTreeEntries.forEach(entry => {
        callback(entry);
        if (entry.kind === 'dir' && entry.children) {
            traverseFileTree(entry.children, callback);
        }
    });
}
