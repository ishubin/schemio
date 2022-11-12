import { getExportHTMLResources } from "./clientCommons";

export const offlineClientProvider = {
    type: 'offline',
    create() {
        return Promise.resolve({
            getExportHTMLResources
        });

    }
}