import { getCachedSchemeInfo, schemeSearchCacher } from "../../ui/app/client/clientCache";

export function electronAPICLient() {
    return {
        uploadFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    window.electronAPI.copyFileToProjectMedia(file.name, reader.result).then(response => {
                        resolve(response);
                    })
                    .catch(err => {
                        reject(err);
                    });
                };
                reader.onerror = (err) => {
                    reject(err);
                };
                // reader.readAsDataURL(file);
                reader.readAsArrayBuffer(file);
            });

        },

        findSchemes(filters) {
            const query = filters.query || null;
            const page = filters.page || 0;

            return window.electronAPI.findDiagrams(query, page).then(schemeSearchCacher);
        },

        getSchemeInfo(docId) {
            return getCachedSchemeInfo(docId, () => {
                return window.electronAPI.getDiagramInfo(docId);
            });
        },

        getScheme(docId) {
            return window.electronAPI.getDiagram(docId);
        },

        createArt({name, url}) {
            return window.electronAPI.createArt(name, url);
        },

        getAllArt() {
            return window.electronAPI.getAllArt();
        },

        saveArt(artId, {name, url}) {
            return window.electronAPI.saveArt(artId, name, url);
        },

        deleteArt(artId) {
            return window.electronAPI.deleteArt(artId);
        },

        saveStyle(fill, strokeColor, textColor) {
            return window.electronAPI.createStyle(fill, strokeColor, textColor);
        },

        getStyles() {
            return window.electronAPI.getStyles();
        },

        deleteStyle(styleId) {
            return window.electronAPI.deleteStyle(styleId);
        },
    };
}