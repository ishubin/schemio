import { BrowserWindow } from "electron";
import { ProjectService } from "../../common/fs/projectService";
const userAgentPrefix = 'schemio: ';

/**
 * A point on svg path, contains coords + distance on the path that was can be used to calculate this point again
 * @typedef {Object} ContextData
 * @property {ProjectService} projectService
 * @property {String} projectPath
 * @property {BrowserWindow} window
 */

export class ContextHolder {
    constructor() {
        this.contexts = new Map();
    }

    register(id, window) {
        const data = {
            window,
            projectService: null,
            projectPath: null,
        };
        this.contexts.set('' + id, data);
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
     * @returns {ContextData}
     */
    fromWindow(browserWindow) {
        return this.contexts.get('' + browserWindow.webContents.id);
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