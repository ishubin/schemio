export function electronAPICLient() {
    return {
        uploadFile(file) {
            return window.electronAPI.copyFileToProjectMedia(file.path, file.name);
        },

        findSchemes(filters) {
            let url = '/v1/fs/docs';
            const query = filters.query || null;
            const page = filters.page || 0;

            return window.electronAPI.findDiagrams(query, page);
        },

        getScheme(docId) {
            return window.electronAPI.getDiagram(docId);
        }
    };
}