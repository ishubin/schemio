import Vue from 'vue';
import Vuex from 'vuex';
import apiClient from '../apiClient';
import forEach from 'lodash/forEach';
import utils from '../utils';
import LimitedSettingsStorage from '../LimitedSettingsStorage';
import { setState } from 'expect';

Vue.use(Vuex);

const settingsStorage = new LimitedSettingsStorage(window.localStorage, 'store', 100);

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
        currentUser: null,
        schemeModified: false,


        editorStateName: 'interact',

        curveEditing: {
            // item whose curve is currently edited
            item: null,
            points: []
        },

        itemCreating: {
            autoRemount: true
        },

        // stores the state of the history in scheme editing
        history: {
            undoable: false,
            redoable: false
        },

        snap: {
            grid: settingsStorage.get('snap.grid', false),
            items: settingsStorage.get('snap.items', true),
        },

        itemSurround: {
            padding: 40
        },

        itemControlPoints: [],

        multiSelectBox: null,

        // used to render snapping lines when user drags item and it is snapped to other items
        snappers: {
            horizontal: null,
            vertical: null,
        }
    },
    mutations: {
        SET_CURRENT_USER(state, user) {
            state.currentUser = user;
        },
        SET_SCHEME_MODIFIED(state, isModified) {
            state.schemeModified = isModified;
        },

        SET_ITEM_CREATING_AUTO_REMOUNT(state, autoRemount) {
            state.itemCreating.autoRemount = autoRemount;
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
            settingsStorage.save('snap.grid', enabled);
        },
        SET_ITEM_SNAP(state, enabled) {
            state.snap.items = enabled;
            settingsStorage.save('snap.items', enabled);
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

        UPDATE_ITEM_CONTROL_POINT(state, { pointId, point }) {
            // this is called when user drags control point of an item
            for (let i = 0; i < state.itemControlPoints.length; i++) {
                if (state.itemControlPoints[i].id === pointId) {
                    forEach(point, (value, arg) => {
                        state.itemControlPoints[i].point[arg] = value;
                    })
                    return;
                }
            }
        },
        SET_MULTI_SELECT_BOX(state, box) {
            state.multiSelectBox = box;
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
    },
    actions: {
        loadCurrentUser({commit}) {
            apiClient.getCurrentUser().then(user => {
                commit('SET_CURRENT_USER', user);
            });
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

        updateItemControlPoint({commit}, { pointId, point }) {
            commit('UPDATE_ITEM_CONTROL_POINT', { pointId, point });
        },
        clearItemControlPoints({commit}) {
            commit('CLEAR_ITEM_CONTROL_POINTS');
        },

        setMultiSelectBox({commit}, box) {
            commit('SET_MULTI_SELECT_BOX', box);
        },

        setItemSnapper({commit}, snapper) {
            commit('SET_ITEM_SNAPPER', snapper);
        },
        clearItemSnappers({commit}) {
            commit('CLEAR_ITEM_SNAPPERS');
        },

        setItemCreatingAutoRemount({commit}, autoRemount) {
            commit('SET_ITEM_CREATING_AUTO_REMOUNT', autoRemount);
        }
    },
    getters: {
        currentUser: state => state.currentUser,
        schemeModified: state => state.schemeModified,
        
        itemControlPointsList: state => state.itemControlPoints,
        
        curveEditPoints: state => state.curveEditing.points,

        multiSelectBox: state => state.multiSelectBox,

        horizontalSnapper: state => state.snappers.horizontal,
        verticalSnapper: state => state.snappers.vertical,

        shouldSnapToGrid: state => state.snap.grid,
        shouldSnapToItems: state => state.snap.items,

        itemCreatingAutoRemount: state => state.itemCreating.autoRemount,
    }
});

export default store;