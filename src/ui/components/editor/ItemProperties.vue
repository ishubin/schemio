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
                    <a class="link" :href="link.url" target="_blank">
                       <i v-if="link.type === 'graphs'" class="fas fa-chart-line"></i>
                       <i v-if="link.type === 'logs'" class="fas fa-stream"></i>
                       <i v-if="link.type === 'scheme'" class="fas fa-project-diagram"></i>
                       <i v-if="link.type === 'default'" class="fas fa-link"></i>

                        {{link.title}}
                    </a>
                    <span class="link edit-link" @click="editLink(linkId, link)"><i class="fas fa-pen-square"></i></span>
                    <span class="link delete-link" @click="deleteLink(linkId)"><i class="fas fa-times"></i></span>
                </li>
            </ul>
            <span class="btn btn-secondary" v-on:click="addLink()"><i class="fas fa-link"></i> Add</span>
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
            <div class="property-row" v-if="item.style.stroke && item.style.stroke.color">
                <color-picker :color="item.style.stroke.color" @input="item.style.stroke.color = arguments[0]"></color-picker>
                <span class="property-label">Stroke color</span>
            </div>
        </panel>

        <link-edit-popup v-if="editLinkData"
            :edit="editLinkData.edit" :title="editLinkData.title" :url="editLinkData.url" :type="editLinkData.type"
            @submit-link="onLinkSubmit"
            @close="editLinkData = null"/>
    </div>
</template>

<script>
import LinkEditPopup from './LinkEditPopup.vue';
import EventBus from './EventBus.js';
import ColorPicker from './ColorPicker.vue';
import VueTagsInput from '@johmun/vue-tags-input';
import Panel from './Panel.vue';
import _ from 'lodash';


export default {
    props: ['item'],
    components: {LinkEditPopup, ColorPicker, VueTagsInput, Panel},
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
                url: '',
                type: ''
            };
        },
        deleteLink(linkId) {
            this.item.links.splice(linkId, 1);
        },
        editLink(linkId, link) {
            this.editLinkData = {
                linkId: linkId,
                edit: true,
                title: link.title,
                url: link.url,
                type: link.type
            };
        },
        onLinkSubmit(link) {
            if (this.editLinkData.linkId >= 0) {
                this.item.links[this.editLinkData.linkId].title = link.title;
                this.item.links[this.editLinkData.linkId].url = link.url;
                this.item.links[this.editLinkData.linkId].type = link.type;
            } else {
                if (!this.item.links) {
                    this.item.links = [];
                }
                this.item.links.push({
                    title: link.title,
                    url: link.url,
                    type: link.type
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
