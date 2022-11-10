

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
 * @param {String} dirName
 * @returns
 */
export function findDirInFileTree(fileTreeEntries, dirName) {
    const bfsQueue = [].concat(fileTreeEntries);
    for (let i = 0; i < bfsQueue.length; i++) {
        const entry = bfsQueue[i];
        if (entry.kind === 'dir') {
            if (entry.path === dirName) {
                return entry;
            } else if (entry.children) {
                for (let j = 0; j < entry.children.length; j++) {
                    if (entry.children[j].kind === 'dir') {
                        bfsQueue.push(entry.children[j]);
                    }
                }
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
        const dirEntry = findDirInFileTree(fileTree, parentPath);
        if (dirEntry) {
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
        } else if (fileTreeEntries[i].kind === 'dir' && fileTreeEntries[i].children) {
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
            if (entry.children[j].kind === 'dir') {
                bfsQueue.push(entry.children[j]);
            }
        }
    }
}
