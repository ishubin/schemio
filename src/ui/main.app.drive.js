/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// This is an entry point for schemio bundle that is used for Google Drive based Schemio app

import {createApp} from 'vue';
import {createRouter, createWebHashHistory} from 'vue-router';
import App from './app/App.vue';
import FolderView from './app/view/FolderView.vue';
import SearchView from './app/view/SearchView.vue';
import AboutView from './app/view/AboutView.vue';
import store from './store/Store.js';
import SchemeEditorWebView from './app/view/SchemeEditorWebView.vue';
import NotFoundView from './app/view/NotFoundView.vue';
import Header from './app/components/HeaderDrive.vue';
import Footer from './app/components/FooterDrive.vue';
import HomeDriveView from './app/view/HomeDriveView.vue';
import { googleDriveClientProvider } from './app/client/googleDriveClient';
import { offlineClientProvider } from './app/client/offlineClient';
import { initGoogleAPI } from './googleApi';
import { defaultStarterTemplates } from './components/editor/DefaultStarterTemplates.js';
import { formatDateTime } from './date.js';


initGoogleAPI();

function route(name, path, component, props) {
    return { name, path, component, props };
}

const routes = [
    route('SchemeEditorWebView',       '/docs/:schemeId',   SchemeEditorWebView, {
        clientProvider: googleDriveClientProvider,
        userStylesEnabled: false,
        projectArtEnabled: false,
        starterTemplates: defaultStarterTemplates
    }),
    route('OfflineSchemeEditorWebView','/offline-editor',   SchemeEditorWebView, {
        clientProvider: offlineClientProvider,
        isOfflineEditor: true,
        userStylesEnabled: false,
        projectArtEnabled: false,
        starterTemplates: defaultStarterTemplates
    }),
    route('AboutView',              '/about',            AboutView),
    route('NotFoundView',           '/not-found',        NotFoundView),
    route('HomeView',               '/',                 HomeDriveView),
    route('SearchView',             '/search',           SearchView, {clientProvider: googleDriveClientProvider}),
    route('FolderView',             '/f/:folders*',      FolderView, {clientProvider: googleDriveClientProvider}),
    { path: '/.*', redirect: '/not-found'}
];


const router = createRouter({
    history: createWebHashHistory(),
    routes: routes,
    mode: 'hash', // custom property to be able to get the mode of the router through this.$router.options.mode
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