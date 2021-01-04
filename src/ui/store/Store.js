import Vue from 'vue';
import Vuex from 'vuex';
import apiClient from '../apiClient';
import forEach from 'lodash/forEach';

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        currentUser: null,
        schemeModified: false,


        editorStateName: 'interact',

        curveEditing: {
            autoAttachEnabled: true,
            // item whose curve is currently edited
            item: null
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

        itemControlPoints: []
    },
    mutations: {
        SET_CURRENT_USER(state, user) {
            state.currentUser = user;
        },
        SET_SCHEME_MODIFIED(state, isModified) {
            state.schemeModified = isModified;
        },
        SET_CURVE_EDIT_AUTO_ATTACH(state, isEnabled) {
            state.curveEditing.autoAttachEnabled = isEnabled;
        },
        SET_CURVE_EDIT_ITEM(state, item) {
            state.curveEditing.item = item;
        },
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

        enableCurveEditAutoAttach({commit}) {
            commit('SET_CURVE_EDIT_AUTO_ATTACH', true);
        },

        disableCurveEditAutoAttach({commit}) {
            commit('SET_CURVE_EDIT_AUTO_ATTACH', false);
        },

        setCurveEditItem({commit}, item) {
            commit('SET_CURVE_EDIT_ITEM', item);
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
        curveEditAutoAttachEnabled: state => state.curveEditing.autoAttachEnabled,
        
        itemControlPointsList: state => state.itemControlPoints,
    }
});

export default store;