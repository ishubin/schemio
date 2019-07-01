<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="create-item-menu">
        <div class="item-menu" v-if="menu === 'main'">
            <div class="item-container" @click="clickComponent">
                <i class="fab fa-elementor"></i>
                <span>Component</span>
            </div>

            <div class="item-container" @click="clickEllipse">
                <i class="fas fa-circle"></i>
                <span>Ellipse</span>
            </div>

            <div class="item-container" @click="clickOverlay">
                <i class="fas fa-layer-group"></i>
                <span>Overlay</span>
            </div>

            <div class="item-container" @click="menu = 'art'">
                <i class="fas fa-splotch"></i>
                <span>Art</span>
            </div>

            <div class="item-container" @click="clickImage">
                <i class="fas fa-image"></i>
                <span>Image</span>
            </div>

            <div class="item-container" @click="clickComment">
                <i class="fas fa-comment-alt"></i>
                <span>Comment</span>
            </div>

            <div class="item-container" @click="clickText">
                <i class="fas fa-font"></i>
                <span>Text</span>
            </div>
        </div>

        <div class="item-menu" v-if="menu === 'art'">
            <div>
                <span class="link" @click="menu = 'main'"><i class="fas fa-angle-left"></i> Back</span>
            </div>

            <table width="100%">
                <tbody>
                    <tr>
                        <td>
                            <input type="text" class="textfield" v-model="artSearchKeyword" placeholder="Search..."/>
                        </td>
                        <td width="34px">
                            <span class="btn btn-primary" @click="customArtUploadModalShown = true" title="Upload art"> <i class="fas fa-upload"></i> </span>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="item-container"
                v-for="art in filteredArtList"
                @click="clickArt(art)">
                <img width="60px" height="60px" :src="art.url"/>
                <span>{{art.name}}</span>
            </div>
        </div>

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
import Modal from '../Modal.vue';
import shortid from 'shortid';
import apiClient from '../../apiClient.js';
import _ from 'lodash';

export default {
    components: {CreateImageModal, Modal, CustomArtUploadModal},
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
            errorMessage: null
        }
    },
    computed: {
        filteredArtList() {
            return _.filter(this.artList, a => a.name.indexOf(this.artSearchKeyword) >= 0);
        }
    },
    methods: {
        reloadArt() {
            apiClient.getAllArt().then(artList => {
                this.artList = artList;
            });
        },

        onArtCreated(art) {
            this.artList.push(art);
            this.customArtUploadModalShown = false;
        },

        clickComponent() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                area: { x: 0, y: 0, w: 0, h: 0 },
                interactive: false,
                blendMode: 'normal',
                shape: 'rect',
                opacity: 1.0,
                shapeProps: {
                    strokeSize: 5,
                    strokeColor: '#34f',
                    fillColor: '#f00'
                },
                name: '',
                description: '',
                links: []
            });
        },

        clickEllipse() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                area: { x: 0, y: 0, w: 0, h: 0 },
                interactive: false,
                blendMode: 'normal',
                shape: 'ellipse',
                opacity: 1.0,
                shapeProps: {
                    strokeSize: 5,
                    strokeColor: '#34f',
                    fillColor: '#f00'
                },
                name: '',
                description: '',
                links: []
            });
        },

        clickOverlay() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                area: { x: 0, y: 0, w: 0, h: 0 },
                interactive: true,
                blendMode: 'normal',
                shape: 'rect',
                opacity: 0.2,
                shapeProps: {
                    strokeSize: 1,
                    strokeColor: '#000',
                    fillColor: '#fff'
                },
                behavior: [ {
                    on: {
                        originator: 'self',
                        event: 'mousein', // simulates hover event only once when cursor enters element
                        args: []
                    },
                    do: [{
                        item: 'self',
                        method: 'set',
                        args: ['opacity', 0.5]
                    }]
                }, {
                    on: {
                        originator: 'self',
                        event: 'mouseout',
                        args: []
                    },
                    do: [{
                        item: 'self',
                        method: 'set',
                        args: ['opacity', 0.1]
                    }]
                } ],
                name: '',
                description: '',
                links: []
            });
        },

        clickText() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                interactive: false,
                blendMode: 'normal',
                area: { x: 0, y: 0, w: 0, h: 0 },
                shape: 'none',
                shapeProps: {
                },
                name: '',
                description: '',
                text: 'Text ...',
                links: []
            });
        },

        clickComment() {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                interactive: false,
                blendMode: 'normal',
                area: { x: 0, y: 0, w: 0, h: 0 },
                shape: 'comment',
                shapeProps: { },
                name: '',
                description: '',
                text: 'Leave a comment ...',
                links: []
            });
        },

        clickArt(art) {
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                id: shortid.generate(),
                interactive: false,
                shape: 'rect',
                blendMode: 'normal',
                area: { x: 0, y: 0, w: 0, h: 0},
                shapeProps: {
                    backgroundImage: art.url,
                    strokeSize: 0
                },
                name: '',
                description: '',
                text: '',
                links: []
            });
        },

        clickImage() {
            this.createImageModalShown = true;
        },

        startCreatingImage(imageUrl) {
            this.createImageModalShown = false;
            var img = new Image();
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    EventBus.$emit(EventBus.START_CREATING_COMPONENT, {
                        id: shortid.generate(),
                        interactive: false,
                        shape: 'rect',
                        blendMode: 'normal',
                        area: { x: 0, y: 0, w: 0, h: 0},
                        shapeProps: {
                            backgroundImage: imageUrl,
                            strokeSize: 0
                        },
                        name: '',
                        description: '',
                        text: '',
                        links: []
                    });
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
