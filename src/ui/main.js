/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import store from './store/Store.js';
import SchemioEditorApp from './SchemioEditorApp.vue';
import Modal from './components/Modal.vue';
import CreateNewSchemeModal from './components/CreateNewSchemeModal.vue';

window.Schemio = {
    components: { Vue, Modal, CreateNewSchemeModal},
    /**
     *
     * @param {*} querySelector
     * @param {Object} options
     * @param {Object} options.scheme
     * @param {Array}  options.menuOptions - an array of dropdown menu options in the format of [{name: String, iconClass: String, callback: Function}]
     * @param {Boolean} options.editAllowed
     * @param {Boolean} options.userStylesEnabled
     * @param {Object} options.comments
     * @param {Object} options.apiClient - API client
     */
    mountSchemioEditorApp(querySelector,  options) {
        if (options.apiClient) {
            store.dispatch('setApiClient', options.apiClient);
        }
        const appComponent = Vue.component('SchemioEditorApp', Vue.util.extend({store}, SchemioEditorApp));

        new Vue({
            el: querySelector,
            components: { appComponent },
            render: h => h('appComponent', {props: {
                scheme           : options.scheme || null,
                editAllowed      : options.editAllowed || false,
                userStylesEnabled: options.userStylesEnabled || false,
                menuOptions      : options.menuOptions || [],
                comments         : options.comments || {enabled: false, allowed: false, isAdmin: false, provider: null},
            }})
        });
    }
}
