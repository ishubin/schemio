import axios from 'axios';
import map from 'lodash/map';

function unwrapAxios(response) {
    return response.data;
}

function getExportHTMLResources() {
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
}

export function createApiClient(path) {
    return {
        _getSchemeUrl(schemeId) {
            return `/v1/fs/schemes/${schemeId}`;
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

        moveScheme(schemeId, newFolder) {
            return axios.post(`/v1/fs/movescheme?id=${encodeURIComponent(schemeId)}&dst=${encodeURIComponent(newFolder)}`).then(unwrapAxios);
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
            return axios.post(`/v1/fs/schemes?path=${encodeURIComponent(path)}`, scheme).then(unwrapAxios);
        },

        saveScheme(scheme) {
            return axios.put(this._getSchemeUrl(scheme.id), scheme).then(unwrapAxios);
        },

        deleteScheme(schemeId) {
            return axios.delete(this._getSchemeUrl(schemeId)).then(unwrapAxios);
        },

        findSchemes(filters) {
            let url = '/v1/fs/schemes';
            if (filters.query) {
                url += '?q=' + encodeURIComponent(filters.query);
            }

            return axios.get(url).then(unwrapAxios);
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
        getExportHTMLResources
    };
}


export function createStaticClient(path) {

    let cachedIndex = null;

    function traverseEntries(entries, callback) {
        for (let i = 0; i < entries.length; i++) {
            callback(entries[i]);
            if (entries[i].kind === 'dir' && entries[i].entries) {
                traverseEntries(entries[i].entries, callback);
            }
        }
    }

    function prepareIndex(index) {
        const dirLookup = new Map();

        dirLookup.set('', {
            path: '',
            viewOnly: true,
            entries: index.entries || []
        });

        traverseEntries(index.entries, entry => {
            if (entry.kind === 'dir') {
                dirLookup.set(entry.path, {
                    path: entry.path,
                    viewOnly: true,
                    entries: entry.entries || []
                });
               dirLookup.set(entry.path, entry);
            }
        });

        index.dirLookup = dirLookup;
        cachedIndex = index;
        return index;
    }

    return {
        listEntries(path) {
            let chain = null;

            if (cachedIndex) {
                chain = Promise.resolve(cachedIndex);
            } else {
                chain = axios.get('fs.index.json').then(unwrapAxios).then(prepareIndex)
                .catch(err => {
                    console.error('Failed to build index', err);
                    throw err;
                });
            }

            return chain.then(index => {
                if (index.dirLookup.has(path)) {
                    return {
                        path: path,
                        viewOnly: true,
                        entries: index.dirLookup.get(path).entries
                    }
                } else {
                    return Promise.reject({
                        message: 'Not found',
                        path: path
                    });
                }
            });
        },

        getScheme(schemeId) {
            return axios.get(`${path}/${schemeId}.schemio.json`)
            .then(unwrapAxios)
            .then(scheme => {
                return {
                    viewOnly: true,
                    scheme: scheme
                };
            });
        },

        getExportHTMLResources
    };
}