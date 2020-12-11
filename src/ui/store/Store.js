import Vue from 'vue';
import Vuex from 'vuex';
import apiClient from '../apiClient';

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        currentUser: null,
        schemeModified: false,

        curveEditing: {
            autoAttachEnabled: true
        }
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
    },
    getters: {
        currentUser: state => state.currentUser,
        schemeModified: state => state.schemeModified,
        curveEditAutoAttachEnabled: state => state.curveEditing.autoAttachEnabled
    }
});

export default store;