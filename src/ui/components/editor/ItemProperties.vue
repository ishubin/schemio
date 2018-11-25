<template lang="html">
    <div class="">
        <h3>{{item.name}}</h3>

        <h5>Links</h5>
        <div v-if="!item.links || item.links.length === 0">There are no links</div>
        <ul class="links">
            <li v-for="(link, linkId) in item.links">
                <a class="link" :href="link.url" target="_blank">{{link.title}}</a>
                <span class="link" @click="editLink(linkId, link)">Edit</span>
            </li>
        </ul>
        <span class="link" v-on:click="addLink()">+ add link</span>

        <h5>Description</h5>
        <p class="description">{{item.description}}</p>

        <link-edit-popup v-if="editLinkData"
            :edit="editLinkData.edit" :title="editLinkData.title" :url="editLinkData.url"
            @submit-link="onLinkSubmit"
            @close="editLinkData = null"/>
    </div>
</template>

<script>
import LinkEditPopup from './LinkEditPopup.vue';

export default {
    props: ['item'],
    components: {LinkEditPopup},
    data() {
        return {
            editLinkData: null
        };
    },
    methods: {
        addLink() {
            this.editLinkData = {
                linkId: -1,
                edit: false,
                title: '',
                url: ''
            };
        },
        editLink(linkId, link) {
            this.editLinkData = {
                linkId: linkId,
                edit: true,
                title: link.title,
                url: link.url
            };
        },
        onLinkSubmit(link) {
            if (this.editLinkData.linkId >= 0) {
                this.item.links[this.editLinkData.linkId].title = link.title;
                this.item.links[this.editLinkData.linkId].url = link.url;
            } else {
                if (!this.item.links) {
                    this.item.links = [];
                }
                this.item.links.push({
                    type: '',
                    title: link.title,
                    url: link.url
                });
            }
            this.$emit('link-update');
        }
    }
}
</script>

<style lang="css">
</style>
