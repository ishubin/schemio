import axios from 'axios';

function unwrapAxios(response) {
    return response.data;
}

export function createApiClient(path) {
    return {
        _getSchemeUrl(schemeId) {
            let url = '/v1/fs/scheme/';
            if (path) {
                url += path;
            }
            if (url.charAt(url.length - 1) !== '/') {
                url += '/';
            }
            return url + schemeId;
        },

        listEntries(path) {
            let url = '/v1/fs/list';
            if (path) {
                url = url + '/' + path;
            }
            return axios.get(url).then(unwrapAxios);
        },

        moveDir(oldPath, newPath) {
            return axios.post(`/v1/fs/movedir?src=${encodeURIComponent(oldPath)}&dst=${encodeURIComponent(newPath)}`).then(unwrapAxios);
        },

        deleteDir(name) {
            return axios.delete(`/v1/fs/dir?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`).then(unwrapAxios);
        },

        createDirectory(name) {
            return axios.post('/v1/fs/dir', { name, path }).then(unwrapAxios);
        },

        renameDirectory(oldName, newName) {
            return axios.patch(`/v1/fs/dir?path=${encodeURIComponent(path)}&name=${encodeURIComponent(oldName)}`, {name: newName}).then(unwrapAxios);
        },

        getScheme(schemeId) {
            return axios.get(this._getSchemeUrl(schemeId)).then(unwrapAxios);
        },

        renameScheme(schemeId, newName) {
            return axios.patch(this._getSchemeUrl(schemeId), {name: newName}).then(unwrapAxios);
        },

        moveScheme(oldPath, schemeId, newPath) {
            return axios.post(`/v1/fs/movescheme?path=${encodeURIComponent(oldPath)}&id=${encodeURIComponent(schemeId)}&dst=${encodeURIComponent(newPath)}`).then(unwrapAxios);
        },


        /************* Below are the functions that are used by SchemeEditor component *************/

        createArt(art) {
            return axios.post('/v1/fs/art', art).then(unwrapAxios);
        },

        getAllArt() {
            return axios.get('/v1/fs/art').then(unwrapAxios);
        },

        getGlobalArt() {
            return axios.get('/v1/art').then(unwrapAxios);
        },

        saveArt(artId, art) {
            return axios.put(`/v1/fs/art/${artId}`, art).then(unwrapAxios);
        },

        deleteArt(artId) {
            return axios.delete(`/v1/fs/art/${artId}`).then(unwrapAxios);
        },

        createNewScheme(scheme) {
            return axios.post(`/v1/fs/scheme?path=${encodeURIComponent(path)}&id=${encodeURIComponent(scheme.id)}`, scheme).then(unwrapAxios);
        },

        saveScheme(scheme) {
            return axios.put(this._getSchemeUrl(scheme.id), scheme).then(unwrapAxios);
        },

        deleteScheme(schemeId) {
            return axios.delete(this._getSchemeUrl(schemeId)).then(unwrapAxios);
        },

        findSchemes(filters) {
        },

        getTags() {
            return Promise.resolve([]);
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
            let url = '/v1/fs/scheme-preview?id=' + encodeURIComponent(schemeId);
            if (path) {
                url = url + '&path=' + encodeURIComponent(path);
            }
            return axios.post(url, {svg: svgCode}).then(unwrapAxios);
        },

        uploadFile(file) {
            const form = new FormData();
            form.append('file', file, file.name);
            return axios.post(`/v1/media`, form).then(unwrapAxios).then(data => {
                return data.url;
            });
        },

        saveStyle(fill, strokeColor, textColor) {
            return axios.post('/v1/fs/styles', { fill, strokeColor, textColor }).then(unwrapAxios);
        },

        getStyles() {
            return axios.get('/v1/fs/styles').then(unwrapAxios);
        },

        deleteStyle(styleId) {
            return axios.delete(`/v1/fs/styles/${styleId}`).then(unwrapAxios);
        },

        /**
         * Returns static resources (html, css, js) for scheme exporting
         */
        getExportHTMLResources() {
            return Promise.all([
                axios.get('/assets/schemio-standalone.css'),
                axios.get('/assets/schemio-standalone.html'),
                axios.get('/assets/schemio-standalone.js')
            ]).then(values => {
                const css  = values[0].data;
                const html = values[1].data;
                const js   = values[2].data;
                return {
                    css, html, js
                };
            })

        },
    };
}