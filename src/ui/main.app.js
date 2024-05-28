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
import { generateSchemePatch } from './scheme/SchemePatch';
import { processJSONTemplate } from './templater/templater.js';
import { defaultStarterTemplates } from './components/editor/DefaultStarterTemplates.js';

Vue.use(VueRouter);
applyVueFilters(Vue);

Vue.component('schemio-header', Header);
Vue.component('schemio-footer', Footer);

function route(name, path, component, props) {
    return { name, path, component, props };
}

// used for debugging in browser purposes
window.schemioDebug = {
    generateSchemePatch,
    testAST,
    processJSONTemplate,
    testEvalAST : (expr, data) => testAST(expr).evalNode(new Scope(data))
};


const routes = [
    route('SchemeEditorWebView',       '/docs/:schemeId',   SchemeEditorWebView, {clientProvider: fsClientProvider, starterTemplates: defaultStarterTemplates}),
    route('OfflineSchemeEditorWebView','/offline-editor',   SchemeEditorWebView, {clientProvider: offlineClientProvider, starterTemplates: defaultStarterTemplates, isOfflineEditor: true, userStylesEnabled: false, projectArtEnabled: false}),
    route('AboutView',              '/about',            AboutView),
    route('NotFoundView',           '/not-found',        NotFoundView),
    route('HomeView',               '/',                 FolderView, {clientProvider: fsClientProvider}),
    route('SearchView',             '/search',           SearchView, {clientProvider: fsClientProvider}),
    route('FolderView',             '/f/*',              FolderView, {clientProvider: fsClientProvider}),
    { path: '*', redirect: '/not-found'}
];


const router = new VueRouter({
    mode: 'history',
    routes: routes,
});


new Vue(Vue.util.extend({
    router,
    store,
}, App)).$mount('#app');
