import Vue from 'vue';
import Vuex from 'vuex';
import apiClient from '../apiClient';
import forEach from 'lodash/forEach';
import utils from '../utils';

Vue.use(Vuex);

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

        // stores the state of the history in scheme editing
        history: {
            undoable: false,
            redoable: false
        },

        grid: {
            snap: true
        },

        itemSurround: {
            padding: 40
        },

        itemControlPoints: [],
    },
    mutations: {
        SET_CURRENT_USER(state, user) {
            state.currentUser = user;
        },
        SET_SCHEME_MODIFIED(state, isModified) {
            state.schemeModified = isModified;
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
            state.grid.snap = enabled;
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
        }
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
        }
    },
    getters: {
        currentUser: state => state.currentUser,
        schemeModified: state => state.schemeModified,
        
        itemControlPointsList: state => state.itemControlPoints,
        
        curveEditPoints: state => state.curveEditing.points,
    }
});

export default store;