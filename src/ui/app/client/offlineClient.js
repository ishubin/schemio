import axios from "axios";
import { getAllTemplates, getExportHTMLResources, getGlobalArt, getShapeGroup, getShapes, getTemplate, unwrapAxios } from "./clientCommons";

export const offlineClientProvider = {
    type: 'offline',
    create() {
        return Promise.resolve({
            getExportHTMLResources,

            saveScheme(scheme) {
                window.localStorage.setItem('offlineScheme', JSON.stringify(scheme));
                return Promise.resolve(scheme);
            },

            getShapes,
            getShapeGroup,
            getGlobalArt,

            getAllTemplates,
            getTemplate,

            get(url) {
                return axios.get(url).then(unwrapAxios);
            }
        });
    }
}