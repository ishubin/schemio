import { FileIndex } from "../../common/fs/fileIndex";
import { ProjectService } from "../../common/fs/projectService";
const userAgentPrefix = 'schemio: ';


/**
 * A point on svg path, contains coords + distance on the path that was can be used to calculate this point again
 * @typedef {Object} ContextData
 * @property {FileIndex} fileIndex
 * @property {ProjectService} projectService
 */

export class ContextHolder {
    constructor(initCalback) {
        this.contexts = new Map();
        this.initCalback = initCalback;
    }

    register(id) {
        const data = {};
        this.contexts.set('' + id, data);
        this.initCalback(data);
    }

    remove(id) {
        this.contexts.delete('' + id);
    }

    /**
     *
     * @param {Object} event
     * @returns {ContextData}
     */
    from(event) {
        const id = '' + event.sender.id;
        return this.contexts.get(id);
    }

    /**
     *
     * @param {BrowserWindow} browserWindow
     */
    fromWindow(browserWindow) {
        return this.contexts.get('' + browserWindow.id);
    }

    /**
     *
     * @param {*} request
     * @returns {ContextData}
     */
    fromRequest(request) {
        const id = extractWebContentIdFromUserAgent(request.headers['User-Agent'])
        return this.contexts.get(id);
    }

}


export function extractWebContentIdFromUserAgent(userAget) {
    return userAget.substring(userAgentPrefix.length);
}

export function generateUserAgent(webContentsId) {
    return userAgentPrefix + webContentsId;
}