<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="create-item-menu">
        <panel name="General">
            <div class="item-menu">
                <div v-for="item in generalItems" class="item-container" @click="onItemSelected(item)">
                    <svg v-if="item.shapeComponent" width="40px" height="40px">
                        <component :is="item.shapeComponent" :item="item.item"></component>
                    </svg>
                    <span>{{item.name}}</span>
                </div>
            </div>
        </panel>

        <panel name="Art">
            <div class="item-menu">
                <div class="item-container"
                    v-for="art in artList"
                    @click="onArtSelected(art)">
                    <img width="60px" height="60px" :src="art.url"/>
                    <span>{{art.name}}</span>
                </div>
            </div>
        </panel>

        <create-image-modal v-if="createImageModalShown" @close="createImageModalShown = false" @submit-image="startCreatingImage(arguments[0])"></create-image-modal>

        <custom-art-upload-modal v-if="customArtUploadModalShown" @close="customArtUploadModalShown = false" @art-created="onArtCreated"/>

        <modal title="Error" v-if="errorMessage" @close='errorMessage = null'>
            {{errorMessage}}
        </modal>

    </div>
</template>

<script>
import EventBus from './EventBus.js';
import CreateImageModal from './CreateImageModal.vue';
import CustomArtUploadModal from './CustomArtUploadModal.vue';
import Panel from './Panel.vue';
import Modal from '../Modal.vue';
import shortid from 'shortid';
import apiClient from '../../apiClient.js';
import _ from 'lodash';
import utils from '../../../ui/utils.js';
import generalItems from './item-menu/GeneralItemMenu.js';
import Shape from './items/shapes/Shape.js';


let _selectedImageItem = null;

export default {
    components: {Panel, CreateImageModal, Modal, CustomArtUploadModal},
    mounted() {
        this.reloadArt();
    },
    data() {
        return {
            createImageModalShown: false,
            customArtUploadModalShown: false,
            menu: 'main',
            artList: [],
            artSearchKeyword: '',
            errorMessage: null,
            generalItems: this.prepareItemsForMenu(generalItems)
        }
    },
    methods: {

        /**
         * Enriches item with defaults of its shape
         */
        prepareItemsForMenu(items) {
            return _.map(items, item => {
                item.item.area = {x: 3, y: 3, w: 37, h: 37};
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
            apiClient.getAllArt().then(artList => {
                this.artList = artList;
            });
        },

        onArtCreated(art) {
            this.artList.push(art);
            this.customArtUploadModalShown = false;
        },

        onArtSelected(art) {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                interactive: false,
                opacity: 1.0,
                blendMode: 'normal',
                name: '',
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
                _selectedImageItem = utils.clone(item);
                this.createImageModalShown = true;
            } else {
                const newItem = utils.clone(item.item);
                newItem.id = shortid.generate();
                newItem.area = { x: 0, y: 0, w: 0, h: 0 };
                EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
            }
        },

        clickImage() {
            this.createImageModalShown = true;
        },

        startCreatingImage(imageUrl) {
            this.createImageModalShown = false;
            var img = new Image();
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    const newItem = utils.clone(_selectedImageItem.item);
                    newItem.id = shortid.generate();
                    newItem.area = { x: 0, y: 0, w: 0, h: 0 };

                    utils.setObjectProperty(newItem, _selectedImageItem.imageProperty, imageUrl);
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
