import Vue from 'vue';
import Vuex from 'vuex';
import apiClient from '../apiClient';

Vue.use(Vuex);

const store = new Vuex.Store({
    state: {
        currentUser: null
    },
    mutations: {
        SET_CURRENT_USER(state, user) {
            state.currentUser = user;
        }
    },
    actions: {
        loadCurrentUser({commit}) {
            apiClient.getCurrentUser().then(user => {
                commit('SET_CURRENT_USER', user);
            });
        }
    },
    getters: {
    }
});

export default store;