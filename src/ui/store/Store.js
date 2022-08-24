/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import Vue from 'vue';
import Vuex from 'vuex';
import forEach from 'lodash/forEach';
import utils from '../utils';
import {createSettingStorageFromLocalStorage} from '../LimitedSettingsStorage';
import shortid from 'shortid';
import { itemCompleteTransform } from '../scheme/SchemeContainer';
import myMath from '../myMath';

Vue.use(Vuex);

const DEFAULT_CONNECTOR_SMOOTHING = 'defaultConnectorSmoothing';

const myStorage = createSettingStorageFromLocalStorage('store', 100);

function createCurvePointConverter(item) {
    const completeTransform = itemCompleteTransform(item);

    return (point)  => {
        const convertedPoint = utils.clone(point);
        const p = myMath.transformPoint(completeTransform, point.x, point.y);

        convertedPoint.x = p.x;
        convertedPoint.y = p.y;

        if (point.t === 'B' || point.t === 'A') {
            const p1 = myMath.transformPoint(completeTransform, point.x + point.x1, point.y + point.y1);
            convertedPoint.x1 = p1.x - p.x;
            convertedPoint.y1 = p1.y - p.y;
        }
        if (point.t === 'B') {
            const p2 = myMath.transformPoint(completeTransform, point.x + point.x2, point.y + point.y2);
            convertedPoint.x2 = p2.x - p.x;
            convertedPoint.y2 = p2.y - p.y;
        }
        return convertedPoint;
    }
}

function enrichCurvePoint(point) {
    if (point.t === 'B') {
        let length = Math.sqrt(point.x1*point.x1 + point.y1*point.y1);
        let vx1 = 1, vy1 = 0;
        if (length > 0.000001) {
            vx1 = point.x1 / length;
            vy1 = point.y1 / length;
        }
        length = Math.sqrt(point.x2*point.x2 + point.y2*point.y2);
        let vx2 = 1, vy2 = 0;
        if (length > 0.000001) {
            vx2 = point.x2 / length;
            vy2 = point.y2 / length;
        }
        point.vx1 = vx1;
        point.vy1 = vy1;
        point.vx2 = vx2;
        point.vy2 = vy2;
    }
}


function validatePointIds(pathId, pointId, curveEditing) {
    return pathId >= 0 && pathId < curveEditing.paths.length
        && pointId >= 0 && pointId < curveEditing.paths[pathId].points.length;
}

function findFirstSelectedCurveEditPoint(paths) {
    for (let i = 0; i < paths.length; i++) {
        for (let j = 0; j < paths[i].points.length; j++) {
            if (paths[i].points[j].selected) {
                return paths[i].points[j];
            }
        }
    }
    return null;
}

