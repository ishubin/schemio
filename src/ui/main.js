/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import store from './store/Store.js';
import SchemioEditorApp from './SchemioEditorApp.vue';
import Modal from './components/Modal.vue';
import CreateNewSchemeModal from './components/CreateNewSchemeModal.vue';
import CategoryTree from './components/search/CategoryTree.vue';
import apiClient from './apiClient.js';


const appComponent = Vue.component('SchemioEditorApp', Vue.util.extend({store}, SchemioEditorApp));



window.Schemio = {
    components: { Vue, Modal, CreateNewSchemeModal, CategoryTree},
    apiClient,
    /**
     * 
     * @param {*} querySelector 
     * @param {Object} options 
     * @param {String} options.projectId
     * @param {Object} options.scheme
     * @param {Object} options.changedScheme - a scheme that was modified. This will allow user to check diff of the two schemes
     * @param {Array}  options.menuOptions - an array of dropdown menu options in the format of [{name: String, iconClass: String, callback: Function}]
     * @param {Boolean} options.editAllowed
     */
    mountSchemioEditorApp(querySelector,  options /* projectId, scheme, editAllowed, menuOptions */) {
        new Vue({
            el: querySelector,
            components: { appComponent },
            render: h => h('appComponent', {props: {
                projectId    : options.projectId || null,
                scheme       : options.scheme || null,
                changedScheme: options.changedScheme || null,
                editAllowed  : options.editAllowed || false,
                menuOptions  : options.menuOptions || []
            }})
        }); 
    }
}
