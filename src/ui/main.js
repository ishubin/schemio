/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {createApp} from 'vue';
import {createStore} from 'vuex';
import Emitter from 'tiny-emitter';
import store from './store/Store.js';
import {createHasher} from './url/hasher.js';
import SchemioEditorWebApp from './components/SchemioEditorWebApp.vue';
import Modal from './components/Modal.vue';
import Pagination from './components/Pagination.vue';
import CreateNewSchemeModal from './components/CreateNewSchemeModal.vue';
import EditorEventBus from './components/editor/EditorEventBus';
import { snapshotSvg } from './svgPreview.js';
import { getBoundingBoxOfItems } from './scheme/ItemMath.js';
import { traverseItems } from './scheme/Item.js';
import Dropdown from './components/Dropdown.vue';
import MenuDropdown from './components/MenuDropdown.vue';
import { applySchemePatch, generateSchemePatch, generatePatchIndex, generatePatchStatistic } from './scheme/SchemePatch.js';
import { enrichSchemeWithDefaults } from './scheme/Scheme.js';
import htmlSanitize from '../htmlSanitize.js';
import RichTextEditor from './components/editor/text-editor/RichTextEditor.vue';
import utils from './utils.js';
import {InMemoryCache, LimitedSettingsStorage} from './LimitedSettingsStorage.js'
import { diagramImageExporter } from './diagramExporter.js';
import { compileItemTemplate } from './components/editor/items/ItemTemplate.js';
import ColorPicker from './components/editor/ColorPicker.vue';
import StandaloneSchemeView from './views/StandaloneSchemeView.vue';

window.Schemio = {
    components: {
        createApp, createStore, Modal, CreateNewSchemeModal, EditorEventBus, SchemioEditorWebApp,
        store, Dropdown, MenuDropdown, Pagination, RichTextEditor, ColorPicker, StandaloneSchemeView,
        createEventBus
    },
    utils: {
        getObjectProperty: utils.getObjectProperty,
        createHasher,
        snapshotSvg,
        compileItemTemplate,
        diagramImageExporter,
        getBoundingBoxOfItems,
        traverseItems,
        enrichSchemeWithDefaults,
        htmlSanitize,
        LimitedSettingsStorage,
        InMemoryCache,
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
        const app = createApp({
            components: { SchemioEditorWebApp },
            template: `
                <schemio-editor-web-app
                    :editor-id=editorId
                    :scheme=scheme
                    :editor-mode=editorMode
                    :edit-allowed=editAllowed
                    :user-styles-enabled=userStylesEnabled
                    :menu-options=menuOptions
                    :detect-browser-close=detectBrowserClose
                    @mode-changed="onModeChanged"
                    @delete-diagram-requested="onDeleteDiagramRequested"
            />
            `,
            data() {
                return {
                    editorId          : options.editorId || 'default',
                    scheme            : options.scheme || null,
                    editorMode        : options.editorMode || 'view',
                    editAllowed       : options.editAllowed || false,
                    userStylesEnabled : options.userStylesEnabled || false,
                    menuOptions       : options.menuOptions || [],
                    detectBrowserClose: options.detectBrowserClose || false,
                };
            },
            methods: {
                onModeChanged(mode) {
                    if (options.onModeChanged) {
                        options.onModeChanged(mode);
                    }
                },
                onDeleteDiagramRequested(docId) {
                    if (options.onDeleteDiagram) {
                        options.onDeleteDiagram(docId);
                    }
                }
            }
        });
        app.use(store);
        app.mount(querySelector);
    }
}

function createEventBus() {
    const bus = new Emitter();
    return {
        $on: (...args) => {
            bus.on(...args)
        },
        $off: (...args) => {
            bus.off(...args)
        },
        $emit: (...args) => {
            bus.emit(...args)
        },
    };
}