const store = new Vuex.Store({
    state: {
        assetsPath: '/assets',

        apiClient: null,

        schemeModified: false,

        editorStateName: 'interact',
        editorSubStateName: null,

        extraShapeGroups: [],

        curveEditing: {
            // item whose curve is currently edited
            item: null,
            paths: [],
            firstSelectedPoint: null
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

        autoRemount: true,
        showPivot: false,


        // toggles clickable item markers in view mode so that users can see
        // what they can click on the diagram and which elements are interactive
        showClickableMarkers: false,

        // stores the state of the history in scheme editing
        history: {
            undoable: false,
            redoable: false
        },

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
            epsilon: 5
        },

        animationEditor: {
            currentFramePlayer: null,
            isRecording: false
        }
    },
    mutations: {
        SET_ASSESTS_PATH(state, path) {
            state.assetsPath = path;
        },

        SET_API_CLIENT(state, apiClient) {
            state.apiClient = apiClient
        },

        SET_SCHEME_MODIFIED(state, isModified) {
            state.schemeModified = isModified;
        },

        SET_AUTO_REMOUNT(state, autoRemount) {
            state.autoRemount = autoRemount;
        },

        SET_SHOW_PIVOT(state, show) {
            state.showPivot = show;
        },

        SET_SHOW_CLICKABLE_MARKERS(state, show) {
            state.showClickableMarkers = show;
        },

        /* Curve Editing */ 
        SET_CURVE_EDIT_ITEM(state, {item, paths}) {
            state.curveEditing.item = item;
            state.curveEditing.paths.length = 0;
            if (item) {
                const pointConverter = createCurvePointConverter(item);
                paths.forEach((path, pathId) => {
                    state.curveEditing.paths[pathId] = {id: path.id, points: path.points.map(pointConverter)};
                });
            }
        },
        UPDATE_CURVE_EDIT_POINT(state, {item, pathId, pointId, point}) {
            if (!validatePointIds(pathId, pointId, state.curveEditing)) {
                return;
            }

            const pointConverter = createCurvePointConverter(item);
            const convertedPoint = pointConverter(point);

            forEach(convertedPoint, (value, field) => {
                state.curveEditing.paths[pathId].points[pointId][field] = value;
                enrichCurvePoint(state.curveEditing.paths[pathId].points[pointId]);
            });
        },
        TOGGLE_CURVE_EDIT_POINT_SELECTION(state, { pathId, pointId, inclusive }) {
            if (!validatePointIds(pathId, pointId, state.curveEditing)) {
                return;
            }
            if (inclusive) {
                state.curveEditing.paths[pathId].points[pointId].selected = !state.curveEditing.paths[pathId].points[pointId].selected;
                state.curveEditing.firstSelectedPoint = findFirstSelectedCurveEditPoint(state.curveEditing.paths);
            } else {
                state.curveEditing.paths.forEach((path, _pathIndex) => {
                    path.points.forEach((point, _pointIndex) => {
                        point.selected = _pathIndex === pathId && _pointIndex === pointId;
                    });
                });
                state.curveEditing.firstSelectedPoint = state.curveEditing.paths[pathId].points[pointId];
            }
        },
        RESET_CURVE_EDIT_POINT_SELECTION(state) {
            state.curveEditing.paths.forEach(path => {
                path.points.forEach(point => {
                    point.selected = false;
                });
            });
            state.curveEditing.firstSelectedPoint = null;
        },
        SELECT_CURVE_EDIT_POINT(state, { pathId, pointId, inclusive }) {
            if (!validatePointIds(pathId, pointId, state.curveEditing)) {
                return;
            }
            if (inclusive) {
                state.curveEditing.paths[pathId].points[pointId].selected = true;
                state.curveEditing.firstSelectedPoint = findFirstSelectedCurveEditPoint(state.curveEditing.paths);
            } else {
                state.curveEditing.paths.forEach((path, _pathIndex) => {
                    path.points.forEach((point, _pointIndex) => {
                        point.selected = _pathIndex === pathId && _pointIndex === pointId;
                    });
                });
                state.curveEditing.firstSelectedPoint = state.curveEditing.paths[pathId].points[pointId];
            }
        },


        /* History */
        SET_HISTORY_UNDOABLE(state, isUndoable) {
            state.history.undoable = isUndoable;
        },
        SET_HISTORY_REDOABLE(state, isRedoable) {
            state.history.redoable = isRedoable;
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
        SET_EDITOR_STATE_NAME(state, stateName) {
            state.editorStateName = stateName;
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

        SET_SELECTED_CONNECTOR_PATH(state, path) {
            state.selectedConnectorPath = path;
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

        ADD_SYSTEM_MESSAGE(state, { message, status, id }) {
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

        UPDATE_DRAW_EPSILON(state, epsilon) {
            if (!isNaN(epsilon)) {
                state.draw.epsilon = epsilon;
            }
        },

        START_ANIMATION_EDITOR(state, framePlayer) {
            state.animationEditor.currentFramePlayer = framePlayer;
        },

        SET_ANIMATION_EDITOR_RECORDING(state, isRecording) {
            state.animationEditor.isRecording = isRecording;
        },

        COPY_ITEM_STYLE(state, item) {
            state.copiedStyleItem = utils.clone(item);
        },

        SET_PATCH_DIFF_COLORING_ENABLED(state, enabled) {
            state.patch.diffColoringEnabled = enabled;
        },

        UPDATE_PATCH_DIFF_COLOR(state, {changeType, color}) {
            console.log('UPDATE_PATCH_DIFF_COLOR', changeType, color);
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

        REGISTER_EXTRA_SHAPE_GROUP(state, shapeGroup) {
            for (let i = 0; i < state.extraShapeGroups.length; i++) {
                if (state.extraShapeGroups[i].id === shapeGroup.id) {
                    return;
                }
            }
            state.extraShapeGroups.push(shapeGroup);
        }
    },

    actions: {
        setAssetsPath({commit}, path) {
            commit('SET_ASSESTS_PATH', path);
        },

        setApiClient({commit}, apiClient) {
            commit('SET_API_CLIENT', apiClient);
        },

        markSchemeAsModified({commit}) {
            commit('SET_SCHEME_MODIFIED', true);
        },
        markSchemeAsUnmodified({commit}) {
            commit('SET_SCHEME_MODIFIED', false);
        },

        setCurveEditItem({commit}, item) {
            const paths = [];
            if (item) {
                item.shapeProps.paths.forEach((path, pathId) => {
                    const points = [];
                    path.points.forEach((point, pointId) => {
                        const p = utils.clone(point);
                        p.id = pointId;
                        p.selected = false;
                        enrichCurvePoint(p);
                        points.push(p);
                    });
                    paths.push({ id: pathId, points });
                });
            }
            commit('SET_CURVE_EDIT_ITEM', {item, paths});
        },
        updateCurveEditPoint({ commit }, { item, pathId, pointId, point }) {
            commit('UPDATE_CURVE_EDIT_POINT', { item, pathId, pointId, point });
        },
        toggleCurveEditPointSelection({ commit }, { pathId, pointId, inclusive }) {
            commit('TOGGLE_CURVE_EDIT_POINT_SELECTION', { pathId, pointId, inclusive });
        },
        resetCurveEditPointSelection({ commit }) {
            commit('RESET_CURVE_EDIT_POINT_SELECTION');
        },
        selectCurveEditPoint({ commit }, { pathId, pointId, inclusive }) {
            commit('SELECT_CURVE_EDIT_POINT', { pathId, pointId, inclusive });
        },

        
        setHistoryUndoable({commit}, isUndoable) {
            commit('SET_HISTORY_UNDOABLE', isUndoable);
        },
        
        setHistoryRedoable({commit}, isRedoable) {
            commit('SET_HISTORY_REDOABLE', isRedoable);
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

        setEditorStateName({commit}, stateName) {
            commit('SET_EDITOR_STATE_NAME', stateName);
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

        setSelectedConnectorPath({commit}, path) {
            commit('SET_SELECTED_CONNECTOR_PATH', path);
        },

        setItemSnapper({commit}, snapper) {
            commit('SET_ITEM_SNAPPER', snapper);
        },
        clearItemSnappers({commit}) {
            commit('CLEAR_ITEM_SNAPPERS');
        },

        setAutoRemount({commit}, autoRemount) {
            commit('SET_AUTO_REMOUNT', autoRemount);
        },

        setShowPivot({commit}, show) {
            commit('SET_SHOW_PIVOT', show);
        },

        setShowClickableMarkers({commit}, show) {
            commit('SET_SHOW_CLICKABLE_MARKERS', show);
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

        addSystemMessage({commit}, { message, status, id }) {
            commit('ADD_SYSTEM_MESSAGE', { message, status, id });
        },
        removeSystemMessage({commit}, id) {
            commit('REMOVE_SYSTEM_MESSAGE', id);
        },

        updateDrawEpsilon({commit}, epsilon) {
            commit('UPDATE_DRAW_EPSILON', epsilon);
        },

        startAnimationEditor({commit}, framePlayer) {
            commit('START_ANIMATION_EDITOR', framePlayer);
        },

        setAnimationEditorRecording({commit}, isRecording) {
            commit('SET_ANIMATION_EDITOR_RECORDING', isRecording);
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

        registerExtraShapeGroup({commit}, shapeGroup) {
            commit('REGISTER_EXTRA_SHAPE_GROUP', shapeGroup);
        }
    },

    getters: {
        apiClient: state => state.apiClient,

        schemeModified: state => state.schemeModified,
        
        itemControlPointsList: state => state.itemControlPoints,
        
        curveEditPaths: state => state.curveEditing.paths,

        firstSelectedCurveEditPoint: state => state.curveEditing.firstSelectedPoint,

        multiSelectBox: state => state.multiSelectBox,

        horizontalSnapper: state => state.snappers.horizontal,
        verticalSnapper: state => state.snappers.vertical,

        shouldSnapToGrid: state => state.snap.grid,
        shouldSnapToItems: state => state.snap.items,

        autoRemount: state => state.autoRemount,
        showPivot: state => state.showPivot,
        showClickableMarkers: state => state.showClickableMarkers,

        connectorProposedDestination: state => state.connectorProposedDestination,

        statusMessage: state => state.statusMessage,

        selectedConnectorPath: state => state.selectedConnectorPath,

        systemMessages: state => state.systemMessages,

        drawEpsilon: state => state.draw.epsilon,

        editorStateName: state => state.editorStateName,
        editorSubStateName: state => state.editorSubStateName,

        animationEditorCurrentFramePlayer: state => state.animationEditor.currentFramePlayer,

        animationEditorIsRecording: state => state.animationEditor.isRecording,

        patchAdditionsColor: state => state.patch.settings.additionsColor,
        patchDeletionsColor: state => state.patch.settings.deletionsColor,
        patchModificationsColor: state => state.patch.settings.modificationsColor,
        patchIsDiffColoringEnabled: state => state.patch.diffColoringEnabled,

        extraShapeGroups: state => state.extraShapeGroups,

        staticExportAllowed: state => {
            if (state.apiClient && state.apiClient.submitStaticExport) {
                return true;
            }
            return false;
        }
    }
});

export default store;