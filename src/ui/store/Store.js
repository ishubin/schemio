import Vue from 'vue';
import Vuex from 'vuex';
import apiClient from '../apiClient';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import utils from '../utils';
import {createSettingStorageFromLocalStorage} from '../LimitedSettingsStorage';
import shortid from 'shortid';
import config from '../config';
import { hasGivenConsent } from '../privacy';

Vue.use(Vuex);

const myStorage = createSettingStorageFromLocalStorage('store', 100);

/**
 * This function retrieves user data from local storage and verifies that it matches current session ID
 */
function getVerifiedUserDataFromMyStorage() {
    const sessionId = getCookie('sx');
    if (!sessionId) {
        return null;
    }
    const userData = myStorage.get('user');

    // check that current session id is the same as the one it has recorded in local storage
    // when sx cookie expires it will force it to fetch user again
    if (!userData || userData.sessionId !== sessionId) {
        return null;
    }

    if (typeof userData.savedAt !== 'number') {
        return null;
    }

    if (Date.now() - userData.savedAt > config.cache.currentUserTTL) {
        return null;
    }
    return userData;
}

function getCookie(name) {
    const encodedCookies = document.cookie.split(";");
    
    for(var i = 0; i < encodedCookies.length; i++) {
        const cookieData = encodedCookies[i].split("=");
        if(cookieData[0].trim() === name) {
            return decodeURIComponent(cookieData[1]);
        }
    }
    return null;
}

