import axios from "axios";
import { InMemoryCache } from "../../LimitedSettingsStorage";

const templateCache = new InMemoryCache(100);

export function unwrapAxios(response) {
    return response.data;
}

export function getExportHTMLResources(assetsPath) {
    if (!assetsPath) {
        assetsPath = '/assets';
    }
    const version = __BUILD_VERSION__;
    return Promise.all([
        axios.get(`${assetsPath}/schemio-standalone.css?v=${version}`),
        axios.get(`${assetsPath}/schemio-standalone.html?v=${version}`),
        axios.get(`${assetsPath}/schemio-standalone.js?v=${version}`),
        axios.get(`${assetsPath}/js/syntax-highlight-worker.js?v=${version}`),
        axios.get(`${assetsPath}/css/syntax-highlight.css?v=${version}`)
    ]).then(values => {
        const css = values[0].data;
        const html = values[1].data;
        const js = values[2].data;
        const syntaxHighlightWorker = values[3].data;
        const syntaxHighlightCSS = values[4].data;
        return {
            css, html, js, syntaxHighlightWorker, syntaxHighlightCSS
        };
    })
}

export function getAllTemplates() {
    const version = __BUILD_VERSION__;
    const routePrefix = document.body.getAttribute('data-route-prefix') || '';
    return axios.get(`${routePrefix}/assets/templates/index.json?_v=${version}`).then(unwrapAxios);
}

export function getTextIconsIndex() {
    const version = __BUILD_VERSION__;
    const routePrefix = document.body.getAttribute('data-route-prefix') || '';
    return axios.get(`${routePrefix}/assets/text-icons-index.json?_v=${version}`).then(unwrapAxios);
}


export function getShapes() {
    const version = __BUILD_VERSION__;
    const routePrefix = document.body.getAttribute('data-route-prefix') || '';
    return axios.get(`${routePrefix}/assets/shapes/shapes.json?_v=${version}`).then(unwrapAxios);
}

export function getGlobalArt() {
    const version = __BUILD_VERSION__;
    const routePrefix = document.body.getAttribute('data-route-prefix') || '';
    return axios.get(`${routePrefix}/assets/art/art.json?_v=${version}`).then(unwrapAxios);
}

export function getTemplate(path) {
    return templateCache.get(path, () => axios.get(path).then(unwrapAxios));
}

export function getShapeGroup(path) {
    return axios.get(path).then(unwrapAxios);
}