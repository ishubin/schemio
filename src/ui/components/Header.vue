<template lang="html">
    <div class="header">
        <div class="header-caption">
            <a href="/">Schemio</a>
        </div>
        <ul>
            <li>
                <span @click="openNewSchemePopup"><i class="far fa-file-alt"></i> New Scheme</span>
            </li>
            <li>
                <a href="/search"><i class="fas fa-search"></i> Search</a>
            </li>
        </ul>

        <div class="top-right-panel">
            <div v-if="user">
                <a href="/user/logout">Logout</a>
            </div>
            <div v-else>
                <a :href="'/login?redirect=' + originalUrlEncoded">Login</a>
            </div>
        </div>

        <create-new-scheme-modal v-if="newSchemePopup.show" :categories="newSchemePopup.categories"
            @close="newSchemePopup.show = false"
            @scheme-created="openNewSchemePopupSchemeCreated"
            ></create-new-scheme-modal>
    </div>
</template>

<script>
import apiClient from '../apiClient.js';
import CreateNewSchemeModal from '../components/CreateNewSchemeModal.vue';

export default {
    props: {
        category: {
            type: Object,
            default: null
        }
    },

    components: {CreateNewSchemeModal},

    mounted() {
        this.loadCurrentUser();
    },
    data() {
        return {
            originalUrlEncoded: encodeURIComponent(window.location),
            user: null,
            newSchemePopup: {
                categories: [],
                show: false
            }
        };
    },
    methods: {
        loadCurrentUser() {
            apiClient.getCurrentUser().then(user => {
                this.user = user;
            });
        },

        openNewSchemePopup() {
            if (this.category && this.category.id) {
                var categories = _.map(this.category.ancestors, ancestor => {
                    return {name: ancestor.name, id: ancestor.id};
                });

                categories.push({
                    name: this.category.name,
                    id: this.category.id
                });
                this.newSchemePopup.categories = categories;
            } else {
                this.newSchemePopup.categories = [];
            }
            this.newSchemePopup.show = true;
        },

        openNewSchemePopupSchemeCreated(scheme) {
            this.newSchemePopup.show = false;
            window.location.href = `/schemes/${scheme.id}`;
        }
    }
}
</script>

<style lang="css">
</style>