function saveUserInMyStorage(user) {
    myStorage.save('user', {
        sessionId: getCookie('sx'),
        user,
        savedAt: Date.now()
    });
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



const store = new Vuex.Store({
    state: {
        isLoadingUser: false,
        currentUser: null,
        schemeModified: false,

        editorStateName: 'interact',

        consent: {
            hasConsent: !config.consent.enabled || hasGivenConsent()
        },

        curveEditing: {
            // item whose curve is currently edited
            item: null,
            points: []
        },

        autoRemount: true,

        // stores the state of the history in scheme editing
        history: {
            undoable: false,
            redoable: false
        },

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

        // Contains global self descructing messages that can be written from any components
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
        SET_IS_LOADING_USER(state, isLoading) {
            state.isLoadingUser = isLoading;
        },

        SET_CURRENT_USER(state, user) {
            state.currentUser = user;
        },
        SET_SCHEME_MODIFIED(state, isModified) {
            state.schemeModified = isModified;
        },

        SET_AUTO_REMOUNT(state, autoRemount) {
            state.autoRemount = autoRemount;
        },

        /* Curve Editing */ 
        SET_CURVE_EDIT_ITEM(state, {item, points}) {
            state.curveEditing.item = item;
            state.curveEditing.points.length = 0;
            forEach(points, point => {
                state.curveEditing.points.push(point);
            });
        },
        UPDATE_CURVE_EDIT_POINT(state, {pointId, point}) {
            if (pointId < 0 || pointId >= state.curveEditing.points.length) {
                return;
            }
            forEach(point, (value, field) => {
                state.curveEditing.points[pointId][field] = value;
                enrichCurvePoint(state.curveEditing.points[pointId]);
            });
        },
        TOGGLE_CURVE_EDIT_POINT_SELECTION(state, { pointId, inclusive }) {
            if (pointId < 0 || pointId >= state.curveEditing.points.length) {
                return;
            }
            if (inclusive) {
                state.curveEditing.points[pointId].selected = !state.curveEditing.points[pointId].selected;
            } else {
                forEach(state.curveEditing.points, (point, pId) => {
                    point.selected = pId === pointId;
                });
            }
        },
        RESET_CURVE_EDIT_POINT_SELECTION(state) {
            forEach(state.curveEditing.points, point => {
                point.selected = false;
            });
        },
        SELECT_CURVE_EDIT_POINT(state, { pointId, inclusive }) {
            if (pointId < 0 || pointId >= state.curveEditing.points.length) {
                return;
            }
            if (inclusive) {
                state.curveEditing.points[pointId].selected = true;
            } else {
                forEach(state.curveEditing.points, (point, pId) => {
                    point.selected = pId === pointId;
                });
            }
        },


        /* History */
        SET_HISTORY_UNDOABLE(state, isUndoable) {
            state.history.undoable = isUndoable;
        },
        SET_HISTORY_REDOABLE(state, isRedoable) {
            state.history.redoable = isRedoable;
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

            const timeout = config.messages.ttlSeconds * 1000;
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

        GIVE_CONSENT(state) {
            state.consent.hasConsent = true;
        },

        START_ANIMATION_EDITOR(state, framePlayer) {
            state.animationEditor.currentFramePlayer = framePlayer;
        },

        SET_ANIMATION_EDITOR_RECORDING(state, isRecording) {
            state.animationEditor.isRecording = isRecording;
        }
    },

    actions: {
        loadCurrentUser({commit}) {
            // here we are caching the user data so that it does not have to be retrieved over and over again with each page load
            const userData = getVerifiedUserDataFromMyStorage();
            if (userData) {
                commit('SET_CURRENT_USER', userData.user);
            } else {
                commit('SET_IS_LOADING_USER', true);
                apiClient.getCurrentUser().then(user => {
                    commit('SET_IS_LOADING_USER', false);
                    saveUserInMyStorage(user);
                    commit('SET_CURRENT_USER', user);
                })
                .catch(err => {
                    if (err.response) {
                        if (err.response.status >= 400 && err.response.status < 500) {
                            commit('SET_IS_LOADING_USER', false);
                        }
                    }
                });
            }
        },
        setCurrentUser({commit}, user) {
            saveUserInMyStorage(user);
            commit('SET_CURRENT_USER', user);
        },

        markSchemeAsModified({commit}) {
            commit('SET_SCHEME_MODIFIED', true);
        },
        markSchemeAsUnmodified({commit}) {
            commit('SET_SCHEME_MODIFIED', false);
        },

        setCurveEditItem({commit}, item) {
            const points = [];
            if (item) {
                forEach(item.shapeProps.points, (point, pointId) => {
                    const p = utils.clone(point);
                    p.id = pointId;
                    p.selected = false;
                    enrichCurvePoint(p);
                    points.push(p);
                });
            }
            commit('SET_CURVE_EDIT_ITEM', {item, points});
        },
        updateCurveEditPoint({ commit }, { pointId, point }) {
            commit('UPDATE_CURVE_EDIT_POINT', { pointId, point });
        },
        toggleCurveEditPointSelection({ commit }, { pointId, inclusive }) {
            commit('TOGGLE_CURVE_EDIT_POINT_SELECTION', { pointId, inclusive });
        },
        resetCurveEditPointSelection({ commit }) {
            commit('RESET_CURVE_EDIT_POINT_SELECTION');
        },
        selectCurveEditPoint({ commit }, { pointId, inclusive }) {
            commit('SELECT_CURVE_EDIT_POINT', { pointId, inclusive });
        },

        
        setHistoryUndoable({commit}, isUndoable) {
            commit('SET_HISTORY_UNDOABLE', isUndoable);
        },
        
        setHistoryRedoable({commit}, isRedoable) {
            commit('SET_HISTORY_REDOABLE', isRedoable);
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

        giveConsent({commit}) {
            commit('GIVE_CONSENT');
        },

        startAnimationEditor({commit}, framePlayer) {
            commit('START_ANIMATION_EDITOR', framePlayer);
        },

        setAnimationEditorRecording({commit}, isRecording) {
            commit('SET_ANIMATION_EDITOR_RECORDING', isRecording);
        }
    },

    getters: {
        isLoadingUser: state => state.isLoadingUser,
        currentUser: state => state.currentUser,

        schemeModified: state => state.schemeModified,
        
        itemControlPointsList: state => state.itemControlPoints,
        
        curveEditPoints: state => state.curveEditing.points,

        firstSelectedCurveEditPoint: state => find(state.curveEditing.points, p => p.selected),

        multiSelectBox: state => state.multiSelectBox,

        horizontalSnapper: state => state.snappers.horizontal,
        verticalSnapper: state => state.snappers.vertical,

        shouldSnapToGrid: state => state.snap.grid,
        shouldSnapToItems: state => state.snap.items,

        autoRemount: state => state.autoRemount,

        connectorProposedDestination: state => state.connectorProposedDestination,

        statusMessage: state => state.statusMessage,

        selectedConnectorPath: state => state.selectedConnectorPath,

        systemMessages: state => state.systemMessages,

        drawEpsilon: state => state.draw.epsilon,

        editorStateName: state => state.editorStateName,

        hasConsent: state => state.consent.hasConsent,

        animationEditorCurrentFramePlayer: state => state.animationEditor.currentFramePlayer,

        animationEditorIsRecording: state => state.animationEditor.isRecording,
    }
});

export default store;