/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This is an entry point for schemio bundle that is used for FS based Schemio app

import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './app/App.vue';
import FolderView from './app/view/FolderView.vue';
import SearchView from './app/view/SearchView.vue';
import AboutView from './app/view/AboutView.vue';
import store from './store/Store.js';
import SchemeEditorWebView from './app/view/SchemeEditorWebView.vue';
import NotFoundView from './app/view/NotFoundView.vue';
import { applyVueFilters } from './vue.filters';
import Header from './app/components/Header.vue';
import Footer from './app/components/Footer.vue';
import { fsClientProvider } from './app/client/fsClient';
import { offlineClientProvider } from './app/client/offlineClient';
import { testAST } from './templater/ast';
import { Scope } from './templater/scope';
import { generateMapPatch, generateSchemePatch } from './scheme/SchemePatch';
import { processJSONTemplate } from './templater/templater.js';
import { defaultStarterTemplates } from './components/editor/DefaultStarterTemplates.js';
import utils from './utils.js';
import { defaultItem } from './scheme/Item.js';
import { enrichItemWithDefaults } from './scheme/ItemFixer.js';

const sanitizeHtml = require('sanitize-html');

Vue.use(VueRouter);
applyVueFilters(Vue);

Vue.component('schemio-header', Header);
Vue.component('schemio-footer', Footer);

const routePrefix = document.body.getAttribute('data-route-prefix') || '';
store.dispatch('setRoutePrefix', routePrefix);

function route(name, path, component, props) {
    return { name, path, component, props };
}

// used for debugging in browser purposes
window.schemioDebug = {
    generateSchemePatch,
    testAST,
    processJSONTemplate,
    generateMapPatch,
    sanitizeHtml,
    testEvalAST : (expr, data) => testAST(expr).evalNode(new Scope(data))
};


const rootPath = routePrefix ? routePrefix : '/';

const routes = [
    route('SchemeEditorWebView',        `${routePrefix}/docs/:schemeId`,   SchemeEditorWebView, {clientProvider: fsClientProvider, starterTemplates: defaultStarterTemplates}),
    route('OfflineSchemeEditorWebView', `${routePrefix}/offline-editor`,   SchemeEditorWebView, {clientProvider: offlineClientProvider, starterTemplates: defaultStarterTemplates, isOfflineEditor: true, userStylesEnabled: false, projectArtEnabled: false}),
    route('AboutView',                  `${routePrefix}/about`,            AboutView),
    route('NotFoundView',               `${routePrefix}/not-found`,        NotFoundView),
    route('HomeView',                   rootPath,                          FolderView, {clientProvider: fsClientProvider}),
    route('SearchView',                 `${routePrefix}/search`,           SearchView, {clientProvider: fsClientProvider}),
    route('FolderView',                 `${routePrefix}/f/*`,              FolderView, {clientProvider: fsClientProvider}),
    { path: '/', redirect: rootPath},
    { path: '*', redirect: `${routePrefix}/not-found`}
];


const router = new VueRouter({
    mode: 'history',
    routes: routes,
});


new Vue(Vue.util.extend({
    router,
    store,
}, App)).$mount('#app');
