import axios from "axios";
import {forEach} from '../../collections';
import { getCachedSchemeInfo, schemeSearchCacher } from "./clientCache";
import { getAllTemplates, getExportHTMLResources, getTemplate, unwrapAxios } from "./clientCommons";

export const fsClientProvider = {
    type: 'fs',
    create() {
        return Promise.resolve({
            _getSchemeUrl(schemeId) {
                return `/v1/fs/docs/${schemeId}?_v=${new Date().getTime()}`;
            },

            listEntries(path) {
                let url = '/v1/fs/list';
                if (path) {
                    url = url + '/' + path;
                }
                return axios.get(url).then(unwrapAxios);
            },

            moveDir(oldPath, parentPath) {
                return axios.post(`/v1/fs/movedir?src=${encodeURIComponent(oldPath)}&parent=${encodeURIComponent(parentPath)}`).then(unwrapAxios);
            },

            deleteDir(path) {
                return axios.delete(`/v1/fs/dir?path=${encodeURIComponent(path)}`).then(unwrapAxios);
            },

            createDirectory(path, name) {
                return axios.post('/v1/fs/dir', { name, path }).then(unwrapAxios);
            },

            renameDirectory(path, newName) {
                return axios.patch(`/v1/fs/dir?path=${encodeURIComponent(path)}`, {name: newName}).then(unwrapAxios);
            },

            getSchemeInfo(schemeId) {
                if (!schemeId) {
                    return Promise.reject('Invalid empty document ID');
                }
                return getCachedSchemeInfo(schemeId, () => {
                    return axios.get(`/v1/fs/docs/${schemeId}/info?_v=${new Date().getTime()}`).then(unwrapAxios);
                });
            },

            getScheme(schemeId) {
                if (!schemeId) {
                    return Promise.reject('Invalid empty document ID');
                }
                return axios.get(this._getSchemeUrl(schemeId)).then(unwrapAxios);
            },

            renameScheme(schemeId, newName) {
                return axios.patch(this._getSchemeUrl(schemeId), {name: newName}).then(unwrapAxios);
            },

            moveScheme(schemeId, newFolder) {
                return axios.post(`/v1/fs/movescheme?id=${encodeURIComponent(schemeId)}&parent=${encodeURIComponent(newFolder)}`).then(unwrapAxios);
            },

            createNewScheme(path, scheme) {
                return axios.post(`/v1/fs/docs?path=${encodeURIComponent(path || '')}`, scheme).then(unwrapAxios);
            },


            /************* Below are the functions that are used by SchemeEditor component *************/

            createArt(art) {
                return axios.post('/v1/fs/art', art).then(unwrapAxios);
            },

            getAllArt() {
                return axios.get('/v1/fs/art').then(unwrapAxios);
            },

            getAllTemplates,
            getTemplate: getTemplate,

            saveArt(artId, art) {
                return axios.put(`/v1/fs/art/${artId}`, art).then(unwrapAxios);
            },

            deleteArt(artId) {
                return axios.delete(`/v1/fs/art/${artId}`).then(unwrapAxios);
            },

            saveScheme(scheme) {
                return axios.put(this._getSchemeUrl(scheme.id), scheme).then(unwrapAxios);
            },

            deleteScheme(schemeId) {
                return axios.delete(this._getSchemeUrl(schemeId)).then(unwrapAxios);
            },

            findSchemes(filters) {
                let url = '/v1/fs/docs';
                let params = {};

                if (filters.query) {
                    params.q = filters.query;
                }
                if (filters.page) {
                    params.page = filters.page;
                }

                let isFirst = true;
                forEach(params, (value, name) => {
                    url += isFirst ? '?' : '&';
                    url += name + '=';
                    url += encodeURIComponent(value);

                    isFirst = false;
                });

                return axios.get(url).then(unwrapAxios).then(schemeSearchCacher);
            },

            getTags() {
                return Promise.resolve([]);
            },

            uploadSchemePreview(schemeId, preview, format) {
                let url = '/v1/fs/doc-preview?id=' + encodeURIComponent(schemeId);
                return axios.post(url, {preview, format}).then(unwrapAxios);
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
            getExportHTMLResources,

            submitStaticExport() {
                return axios.post('/v1/static-export/start').then(unwrapAxios);
            },

            getStaticExportStatus() {
                return axios.get('/v1/static-export/status').then(unwrapAxios);
            },

            get(url) {
                return axios.get(url).then(unwrapAxios);
            }
        });
    }
}