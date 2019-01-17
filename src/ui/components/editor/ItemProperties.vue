<template lang="html">
    <div class="item-properties">
        <panel name="General">
            <ul class="button-group">
                <li>
                    <span class="toggle-button" @click="toggleItemLock()"
                        :class="{'toggled': item.locked}"
                        >
                        <i class="fas" :class="[item.locked ? 'fa-lock' : 'fa-unlock']"></i>
                    </span>
                </li>
            </ul>
            <div  v-if="item.type !== 'comment'">
                <h5>Name</h5>
                <input class="textfield" type="text" v-model="item.name"/>
            </div>

            <div v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape'">
                <h5>Tags</h5>
                <vue-tags-input v-model="itemTag"
                    :tags="itemTags"
                    :autocomplete-items="filteredItemTags"
                    @tags-changed="onItemTagChange"
                    ></vue-tags-input>
            </div>

            <h5 class="section">Description</h5>
            <div class="textarea-wrapper">
                <textarea v-model="item.description"></textarea>
                <span class="textarea-enlarge" @click="showDescriptionInPopup = true"><i class="fas fa-expand"></i></span>

                <markdown-editor-popup v-if="showDescriptionInPopup"
                    :text="item.description"
                    @close="showDescriptionInPopup = false"
                    @changed="item.description = arguments[0]"
                    />
            </div>
        </panel>

        <panel name="Image" v-if="item.type === 'image'">
            <h5>Image URL</h5>

            <table width="100%">
                <tbody>
                    <tr>
                        <td>
                            <input class="textfield" type="text" v-model="item.url"/>
                        </td>
                        <td width="34px">
                            <div class="file-upload-button">
                                <i class="fas fa-file-upload icon"></i>
                                <input type="file" @change="uploadImage"/>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </panel>

        <panel name="Links" v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape' ">
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

        <panel name="Connections" v-if="item.type === 'overlay' || item.type === 'component' || item.type === 'shape' || item.type === 'comment'">
            <span class="btn btn-secondary" v-on:click="connectItem()"><i class="fas fa-sitemap"></i> Connect</span>
        </panel>

        <panel name="Properties" v-if="item.type === 'component'">
            <p>You can write one property per line</p>
            <textarea v-model="item.properties"></textarea>
        </panel>

        <panel name="Style" v-if="item.type !== 'image'">
            <div class="property-row" v-if="item.type === 'component'">
                <span class="property-label">Shape: </span>
                <select v-model="item.style.shape">
                    <option v-for="componentShape in knownComponentShapes">{{componentShape}}</option>
                </select>
            </div>

            <div class="property-row" v-if="item.style.background && item.style.background.color">
                <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Background</span>
            </div>
            <div class="property-row" v-if="item.style.text && item.style.text.color">
                <color-picker :color="item.style.text.color" @input="item.style.text.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Text color</span>
            </div>
            <div class="property-row" v-if="item.style.stroke && item.style.stroke.color">
                <color-picker :color="item.style.stroke.color" @input="item.style.stroke.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Stroke color</span>
            </div>

            <div v-if="item.type === 'component'">
                <div class="property-row">
                    <color-picker :color="item.style.properties.background.color" @input="item.style.properties.background.color = arguments[0]; redrawItem();"></color-picker>
                    <span class="property-label">Properties background</span>
                </div>
                <div class="property-row">
                    <color-picker :color="item.style.properties.text.color" @input="item.style.properties.text.color = arguments[0]; redrawItem();"></color-picker>
                    <span class="property-label">Properties text</span>
                </div>

                <div class="property-row">
                    <span class="property-label">Stroke size: </span>
                    <input type="text" v-model="item.style.stroke.size"/>
                </div>
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
import apiClient from '../../apiClient.js';
import MarkdownEditorPopup from '../MarkdownEditorPopup.vue';
import _ from 'lodash';


export default {
    props: ['item'],
    components: {LinkEditPopup, ColorPicker, VueTagsInput, Panel, MarkdownEditorPopup},
    mounted() {
        apiClient.getTags().then(tags => {
            this.existingItemTags = _.map(tags, tag => {
                return {text: tag};
            });
        });
    },
    data() {
        return {
            toggleBackgroundColor: false,
            editLinkData: null,
            itemTag: '',
            knownComponentShapes: ['component', 'ellipse'],
            showDescriptionInPopup: false,
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
        },

        toggleItemLock() {
            if (this.item.locked) {
                this.item.locked = false;
            } else {
                this.item.locked = true;
            }
            this.$forceUpdate();
        },

        connectItem() {
            EventBus.$emit(EventBus.START_CONNECTING_ITEM, this.item);
        },

        uploadImage(event) {
            var file = event.target.files[0];
            if (file) {
                var form = new FormData();
                form.append('image', file, file.name);
                axios.post('/api/images', form).then(response => {
                    if (this.item) {
                        this.item.url = response.data.path;
                    }
                });
            }
        },

        redrawItem() {
            EventBus.$emit(EventBus.REDRAW_ITEM, this.item);
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
