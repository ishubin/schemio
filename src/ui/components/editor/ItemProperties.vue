<template lang="html">
    <div class="item-properties">
        <panel name="General">
            <div  v-if="item.type !== 'comment'">
                <h5>Name</h5>
                <input class="textfield" type="text" v-model="item.name"/>
            </div>

            <div v-if="item.type === 'overlay' || item.type === 'component'">
                <h5>Tags</h5>
                <vue-tags-input v-model="itemTag"
                    :tags="itemTags"
                    :autocomplete-items="filteredItemTags"
                    @tags-changed="onItemTagChange"
                    ></vue-tags-input>
            </div>

            <h5 class="section">Description</h5>
            <textarea v-model="item.description"></textarea>
        </panel>

        <panel name="Image" v-if="item.type === 'image'">
            <h5>Image URL</h5>
            <input class="textfield" type="text" v-model="item.url"/>
        </panel>

        <panel name="Links" v-if="item.type === 'overlay' || item.type === 'component'">
            <div v-if="!item.links || item.links.length === 0">There are no links</div>

            <ul class="links">
                <li v-for="(link, linkId) in item.links">
                    <a class="link" :href="link.url" target="_blank">{{link.title}}</a>
                    <span class="link delete-link" @click="editLink(linkId, link)"><i class="fas fa-pen-square"></i></span>
                </li>
            </ul>
            <span class="link" v-on:click="addLink()"><i class="fas fa-link"></i> add link</span>
        </panel>

        <panel name="Style" v-if="item.type !== 'image'">
            <div class="property-row" v-if="item.style.background && item.style.background.color">
                <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]"></color-picker>
                <span class="property-label">Background</span>
            </div>
            <div class="property-row" v-if="item.style.text && item.style.text.color">
                <color-picker :color="item.style.text.color" @input="item.style.text.color = arguments[0]"></color-picker>
                <span class="property-label">Text color</span>
            </div>
        </panel>

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
import VueTagsInput from '@johmun/vue-tags-input';
import Panel from './Panel.vue';
import _ from 'lodash';


export default {
    props: ['item', 'mode'],
    components: {LinkEditPopup, VueMarkdown, ColorPicker, VueTagsInput, Panel},
    data() {
        return {
            backgroundColor: {hex: '#ffffff'},
            toggleBackgroundColor: false,
            editLinkData: null,
            itemTag: '',

            //TODO move into indexed tags
            existingItemTags: [{text: 'Load Balancer'}, {text: 'Java'}, {text: 'Scalatra'}],
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
        },
        onItemTagChange(newTags) {
            this.item.tags = _.map(newTags, tag => tag.text);
        }
    },
    computed: {
        filteredItemTags() {
            return this.existingItemTags.filter(i => new RegExp(this.itemTag, 'i').test(i.text));
        },
        itemTags() {
            return _.map(this.item.tags, tag => {return {text: tag}});
        }
    },
    watch: {
       item: {
           handler: function(newValue) {
               this.$forceUpdate();
               EventBus.$emit(EventBus.REDRAW);
           },
           deep: true
       }
   }
}
</script>

<style lang="css">
</style>
