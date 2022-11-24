import artService from "../../common/fs/artService";
import { ContextHolder } from "./context";

const fsMediaPrefix = '/media/';
const electronMediaPrefix = 'media://local/';

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function createArt(contextHolder) {
    return (event, name, url) => {
        const projectPath = contextHolder.from(event).projectPath;
        return artService.create(projectPath, name, url);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function getAllArt(contextHolder) {
    return (event) => {
        const projectPath = contextHolder.from(event).projectPath;
        return artService.getAll(projectPath)
        .then(art => {
            if (Array.isArray(art)) {
                art.forEach(artEntry => {
                    if (artEntry.url && artEntry.url.startsWith(fsMediaPrefix)) {
                        artEntry.url = electronMediaPrefix + artEntry.url.substring(fsMediaPrefix.length);
                    }
                });
            }
            return art;
        });
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function saveArt(contextHolder) {
    return (event, artId, name, url) => {
        const projectPath = contextHolder.from(event).projectPath;
        return artService.save(projectPath, artId, name, url);
    }
}


/**
 *
 * @param {ContextHolder} contextHolder
 */
export function deleteArt(contextHolder) {
    return (event, artId) => {
        const projectPath = contextHolder.from(event).projectPath;
        return artService.delete(projectPath, artId);
    }
}