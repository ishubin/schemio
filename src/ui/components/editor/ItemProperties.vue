<template lang="html">
    <div class="item-properties">
        <div v-if="mode !== 'edit'">
            <h3>{{item.name}}</h3>
        </div>
        <div v-else>
            <input type="text" v-model="item.name"/>
        </div>

        <div v-if="mode === 'edit'">
            <h5 class="section">General</h5>

            <div class="property-row" v-if="item.background && item.background.color">
                <span class="property-label">Background:</span>
                <!-- <input class="property-textfield" type="text" v-model="item.background.color"/> -->
                <color-picker :color="item.background.color" @input="item.background.color = arguments[0]"></color-picker>
            </div>
        </div>

        <h5 class="section">Links</h5>
        <div v-if="!item.links || item.links.length === 0">There are no links</div>
        <ul class="links">
            <li v-for="(link, linkId) in item.links">
                <a class="link" :href="link.url" target="_blank">{{link.title}}</a>
                <span class="link" @click="editLink(linkId, link)">Edit</span>
            </li>
        </ul>
        <span class="link" v-on:click="addLink()">+ add link</span>

        <h5 class="section">Description</h5>
        <div v-if="mode !== 'edit'">
            <vue-markdown>{{item.description}}</vue-markdown>
        </div>
        <div v-else>
            <textarea v-model="item.description"></textarea>
        </div>

        <link-edit-popup v-if="editLinkData"
            :edit="editLinkData.edit" :title="editLinkData.title" :url="editLinkData.url"
            @submit-link="onLinkSubmit"
            @close="editLinkData = null"/>
    </div>
</template>

<script>
import LinkEditPopup from './LinkEditPopup.vue';
import EventBus from './EventBus.js';
import VueMarkdown from 'vue-markdown';
import ColorPicker from './ColorPicker.vue';

export default {
    props: ['item', 'mode'],
    components: {LinkEditPopup, VueMarkdown, ColorPicker},
    data() {
        return {
            backgroundColor: {hex: '#ffffff'},
            toggleBackgroundColor: false,
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
    },
    watch: {
       item: {
           handler: function(newValue) {
               EventBus.$emit(EventBus.REDRAW);
           },
           deep: true
       }
   }
}
</script>

<style lang="css">
</style>
