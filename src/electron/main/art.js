import artService from "../../common/fs/artService";
import { ContextHolder } from "./context";

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
        return artService.getAll(fileIndex);
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