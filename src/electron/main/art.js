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
        const fileIndex = contextHolder.from(event).fileIndex;
        return artService.create(fileIndex, name, url);
    };
}

/**
 *
 * @param {ContextHolder} contextHolder
 */
export function getAllArt(contextHolder) {
    return (event) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return artService.getAll(fileIndex)
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
        const fileIndex = contextHolder.from(event).fileIndex;
        return artService.save(fileIndex, artId, name, url);
    }
}


/**
 *
 * @param {ContextHolder} contextHolder
 */
export function deleteArt(contextHolder) {
    return (event, artId) => {
        const fileIndex = contextHolder.from(event).fileIndex;
        return artService.delete(fileIndex, artId);
    }
}