import Vue from 'vue';
import VueRouter from 'vue-router';
import VueAxios from 'vue-axios';
import axios from 'axios';
import App from './App.vue';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';
import SchemeEditorView from './views/SchemeEditorView.vue';
import SearchView from './views/SearchView.vue';


Vue.use(VueRouter);
Vue.use(VueAxios, axios);

function route(name, path, component) {
    return {
        name: name,
        path: path,
        component: component
    };
}




const routes = [
    route('Home', '/', HomeView),
    route('Login', '/login', LoginView),
    route('SchemeEditorView', '/schemes/:schemeId', SchemeEditorView),
    route('Search', '/search', SearchView)
];


const router = new VueRouter({ mode: 'history', routes: routes });

new Vue(Vue.util.extend({ router }, App)).$mount('#app');
