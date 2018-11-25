<template lang="html">
    <div class="">
        <h3>{{item.name}}</h3>

        <h5>Links</h5>
        <div v-if="!item.links || item.links.length === 0">There are no links</div>
        <ul class="links">
            <li v-for="link in item.links">
                <a class="link" :href="link.url" target="_blank">{{link.title}}</a>
            </li>
        </ul>
        <span class="link" v-on:click="addLink()">+ add link</span>

        <h5>Description</h5>
        <p class="description">{{item.description}}</p>

        <link-edit-popup v-if="editLink"
            :edit="editLink.edit" :title="editLink.title" :url="editLink.url"
            @submit-link="onLinkSubmit"
            @close="editLink = null"/>
    </div>
</template>

<script>
import LinkEditPopup from './LinkEditPopup.vue';

export default {
    props: ['item'],
    components: {LinkEditPopup},
    data() {
        return {
            editLink: null
        };
    },
    methods: {
        addLink() {
            this.editLink = {
                edit: false,
                title: '',
                url: ''
            };

            this.$emit('link-update');
        },
        onLinkSubmit(link) {
            if (!this.item.links) {
                this.item.links = [];
            }
            this.item.links.push({
                type: '',
                title: link.title,
                url: link.url
            });
        }
    }
}
</script>

<style lang="css">
</style>
