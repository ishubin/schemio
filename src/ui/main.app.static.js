/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This is an entry point for schemio bundle that is used for FS based Schemio app

import {createApp} from 'vue';
import {createRouter, createWebHashHistory} from 'vue-router';
import App from './app/App.vue';
import FolderView from './app/view/FolderView.vue';
import AboutView from './app/view/AboutView.vue';
import store from './store/Store.js';
import SchemeEditorWebView from './app/view/SchemeEditorWebView.vue';
import NotFoundView from './app/view/NotFoundView.vue';
import Header from './app/components/Header.vue';
import Footer from './app/components/Footer.vue';
import { staticClientProvider } from './app/client/staticClient';
import { offlineClientProvider } from './app/client/offlineClient';

window.createSchemioStaticApp = function (options) {
    let editAllowed = false;
    if (options) {
        if (options.hasOwnProperty('editAllowed')) {
            editAllowed = options.editAllowed;
        }
    }

    store.dispatch('setRootPath', './');
    store.dispatch('setAssetsPath', './assets');

    function route(name, path, component, props) {
        return { name, path, component, props };
    }

    const routes = [
        route('SchemeEditorWebView',        '/docs/:schemeId',   SchemeEditorWebView, {clientProvider: staticClientProvider, editAllowed}),
        route('OfflineSchemeEditorWebView', '/offline-editor',   SchemeEditorWebView, {clientProvider: offlineClientProvider, isOfflineEditor: true, userStylesEnabled: false, projectArtEnabled: false}),
        route('AboutView',                  '/about',            AboutView),
        route('NotFoundView',               '/not-found',        NotFoundView),
        route('HomeView',                   '/',                 FolderView, {clientProvider: staticClientProvider}),
        route('FolderView',                 '/f/:folders*',      FolderView, {clientProvider: staticClientProvider, toolbarShown: false}),
        { path: '/.*', redirect: '/not-found'}
    ];


    const router = createRouter({
        history: createWebHashHistory(),
        routes: routes,
        mode: 'hash' // custom property to be able to get the mode of the router through this.$router.options.mode
    });

    const app = createApp(App);

    app.config.globalProperties.$filters = {
    formatDateTime(value) {
        return formatDateTime(value);
    }
    }
    app.use(router);
    app.use(store);
    app.component('schemio-header', Header);
    app.component('schemio-footer', Footer);
    app.mount('#app');
}
