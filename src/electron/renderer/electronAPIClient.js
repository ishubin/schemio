export function electronAPICLient() {
    return {
        uploadFile(file) {
            return window.electronAPI.copyFileToProjectMedia(file.path, file.name);
        },

        findSchemes(filters) {
            const query = filters.query || null;
            const page = filters.page || 0;

            return window.electronAPI.findDiagrams(query, page);
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