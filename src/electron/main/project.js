import { ProjectService } from '../../common/fs/projectService';
import { ContextHolder } from './context';
import { storeOpenProject } from './storage';
const { dialog, BrowserWindow, ipcMain } = require('electron');
import fs from 'fs-extra';


/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function openProject(contextHolder) {
    return (event) => {
        return dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        })
        .then( ({canceled, filePaths}) => {
            if (canceled) {
                return;
            } else {
                const projectPath = filePaths[0];
                return selectProject(contextHolder)(event, projectPath);
            }
        })
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function selectProject(contextHolder) {
    return (event, projectPath) => {
        return _selectProject(contextHolder, contextHolder.from(event), projectPath);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function selectProjectInFocusedWindow(contextHolder) {
    return (event, projectPath) => {
        const window = BrowserWindow.getFocusedWindow();
        const contextData = contextHolder.fromWindow(window);
        if (!contextData) {
            return;
        }
        return _selectProject(contextHolder, contextData, projectPath)
        .then(project => {
            console.log('Sending project to webcontents', project);
            if (project) {
                window.webContents.send('project-selected', project);
            }
        });
    };
}

function _selectProject(contextHolder, contextData, projectPath) {
    //searching for already open project
    let existingContextData = null;
    contextHolder.contexts.forEach(contextData => {
        if (contextData.projectPath === projectPath) {
            existingContextData = contextData;
        }
    });

    //if found a window with same open project - just focus it
    if (existingContextData) {
        existingContextData.window.focus();
        return Promise.resolve(null);
    }

    storeOpenProject(projectPath);
    const projectService = new ProjectService(projectPath, true, {
        '/media/': 'media://local/',
        '/assets/': 'media://assets/'
    }, {
        'media://local/': '/media/',
        'media://assets/': '/assets/'
    });
    contextData.projectService = projectService;
    contextData.projectPath = projectPath;
    return projectService.load(projectPath);
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function readProjectFile(contextHolder) {
    return (event, filePath) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.readFile(filePath);
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function writeProjectDiagram(contextHolder) {
    return (event, filePath, diagram) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.writeDiagram(filePath, diagram);
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createNewDiagram(contextHolder) {
    return (event, folderPath, diagram) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.createNewDiagram(folderPath, diagram);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function renameFolder(contextHolder) {
    return (event, filePath, newName) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.renameFolder(filePath, newName);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function renameDiagram(contextHolder) {
    return (event, filePath, newName) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.renameDiagram(filePath, newName);
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createNewFolder(contextHolder) {
    return (event, parentPath, name) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.createFolder(parentPath, name);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function moveFile(contextHolder) {
    return (event, filePath, newParentPath) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.moveFile(filePath, newParentPath);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function projectFileTree(contextHolder) {
    return (event) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.getFileTree();
    };
}


/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function findDiagrams(contextHolder) {
    return (event, query, page) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.findDiagrams(query, page);
    }
}


/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function getDiagram(contextHolder) {
    return (event, docId) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.getDiagram(docId);
    }
}


export function importDiagram() {
    dialog.showOpenDialog({
        properties: ['openFile']
    })
    .then( ({canceled, filePaths}) => {
        if (!canceled) {
            const filePath = filePaths[0];

            fs.readFile(filePath, 'utf-8').then(content => {
                const focusedWindow = BrowserWindow.getFocusedWindow();
                if (!focusedWindow) {
                    return;
                }
                focusedWindow.webContents.send('file:importDiagramFromText', content);
            });
            //TODO error handle
        }
    })

}