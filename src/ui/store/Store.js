/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import Vue from 'vue';
import Vuex from 'vuex';
import {forEach} from '../collections';
import utils from '../utils';
import {createSettingStorageFromLocalStorage} from '../LimitedSettingsStorage';
import shortid from 'shortid';

Vue.use(Vuex);

const DEFAULT_CONNECTOR_SMOOTHING = 'defaultConnectorSmoothing';

const myStorage = createSettingStorageFromLocalStorage('store', 100);

const routePrefix = document.body.getAttribute('data-route-prefix') || '';

const store = new Vuex.Store({
    state: {

        //rootPath is used in the header for a home link, since if this is being hosted in GitHub Pages then we cannot use '/' as root path
        rootPath: '/',
        assetsPath: '/assets',

        routePrefix: routePrefix,

        apiClient: null,

        editorSubStateName: null,

        itemMenu: {
            artPackIds: new Set(),
            artPacks: [],
            shapeGroupIds: new Set()
        },

        // used in "connecting" state
        connecting: {
            connectorItem: null
        },

        patch: {
            settings: {
                additionsColor: 'rgba(90, 255, 90, 0.4)',
                deletionsColor: 'rgba(255, 90, 90, 0.4)',
                modificationsColor: 'rgba(90, 90, 255, 0.4)',
            },
            diffColoringEnabled: true
        },

        defaultConnectorSmoothing: myStorage.get(DEFAULT_CONNECTOR_SMOOTHING, 'linear'),

        autoRemount: myStorage.get('autoRemount', true),
        showPivot: myStorage.get('showPivot', false),
        showItemDetailMarkers: myStorage.get('showItemDetailMarkers', true),


        // item which style should be copied to other items
        copiedStyleItem: null,

        snap: {
            grid: myStorage.get('snap.grid', false),
            items: myStorage.get('snap.items', true),
        },

        itemSurround: {
            padding: 40
        },

        itemControlPoints: [],

        // used when only single connector is selected
        // in this case we need to render its path to make it highlighted
        selectedConnectorPath: null,
        selectedConnector: null,

        multiSelectBox: null,

        // used to render snapping lines when user drags item and it is snapped to other items
        snappers: {
            horizontal: null,
            vertical: null,
        },

        // used to display proposed new items
        connectorProposedDestination: {
            shown: false,
            connectorItemId: null,
            mx: 0, // value on x viewport axis
            my: 0, // value on y viewport axis
        },

        // used for storing information about images that were dropped on svg editor
        imageUpload: {
            images: new Map(),
        },

        statusMessage: {
            message: null,
            isError: false
        },

        // Contains global self destructing messages that can be written from any components
        systemMessages: [],

        draw: {
            epsilon: 0,
            pencilSize: 3,
            brushSize: 5,
        },
    },
    mutations: {
        SET_ROOT_PATH(state, path) {
            state.rootPath = path;
        },

        SET_ASSESTS_PATH(state, path) {
            state.assetsPath = path;
        },

        SET_API_CLIENT(state, apiClient) {
            state.apiClient = apiClient
        },

        TOGGLE_AUTO_REMOUNT(state) {
            state.autoRemount = !state.autoRemount;
            myStorage.save('autoRemount', state.autoRemount);
        },

        TOGGLE_PIVOT(state) {
            state.showPivot = !state.showPivot;
            myStorage.save('showPivot', state.showPivot);
        },

        TOGGLE_ITEM_DETAIL_MARKERS(state) {
            state.showItemDetailMarkers = !state.showItemDetailMarkers;
            myStorage.save('showItemDetailMarkers', state.showItemDetailMarkers);
        },

        SET_DEFAULT_CONNECTOR_SMOOTHING(state, smoothing) {
            state.defaultConnectorSmoothing = smoothing;
            myStorage.save(DEFAULT_CONNECTOR_SMOOTHING, smoothing);
        },

        SET_GRID_SNAP(state, enabled) {
            state.snap.grid = enabled;
            myStorage.save('snap.grid', enabled);
        },
        SET_ITEM_SNAP(state, enabled) {
            state.snap.items = enabled;
            myStorage.save('snap.items', enabled);
        },
        SET_EDITOR_SUB_STATE_NAME(state, stateName) {
            state.editorSubStateName = stateName;
        },
        SET_ITEM_SURROUND_PADDING(state, padding) {
            state.itemSurround.padding = padding;
        },

        /*************** Item Control Points *****************/
        SET_ITEM_CONTROL_POINTS(state, itemControlPoints) {
            state.itemControlPoints = itemControlPoints;
        },
        CLEAR_ITEM_CONTROL_POINTS(state) {
            state.itemControlPoints.length = 0;
        },

        SET_MULTI_SELECT_BOX(state, box) {
            state.multiSelectBox = box;
        },

        SET_SELECTED_CONNECTOR_WITH_PATH(state, {item, path}) {
            state.selectedConnectorPath = path;
            state.selectedConnector = item;
        },

        /************ Snappers ****************/
        SET_ITEM_SNAPPER(state, snapper) {
            if (snapper.snapperType === 'horizontal') {
                state.snappers.horizontal = snapper;
            } else if (snapper.snapperType === 'vertical') {
                state.snappers.vertical = snapper;
            }
        },
        CLEAR_ITEM_SNAPPERS(state) {
            state.snappers.horizontal = null;
            state.snappers.vertical = null;
        },

        PROPOSE_CONNECTOR_DESTINATION_ITEMS(state, {connectorItemId, mx, my}) {
            state.connectorProposedDestination.connectorItemId = connectorItemId;
            state.connectorProposedDestination.mx = mx;
            state.connectorProposedDestination.my = my;
            state.connectorProposedDestination.shown = true;
        },
        DISABLE_PROPOSE_CONNECTOR_DESTINATION_ITEMS(state) {
            state.connectorProposedDestination.shown = false;
        },


        UPDATE_IMAGE_UPLOAD_STATUS(state,  { imageId, uploading, uploadFailed }) {
            if (uploadFailed) {
                state.statusMessage.message = 'Failed to upload image';
                state.statusMessage.isError = true;
            }

            if ((!uploading || uploadFailed) && state.imageUpload.images.has(imageId)) {
                state.imageUpload.images.delete(imageId);
            } else {
                state.imageUpload.images.set(imageId, { uploading, date: new Date() });
            }

            let imagesUploading = 0;

            state.imageUpload.images.forEach(image => {
                if (image.uploading) {
                    imagesUploading += 1;
                }
            });

            if (state.statusMessage.isError && state.statusMessage.message) {
                return;
            }

            if (imagesUploading > 0) {
                let suffix = '';
                if (imagesUploading > 1) {
                    suffix = 's';
                }
                state.statusMessage.message = `Uploading ${imagesUploading} image${suffix}`;
                state.statusMessage.isError = false;
            } else {
                state.statusMessage.message = null;
                state.statusMessage.isError = false;
            }
        },

        RESET_IMAGE_UPLOAD_STATUS(state) {
            const now = new Date();
            const toDeleteIds = [];
            state.imageUpload.images.forEach((image, imageId) => {
                if (now.getTime() - image.date.getTime() > 45000) {
                    toDeleteIds.push(imageId);
                }
            });

            forEach(toDeleteIds, id => {
                state.imageUpload.images.delete(id);
            });
        },

        CLEAR_STATUS_MESSAGE(state) {
            state.statusMessage.message = null;
            state.statusMessage.isError = false;
        },

        SET_STATUS_MESSAGE(state, { message, isError }) {
            state.statusMessage.message = message;
            state.statusMessage.isError = isError;
        },

        ADD_SYSTEM_MESSAGE(state, { message, status, id, iconClass }) {
            if (id) {
                // checking if there are already messages with the same id
                for (let i = 0; i < state.systemMessages.length; i++) {
                    if (state.systemMessages[i].id === id) {
                        return;
                    }
                }
            } else {
                id = shortid.generate();
            }

            state.systemMessages.push({
                id,
                message,
                status,
                iconClass
            });

            const timeout = 5000;
            const selfDestruct = () => {
                for (let i = 0; i < state.systemMessages.length; i++) {
                    if (state.systemMessages[i].id === id) {
                        state.systemMessages.splice(i, 1);
                        return;
                    }
                }
            };

            setTimeout(selfDestruct, timeout);
        },

        REMOVE_SYSTEM_MESSAGE(state, id) {
            for (let i = 0; i < state.systemMessages.length; i++) {
                if (state.systemMessages[i].id === id) {
                    state.systemMessages.splice(i, 1);
                    return;
                }
            }
        },

        UPDATE_DRAW_PENCIL_SIZE(state, size) {
            if (!isNaN(size)) {
                state.draw.pencilSize = size;
            }
        },
        UPDATE_DRAW_BRUSH_SIZE(state, size) {
            if (!isNaN(size)) {
                state.draw.brushSize = size;
            }
        },
        UPDATE_DRAW_EPSILON(state, epsilon) {
            if (!isNaN(epsilon)) {
                state.draw.epsilon = epsilon;
            }
        },

        COPY_ITEM_STYLE(state, item) {
            state.copiedStyleItem = utils.clone(item);
        },

        SET_PATCH_DIFF_COLORING_ENABLED(state, enabled) {
            state.patch.diffColoringEnabled = enabled;
        },

        UPDATE_PATCH_DIFF_COLOR(state, {changeType, color}) {
            if (changeType === 'additions') {
                state.patch.settings.additionsColor = color;
            } else if (changeType === 'deletions') {
                state.patch.settings.deletionsColor = color;
            } else if (changeType === 'modifications') {
                state.patch.settings.modificationsColor = color;
            }
        },

        SET_CURRENT_CONNECTOR(state, {item}) {
            state.connecting.connectorItem = item;
        },

        ADD_ART_PACK(state, {artPack, artPackId}) {
            if (!state.itemMenu.artPackIds.has(artPackId)) {
                state.itemMenu.artPacks.push({
                    ...artPack,
                    id: artPackId
                });
                state.itemMenu.artPackIds.add(artPackId);
            }
        },

        REMOVE_ART_PACK(state, artPackId) {
            if (state.itemMenu.artPackIds.has(artPackId)) {
                state.itemMenu.artPackIds.delete(artPackId);
                for (let i = 0; i < state.itemMenu.artPacks.length; i++) {
                    if (state.itemMenu.artPacks[i].id === artPackId) {
                        state.itemMenu.artPacks.splice(i, 1);
                        return;
                    }
                }
            }
        },

        REGISTER_SHAPE_GROUP_ID(state, id) {
            state.itemMenu.shapeGroupIds.add(id);
        }
    },

    actions: {
        setRootPath({commit}, path) {
            commit('SET_ROOT_PATH', path);
        },

        setAssetsPath({commit}, path) {
            commit('SET_ASSESTS_PATH', path);
        },

        setApiClient({commit}, apiClient) {
            commit('SET_API_CLIENT', apiClient);
        },

        setDefaultConnectorSmoothing({commit}, smoothing) {
            commit('SET_DEFAULT_CONNECTOR_SMOOTHING', smoothing);
        },

        setGridSnap({commit}, enabled) {
            commit('SET_GRID_SNAP', enabled);
        },
        setItemSnap({commit}, enabled) {
            commit('SET_ITEM_SNAP', enabled);
        },

        setEditorSubStateName({commit}, stateName) {
            commit('SET_EDITOR_SUB_STATE_NAME', stateName);
        },

        setItemSurroundPadding({commit}, padding) {
            commit('SET_ITEM_SURROUND_PADDING', padding);
        },

        setItemControlPoints({commit}, itemControlPoints) {
            const list = [];
            forEach(itemControlPoints, (controlPoint, pointId) => {
                list.push({
                    id: pointId,
                    point: controlPoint
                });
            });
            commit('SET_ITEM_CONTROL_POINTS', list);
        },

        clearItemControlPoints({commit}) {
            commit('CLEAR_ITEM_CONTROL_POINTS');
        },

        setMultiSelectBox({commit}, box) {
            commit('SET_MULTI_SELECT_BOX', box);
        },

        setSelectedConnectorWithPath({commit}, {item, path}) {
            commit('SET_SELECTED_CONNECTOR_WITH_PATH', {item, path});
        },

        setItemSnapper({commit}, snapper) {
            commit('SET_ITEM_SNAPPER', snapper);
        },
        clearItemSnappers({commit}) {
            commit('CLEAR_ITEM_SNAPPERS');
        },

        toggleAutoRemount({commit}) {
            commit('TOGGLE_AUTO_REMOUNT');
        },

        togglePivot({commit}) {
            commit('TOGGLE_PIVOT');
        },

        toggleItemDetailMarkers({commit}) {
            commit('TOGGLE_ITEM_DETAIL_MARKERS');
        },

        proposeConnectorDestinationItems({commit}, payload) {
            commit('PROPOSE_CONNECTOR_DESTINATION_ITEMS', payload);
        },
        disableProposeConnectorDestinationItems({commit}) {
            commit('DISABLE_PROPOSE_CONNECTOR_DESTINATION_ITEMS');
        },

        updateImageUploadStatus({commit}, { imageId, uploading, uploadFailed }) {
            commit('UPDATE_IMAGE_UPLOAD_STATUS', { imageId, uploading, uploadFailed });

            // triggering an update of all messages in a minute
            // this is needed in case image uploading gets somehow stuck
            setTimeout(() => {
                commit('RESET_IMAGE_UPLOAD_STATUS');
            }, 60000);
        },

        clearStatusMessage({commit}) {
            commit('CLEAR_STATUS_MESSAGE');
        },

        setErrorStatusMessage({commit}, message) {
            commit('SET_STATUS_MESSAGE', {message, isError: true});
        },

        addSystemMessage({commit}, { message, status, id, iconClass }) {
            commit('ADD_SYSTEM_MESSAGE', { message, status, id, iconClass });
        },
        removeSystemMessage({commit}, id) {
            commit('REMOVE_SYSTEM_MESSAGE', id);
        },

        updateDrawEpsilon({commit}, epsilon) {
            commit('UPDATE_DRAW_EPSILON', epsilon);
        },
        updateDrawPencilSize({commit}, epsilon) {
            commit('UPDATE_DRAW_PENCIL_SIZE', epsilon);
        },
        updateDrawBrushSize({commit}, epsilon) {
            commit('UPDATE_DRAW_BRUSH_SIZE', epsilon);
        },

        copyItemStyle({commit}, item) {
            commit('COPY_ITEM_STYLE', item);
        },

        setPatchDiffColoringEnabled({commit}, enabled) {
            commit('SET_PATCH_DIFF_COLORING_ENABLED', enabled);
        },

        updatePatchDiffColor({commit}, {changeType, color}) {
            commit('UPDATE_PATCH_DIFF_COLOR', {changeType, color});
        },

        setCurrentConnector({commit}, item) {
            commit('SET_CURRENT_CONNECTOR', {item});
        },

        addArtPack({commit}, {artPack, artPackId}) {
            commit('ADD_ART_PACK', {artPack, artPackId});
        },

        removeArtPack({commit}, artPackId) {
            commit('REMOVE_ART_PACK', artPackId);
        },

        registerShapeGroupId({commit}, shapeGroupId) {
            commit('REGISTER_SHAPE_GROUP_ID', shapeGroupId);
        }
    },

    getters: {
        apiClient: state => state.apiClient,

        itemControlPointsList: state => state.itemControlPoints,

        multiSelectBox: state => state.multiSelectBox,

        horizontalSnapper: state => state.snappers.horizontal,
        verticalSnapper: state => state.snappers.vertical,

        shouldSnapToGrid: state => state.snap.grid,
        shouldSnapToItems: state => state.snap.items,

        autoRemount: state => state.autoRemount,
        showPivot: state => state.showPivot,
        showItemDetailMarkers: state => state.showItemDetailMarkers,

        connectorProposedDestination: state => state.connectorProposedDestination,

        statusMessage: state => state.statusMessage,

        selectedConnectorPath: state => state.selectedConnectorPath,
        selectedConnector: state => state.selectedConnector,

        systemMessages: state => state.systemMessages,

        drawEpsilon: state => state.draw.epsilon,
        drawPencilSize: state => state.draw.pencilSize,
        drawBrushSize: state => state.draw.brushSize,

        editorSubStateName: state => state.editorSubStateName,

        patchAdditionsColor: state => state.patch.settings.additionsColor,
        patchDeletionsColor: state => state.patch.settings.deletionsColor,
        patchModificationsColor: state => state.patch.settings.modificationsColor,
        patchIsDiffColoringEnabled: state => state.patch.diffColoringEnabled,

        staticExportAllowed: state => {
            if (state.apiClient && state.apiClient.submitStaticExport) {
                return true;
            }
            return false;
        },

        rootPath: state => {
            if (state.routePrefix) {
                if (state.rootPath === '/') {
                    return state.routePrefix;
                }
                return state.routePrefix + state.rootPath;
            }
            return state.rootPath;
        },
        assetsPath: state => {
            if (state.routePrefix) {
                return state.routePrefix + state.assetsPath;
            }
            return state.assetsPath;
        },
        routePrefix: state => state.routePrefix,
    }
});

export default store;