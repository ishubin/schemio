<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="create-item-menu">

        <input type="text" class="textfield" placeholder="Search..." v-model="searchKeyword"/>

        <panel v-for="panel in itemPanels" :name="panel.name">
            <div class="item-menu">
                <div v-for="item in panel.items"  v-if="!searchKeyword || item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) >=0"   :title="item.name" class="item-container" @click="onItemSelected(item)">
                    <svg v-if="item.svg" width="40px" height="30px" v-html="item.svg"></svg>
                    <svg v-if="!item.svg && item.shapeComponent" width="40px" height="30px">
                        <g :transform="`translate(${item.item.area.x}, ${item.item.area.y})`">
                            <component :is="item.shapeComponent" :item="item.item"></component>
                        </g>
                    </svg>
                </div>
            </div>
        </panel>

        <panel name="Project Art">
            <span class="btn btn-primary" @click="customArtUploadModalShown = true" title="Upload art icon"><i class="fas fa-file-upload"></i></span>
            <span class="btn btn-primary" @click="editArtModalShown = true" title="Edit art icons"><i class="fas fa-pencil-alt"></i></span>
            <div class="item-menu">
                <div class="item-container"
                    v-for="art in artList"
                    v-if="!searchKeyword || art.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) >=0"
                    @click="onArtSelected(art)">
                    <img :src="art.url"/>
                </div>
            </div>
        </panel>

        <panel v-for="artPack in artPacks" :name="artPack.name">
            <div class="art-pack">
                <div class="art-pack-author">Created by <a :href="artPack.link">{{artPack.author}}</a></div>
                <div class="item-menu">
                    <div class="item-container"
                        v-for="icon in artPack.icons"
                        v-if="!searchKeyword || icon.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) >=0 || icon.description.toLowerCase().indexOf(searchKeyword.toLowerCase()) >= 0"
                        @click="onArtSelected(icon)">
                        <img :src="icon.url" :title="`${icon.name} ${icon.description}`"/>
                    </div>
                </div>
            </div>
        </panel>

        <create-image-modal v-if="createImageModalShown" :project-id="projectId" @close="createImageModalShown = false" @submit-image="startCreatingImage(arguments[0])"></create-image-modal>

        <custom-art-upload-modal :project-id="projectId" v-if="customArtUploadModalShown" @close="customArtUploadModalShown = false" @art-created="onArtCreated"/>
        <edit-art-modal v-if="editArtModalShown" :project-id="projectId" :art-list="artList" @close="editArtModalShown = false"/>

        <modal title="Error" v-if="errorMessage" @close="errorMessage = null">
            {{errorMessage}}
        </modal>

        <link-edit-popup v-if="linkCreation.popupShown" :edit="false" :project-id="projectId" @submit-link="startCreatingLink" @close="linkCreation.popupShown = false"/>

    </div>
</template>

<script>
import EventBus from './EventBus.js';
import CreateImageModal from './CreateImageModal.vue';
import CustomArtUploadModal from './CustomArtUploadModal.vue';
import EditArtModal from './EditArtModal.vue';
import Panel from './Panel.vue';
import Modal from '../Modal.vue';
import shortid from 'shortid';
import apiClient from '../../apiClient.js';
import _ from 'lodash';
import utils from '../../../ui/utils.js';
import generalItems from './item-menu/GeneralItemMenu.js';
import umlItems from './item-menu/UMLItemMenu.js';
import Shape from './items/shapes/Shape.js';
import LinkEditPopup from './LinkEditPopup.vue';



export default {
    props: ['projectId'],
    components: {Panel, CreateImageModal, Modal, CustomArtUploadModal, EditArtModal, LinkEditPopup},
    beforeMount() {
        this.reloadArt();
    },
    data() {
        return {
            selectedImageItem: null,
            createImageModalShown: false,
            customArtUploadModalShown: false,
            menu: 'main',
            artPacks: [],
            artList: [],
            searchKeyword: '',
            errorMessage: null,

            editArtModalShown: false,

            itemPanels: [{
                name: 'General',
                items: this.prepareItemsForMenu(generalItems)
            }, {
                name: 'UML',
                items: this.prepareItemsForMenu(umlItems)
            }],
            linkCreation: {
                popupShown: false,
                item: null
            }
        }
    },
    methods: {

        /**
         * Enriches item with defaults of its shape
         */
        prepareItemsForMenu(items) {
            return _.map(items, item => {
                item.item.area = {x: 6, y: 6, w: 32, h: 22};
                if (item.item.shape) {
                    const shape = Shape.make(item.item.shape);
                    if (shape.component) {
                        if (shape.args) {
                            if (!item.item.shapeProps) {
                                item.item.shapeProps = {};
                            }
                            _.forEach(shape.args, (shapeArg, shapeArgName) => {
                                if (!item.item.shapeProps.hasOwnProperty(shapeArgName)) {
                                    item.item.shapeProps[shapeArgName] = shapeArg.value;
                                }
                            });
                        }
                        item.shapeComponent = shape.component;
                    }
                }
                return item;
            })
        },
        reloadArt() {
            this.artPacks = [];
            apiClient.getAllArt(this.projectId).then(artList => {
                this.artList = artList;
            });
            apiClient.getGlobalArt().then(globalArt => {
                _.forEach(globalArt, artPack => {
                    _.forEach(artPack.icons, icon => {
                        if (!icon.name) {
                            icon.name = 'Unnamed';
                        }
                        if (!icon.description) {
                            icon.description = '';
                        }
                    })
                });
                this.artPacks = globalArt;
            });
        },

        onArtCreated(art) {
            this.artList.push(art);
            this.customArtUploadModalShown = false;
        },

        onArtSelected(art) {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                cursor: 'default',
                opacity: 1.0,
                blendMode: 'normal',
                name: 'Art',
                description: '',
                text: '',
                links: [],
                shape: 'rect',
                area: { x: 0, y: 0, w: 0, h: 0 },
                shapeProps: {
                    strokeSize: 0,
                    backgroundImage: art.url
                }
            });
        },

        onItemSelected(item) {
            if (item.imageProperty) {
                this.selectedImageItem = utils.clone(item);
                this.createImageModalShown = true;
            } if (item.item.shape === 'link') {
                this.linkCreation.item = utils.clone(item.item);
                this.linkCreation.popupShown = true;
            } else {
                const newItem = utils.clone(item.item);
                newItem.id = shortid.generate();
                newItem.area = { x: 0, y: 0, w: 0, h: 0 };
                newItem.name = item.name;
                EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
            }
        },

        startCreatingLink(link) {
            this.linkCreation.popupShown = false;
            const item = utils.clone(this.linkCreation.item);
            item.shapeProps.url = link.url;
            item.text = link.title;
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, item);
        },

        startCreatingImage(imageUrl) {
            this.createImageModalShown = false;
            var img = new Image();
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    const newItem = utils.clone(this.selectedImageItem.item);
                    newItem.id = shortid.generate();
                    newItem.area = { x: 0, y: 0, w: 0, h: 0 };

                    utils.setObjectProperty(newItem, this.selectedImageItem.imageProperty, imageUrl);
                    EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
                }
                this.createImageModalShown = false;
            };
            img.onerror = () => {
                this.errorMessage = 'Could not load image. Check if the path is correct';
            };
            img.src = imageUrl;
        }
    }
}
</script>

<style lang="css">
</style>
