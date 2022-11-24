import { ProjectService } from '../../common/fs/projectService';
import { ContextHolder } from './context';
const { dialog } = require('electron');


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
                const projectService = new ProjectService(projectPath, true, '/media/', 'media://local/');
                contextHolder.from(event).projectService = projectService;
                contextHolder.from(event).projectPath = projectPath;
                return projectService.load(projectPath);
            }
        })
    }
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
export function writeProjectFile(contextHolder) {
    return (event, filePath, content) => {
        return writeProjectFileInFolder(contextHolder)(event, null, filePath, content);
    }
}

/**
 *
 * @param {ContextHolder} contextHolder
 * @returns
 */
export function writeProjectFileInFolder(contextHolder) {
    return (event, folderPath, filePath, content) => {
        const projectService = contextHolder.from(event).projectService;
        return projectService.writeFile(folderPath, filePath, content);
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