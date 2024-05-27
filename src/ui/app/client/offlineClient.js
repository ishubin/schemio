import { getAllTemplates, getExportHTMLResources, getTemplate } from "./clientCommons";

export const offlineClientProvider = {
    type: 'offline',
    create() {
        return Promise.resolve({
            getExportHTMLResources,

            saveScheme(scheme) {
                window.localStorage.setItem('offlineScheme', JSON.stringify(scheme));
                return Promise.resolve(scheme);
            },

            getAllTemplates,
            getTemplate,

            get(url) {
                return axios.get(url).then(unwrapAxios);
            }
        });
    }
}