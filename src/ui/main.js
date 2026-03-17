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

window.Schemio = {
    components: {
        Vue, Vuex, Modal, CreateNewSchemeModal, EditorEventBus, SchemioEditorWebApp,
        store, Dropdown, MenuDropdown, Pagination, RichTextEditor, ColorPicker
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
        const appComponent = Vue.component('SchemioEditorWebApp', Vue.util.extend({store}, SchemioEditorWebApp));

        const editorId = options.editorId || 'default';

        const vm = new Vue({
            el: querySelector,
            components: { appComponent },
            render: h => h('appComponent', {
                props: {
                    editorId          : editorId,
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
                    },
                    'scheme-save-requested': (scheme) => {
                        if (options.onSchemeSaveRequested) {
                            options.onSchemeSaveRequested(scheme);
                        }
                    }
                }
            })
        });

        // Navigate Vue component tree to find SchemeContainer
        function getSchemeContainer() {
            try {
                // vm -> SchemioEditorWebApp -> SchemioEditorApp -> SchemeEditor
                const webApp = vm.$children && vm.$children[0];
                console.log('[Schemio] webApp:', webApp?.$options?.name || webApp?.constructor?.name, 'children:', webApp?.$children?.length);
                if (!webApp || !webApp.$children) return null;
                const editorApp = webApp.$children[0];
                console.log('[Schemio] editorApp:', editorApp?.$options?.name || editorApp?.constructor?.name, 'children:', editorApp?.$children?.length);
                if (!editorApp || !editorApp.$children) return null;
                for (let i = 0; i < editorApp.$children.length; i++) {
                    const child = editorApp.$children[i];
                    console.log(`[Schemio] child[${i}]:`, child?.$options?.name || child?.constructor?.name,
                        'mode:', child.mode,
                        'schemeContainer:', !!child.schemeContainer,
                        'interactiveSchemeContainer:', !!child.interactiveSchemeContainer);
                    if (child.schemeContainer && child.mode === 'edit') return child.schemeContainer;
                    if (child.interactiveSchemeContainer) return child.interactiveSchemeContainer;
                    if (child.schemeContainer) return child.schemeContainer;
                }
                return null;
            } catch (e) {
                console.error('[Schemio] getSchemeContainer error:', e);
                return null;
            }
        }

        return {
            editorId,

            selectItem(itemId) {
                console.log('[Schemio] selectItem called with:', itemId);
                const sc = getSchemeContainer();
                console.log('[Schemio] schemeContainer:', sc);
                if (!sc) return false;
                const item = sc.findItemById(itemId);
                console.log('[Schemio] found item:', item?.id, item?.name);
                if (!item) return false;
                sc.selectItem(item, false);
                return true;
            },

            panToItem(itemId) {
                const sc = getSchemeContainer();
                if (!sc) return false;
                const item = sc.findItemById(itemId);
                if (!item) return false;
                // Center the viewport on the item
                const el = document.querySelector(querySelector);
                if (!el) return false;
                const viewW = el.clientWidth;
                const viewH = el.clientHeight;
                const cx = item.area.x + item.area.w / 2;
                const cy = item.area.y + item.area.h / 2;
                const scale = sc.screenTransform.scale;
                sc.screenTransform.x = viewW / 2 - cx * scale;
                sc.screenTransform.y = viewH / 2 - cy * scale;
                EditorEventBus.screenTransformUpdated.$emit(editorId, sc.screenTransform);
                return true;
            },

            selectAndPanToItem(itemId) {
                const selected = this.selectItem(itemId);
                const panned = this.panToItem(itemId);
                return selected || panned;
            },

            destroy() {
                vm.$destroy();
            }
        };
    }
}
