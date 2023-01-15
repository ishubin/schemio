import { getExportHTMLResources } from "./clientCommons";

export const offlineClientProvider = {
    type: 'offline',
    create() {
        return Promise.resolve({
            getExportHTMLResources,

            saveScheme(scheme) {
                window.localStorage.setItem('offlineScheme', JSON.stringify(scheme));
                return Promise.resolve(scheme);
            }
        });
    }
}