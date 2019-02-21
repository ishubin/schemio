import Vue from 'vue';
import VueRouter from 'vue-router';
import VueAxios from 'vue-axios';
import axios from 'axios';
import App from './App.vue';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';
import SchemeEditorView from './views/SchemeEditorView.vue';


Vue.use(VueRouter);
Vue.use(VueAxios, axios);

function _route(name, path, component) {
    return {
        name: name,
        path: path,
        component: component
    };
}




const routes = [
    _route('Home', '/', HomeView),
    _route('Home', '/login', LoginView),
    _route('SchemeEditorView', '/schemes/:schemeId', SchemeEditorView)
];


const router = new VueRouter({ mode: 'history', routes: routes });

new Vue(Vue.util.extend({ router }, App)).$mount('#app');
