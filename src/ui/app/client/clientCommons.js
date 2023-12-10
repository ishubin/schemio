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
        axios.get(`${assetsPath}/syntax-highlight.css?v=${version}`)
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
    return axios.get('/assets/templates/index.json').then(unwrapAxios);
}

export function getTemplate(path) {
    return templateCache.get(path, () => axios.get(path).then(unwrapAxios));
}