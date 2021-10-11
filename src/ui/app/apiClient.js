import axios from 'axios';

function unwrapAxios(response) {
    return response.data;
}

export function createApiClient(path) {
    return {
        listEntries(path) {
            let url = '/v1/fs/list';
            if (path) {
                url = url + '?path=' + encodeURIComponent(path);
            }
            return axios.get(url).then(unwrapAxios);
        },

        createDirectory(name, path) {
            return axios.post('/v1/fs/dir', { name, path }).then(unwrapAxios);
        },


        createArt(art) {
            return Promise.resolve(null);
        },

        getAllArt() {
            return Promise.resolve(null);
        },

        getGlobalArt() {
            return Promise.resolve(null);
        },

        saveArt(artId, art) {
            return Promise.resolve(null);
        },

        deleteArt(artId) {
        },

        createNewScheme(scheme) {
            let url = '/v1/docs';
            if (path) {
                url += '?path=' + path;
            }
            return axios.post(url, scheme).then(unwrapAxios);
        },

        saveScheme(schemeId, scheme) {
        },

        deleteScheme(schemeId) {
        },

        findSchemes(filters) {
        },

        getTags() {
        },

        createCategory(categoryName, parentCategoryId) {
        },

        deleteCategory(categoryId) {
        },

        updateCategory(categoryId, category) {
        },

        moveCategory(categoryId, newParentCategoryId) {
        },

        getCategoryTree() {
        },

        ensureCategoryStructure(categories) {
        },

        uploadSchemeSvgPreview(schemeId, svgCode) {
        },

        uploadFile(file) {
        },

        saveStyle(fill, strokeColor, textColor) {
        },

        getStyles() {
        },

        deleteStyle(styleId) {
        },

        /**
         * Returns static resources (html, css, js) for scheme exporting
         */
        getExportHTMLResources() {
        },

        getSchemeEmbeddingLink() {
        }
    };
}