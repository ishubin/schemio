/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import Vue from 'vue';
import Vuex from 'vuex';
import store from './store/Store.js';
import {createHasher} from './url/hasher.js';
import SchemioEditorWebApp from './components/SchemioEditorWebApp.vue';
import Modal from './components/Modal.vue';
import Pagination from './components/Pagination.vue';
import CreateNewSchemeModal from './components/CreateNewSchemeModal.vue';
import EditorEventBus from './components/editor/EditorEventBus';
import { snapshotSvg } from './svgPreview.js';
import { getBoundingBoxOfItems } from './scheme/SchemeContainer.js';
import { traverseItems } from './scheme/Item.js';
import Dropdown from './components/Dropdown.vue';
import MenuDropdown from './components/MenuDropdown.vue';
import { applySchemePatch, generateSchemePatch, generatePatchIndex, generatePatchStatistic  } from './scheme/SchemePatch.js';
import { enrichSchemeWithDefaults } from './scheme/Scheme.js';
import htmlSanitize from '../htmlSanitize.js';
import RichTextEditor from './components/RichTextEditor.vue';
import utils from './utils.js';

window.Schemio = {
    components: {
        Vue, Vuex, Modal, CreateNewSchemeModal, EditorEventBus, SchemioEditorWebApp,
        store, Dropdown, MenuDropdown, Pagination, RichTextEditor
    },
    utils: {
        getObjectProperty: utils.getObjectProperty,
        createHasher,
        snapshotSvg,
        getBoundingBoxOfItems,
        traverseItems,
        enrichSchemeWithDefaults,
        htmlSanitize,
    },
    patcher: { applySchemePatch, generateSchemePatch, generatePatchIndex, generatePatchStatistic },
    /**
     *
     * @param {*} querySelector
     * @param {Object} options
     * @param {Object} options.scheme
     * @param {Array}  options.menuOptions - an array of dropdown menu options in the format of [{name: String, iconClass: String, callback: Function}]
     * @param {Boolean} options.editAllowed
     * @param {Boolean} options.userStylesEnabled
     * @param {Object} options.apiClient - API client
     */
    mountSchemioEditorApp(querySelector,  options) {
        if (options.apiClient) {
            store.dispatch('setApiClient', options.apiClient);
        }
        const appComponent = Vue.component('SchemioEditorWebApp', Vue.util.extend({store}, SchemioEditorWebApp));

        new Vue({
            el: querySelector,
            components: { appComponent },
            render: h => h('appComponent', {
                props: {
                    editorId          : options.editorId || 'default',
                    scheme            : options.scheme || null,
                    editorMode        : options.editorMode || 'view',
                    editAllowed       : options.editAllowed || false,
                    userStylesEnabled : options.userStylesEnabled || false,
                    menuOptions       : options.menuOptions || [],
                    detectBrowserClose: options.detectBrowserClose || false,
                },
                on: {
                    'mode-changed': (mode) => {
                        if (options.onModeChanged) {
                            options.onModeChanged(mode);
                        }
                    },
                    'delete-diagram-requested': (docId) => {
                        if (options.onDeleteDiagram) {
                            options.onDeleteDiagram(docId);
                        }
                    }
                }
            })
        });
    }
}
