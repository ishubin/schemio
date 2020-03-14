<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="create-item-menu">
        <div v-if="currentPanel === 'items'">
            <input type="text" class="textfield" placeholder="Search..." v-model="searchKeyword"/>

            <panel v-for="panel in itemPanels" :name="panel.name">
                <div class="item-menu">
                    <div v-for="item in panel.items"  v-if="!searchKeyword || item.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) >=0" :title="item.name" class="item-container" @mouseleave="stopPreviewItem(item)" @mouseover="showPreviewItem(item)" @click="onItemSelected(item)">
                        <img v-if="item.iconUrl" :src="item.iconUrl" width="42px" height="32px"/>
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
                        @mouseover="showPreviewArt(art)"
                        @mouseleave="stopPreviewArt(art)"
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
                            @mouseover="showPreviewArt(icon)"
                            @mouseleave="stopPreviewArt(icon)"
                            @click="onArtSelected(icon)">
                            <img :src="icon.url" :title="`${icon.name} ${icon.description}`"/>
                        </div>
                    </div>
                </div>
            </panel>
        </div>
        <div v-if="currentPanel === 'styles' && stylesPanel.previewComponent">
            <panel name="Styles">
                <span class="link" @click="switchBackToItemsList()"><i class="fas fa-angle-left"></i> Back</span>
                <span class="link" @click="stylesPanel.isEdit = !stylesPanel.isEdit"><i class="fas fa-edit"></i> Edit</span>
                <ul class="shape-styles-preview">
                    <li v-for="(styleItem, styleItemIndex) in stylesPanel.previewItems">
                        <div class="shape-style" @click="applyStyle(styleItem.shape, styleItem.style)">
                            <span v-if="stylesPanel.isEdit" class="link link-remove-style" @click="removeUserStyle(styleItemIndex)"><i class="fas fa-times"/></span>

                            <svg width="140px" height="100px">
                                <g :transform="`translate(${styleItem.item.area.x}, ${styleItem.item.area.y})`">
                                    <component :is="stylesPanel.previewComponent" :item="styleItem.item"></component>
                                </g>
                            </svg>
                        </div>
                    </li>
                </ul>
            </panel>
        </div>

        <create-image-modal v-if="createImageModalShown" :project-id="projectId" @close="createImageModalShown = false" @submit-image="startCreatingImage(arguments[0])"></create-image-modal>

        <custom-art-upload-modal :project-id="projectId" v-if="customArtUploadModalShown" @close="customArtUploadModalShown = false" @art-created="onArtCreated"/>
        <edit-art-modal v-if="editArtModalShown" :project-id="projectId" :art-list="artList" @close="editArtModalShown = false"/>

        <modal title="Error" v-if="errorMessage" @close="errorMessage = null">
            {{errorMessage}}
        </modal>

        <link-edit-popup v-if="linkCreation.popupShown" :edit="false" :project-id="projectId" @submit-link="startCreatingLink" @close="linkCreation.popupShown = false"/>

        <div v-if="previewItem.shown" class="preview-item">
            <div  class="item-container">
                <div v-if="previewItem.item">
                    <h4>{{previewItem.item.name}}</h4>
                    <svg v-if="previewItem.item.shapeComponent" width="150px" height="120px">
                        <g v-if="previewItem.item.previewItem" :transform="`translate(${previewItem.item.previewItem.area.x}, ${previewItem.item.previewItem.area.y})`">
                            <component :is="previewItem.item.shapeComponent" :item="previewItem.item.previewItem"></component>
                        </g>
                        <g v-else :transform="`translate(${previewItem.item.item.area.x}, ${previewItem.item.item.area.y})`">
                            <component :is="previewItem.item.shapeComponent" :item="previewItem.item.item"></component>
                        </g>
                    </svg>
                </div>
                <div v-if="previewItem.artIcon">
                    <h4>{{previewItem.artIcon.name}}</h4>
                    <img class="preview-art" :src="previewItem.artIcon.url"/>
                </div>

                <div v-if="previewItem.description" class="preview-item-description">{{previewItem.description}}</div>
            </div>
        </div>
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
import recentPropsChanges from '../../history/recentPropsChanges';


// this is used in order to cache user styles on the client side for all shapes
const userStyles = {};


const Panels = {
    Items   : 'items',
    Styles  : 'styles'
};

export default {
    props: ['projectId'],
    components: {Panel, CreateImageModal, Modal, CustomArtUploadModal, EditArtModal, LinkEditPopup},
    beforeMount() {
        this.reloadArt();
        EventBus.$on(EventBus.EDITOR_STATE_CHANGED, this.onEditorStateChanged);
    },
    beforeDestroy() {
        EventBus.$off(EventBus.EDITOR_STATE_CHANGED, this.onEditorStateChanged);
    },
    data() {
        return {
            currentEditorState          : null,
            selectedImageItem           : null,
            createImageModalShown       : false,
            customArtUploadModalShown   : false,
            menu                        : 'main',
            artPacks                    : [],
            artList                     : [],
            searchKeyword               : '',
            errorMessage                : null,

            editArtModalShown           : false,
            
            // may be 'items' or 'styles'
            currentPanel                : Panels.Items,
            stylesPanel: {
                userStyles          : userStyles,
                currentShape        : 'rect',
                isEdit              : false,
                previewItems        : null,
                previewComponent    : null,
            },

            itemPanels: [{
                name    : 'General',
                items   : this.prepareItemsForMenu(generalItems)
            }, {
                name    : 'UML',
                items   : this.prepareItemsForMenu(umlItems)
            }],
            linkCreation: {
                popupShown    : false,
                item          : null
            },
            previewItem: {
                shown         : false,
                item          : null,
                artIcon       : null,
                y             : 50,
                description   : null
            }
        }
    },
    methods: {

        /**
         * Enriches item with defaults of its shape
         */
        prepareItemsForMenu(items) {
            return _.map(items, item => {
                item.item.area = {x: 6, y: 6, w: 140, h: 90, type: 'relative'};
                if (item.item.shapeProps) {
                    // this will be needed later so that it is able to override recent shapeProps changes
                    item.overidingShapeProps = utils.clone(item.item.shapeProps);
                }
                if (item.item.shape) {
                    const shape = Shape.make(item.item.shape);
                    if (shape.component) {
                        this.enrichItemWithShapeProps(item.item, shape);
                        item.shapeComponent = shape.component;

                        if (item.previewItem) {
                            item.previewItem.area = {x: 6, y: 6, w: 140, h: 90, type: 'relative'};
                            this.enrichItemWithShapeProps(item.previewItem, shape);
                        }
                    }
                }
                return item;
            })
        },
        enrichItemWithShapeProps(item, shape) {
            if (shape.args) {
                if (!item.shapeProps) {
                    item.shapeProps = {};
                }
                _.forEach(shape.args, (shapeArg, shapeArgName) => {
                    if (!item.shapeProps.hasOwnProperty(shapeArgName)) {
                        item.shapeProps[shapeArgName] = shapeArg.value;
                    }
                });
            }
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

        showPreviewItem(item) {
            this.previewItem.item = item;
            this.previewItem.artIcon = null;
            this.previewItem.description = item.description;
            this.previewItem.shown = true;
        },
        stopPreviewItem(item) {
            if (this.previewItem.item &&this.previewItem.item.name === item.name) {
                this.previewItem.shown = false;
            }
        },

        showPreviewArt(artIcon) {
            this.previewItem.item = null;
            this.previewItem.artIcon = artIcon;
            this.previewItem.description = artIcon.description;
            this.previewItem.shown = true;
        },
        stopPreviewArt(artIcon) {
            if (this.previewItem.artIcon &&this.previewItem.artIcon.name === artIcon.name) {
                this.previewItem.shown = false;
            }
        },

        onArtCreated(art) {
            this.artList.push(art);
            this.customArtUploadModalShown = false;
        },

        onArtSelected(art) {
            const item = {
                id: shortid.generate(),
                cursor: 'default',
                opacity: 100,
                blendMode: 'normal',
                name: art.name,
                description: '',
                text: '',
                links: [],
                shape: 'rect',
                area: { x: 0, y: 0, w: 0, h: 0, type: 'relative'},
                shapeProps: {
                    strokeSize: 0,
                    backgroundImage: art.url
                }
            };
            const shape = Shape.make(item.shape);
            this.enrichItemWithShapeProps(item, shape);
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, item);
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
                newItem.area = { x: 0, y: 0, w: 0, h: 0, type: 'relative'};
                newItem.name = item.name;
                recentPropsChanges.applyItemProps(newItem, newItem.shape);

                // resetting back to shapeProps that are defined in the menu
                if (item.overidingShapeProps) {
                    const resetShapeProps = utils.clone(item.overidingShapeProps);
                    _.forEach(resetShapeProps, (value, key) => {
                        newItem.shapeProps[key] = value;
                    });
                }

                this.triggerStylesPanelForShape(newItem.shape, newItem);
                EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
            }
        },

        startCreatingLink(link) {
            this.linkCreation.popupShown = false;
            const item = utils.clone(this.linkCreation.item);
            item.shapeProps.url = link.url;
            item.text = link.title;
            item.shapeProps.icon = link.type;
            recentPropsChanges.applyItemProps(item, item.shape);
            this.triggerStylesPanelForShape(item.shape, item);
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, item);
        },

        startCreatingImage(imageUrl) {
            this.createImageModalShown = false;
            var img = new Image();
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    const newItem = utils.clone(this.selectedImageItem.item);
                    newItem.id = shortid.generate();
                    newItem.area = { x: 0, y: 0, w: 0, h: 0, type: 'relative'};

                    utils.setObjectProperty(newItem, this.selectedImageItem.imageProperty, imageUrl);
                    EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
                }
                this.createImageModalShown = false;
            };
            img.onerror = () => {
                this.errorMessage = 'Could not load image. Check if the path is correct';
            };
            img.src = imageUrl;
        },

        onEditorStateChanged(state) {
            this.currentEditorState = state;
            if (state !== 'createItem') {
                this.currentPanel = Panels.Items;
            }
        },

        triggerStylesPanelForShape(shapeName, item) {
            // checking if it already has some styles - we can switch to the styles panel and at the same time update the styles for this shape
            // if not, then wait until we check on the server and then switch

            if (this.stylesPanel.userStyles.hasOwnProperty[shapeName] && this.stylesPanel.userStyles[shapeName] && this.stylesPanel.userStyles[shapeName].length > 0) {
                this.prepareStyleItemPreviews(shapeName, item);
                this.currentPanel = Panels.Styles;
                this.stylesPanel.isEdit = false;
            }

            apiClient.styles.getStylesForShape(shapeName).then(styles => {
                userStyles[shapeName] = styles;
                this.stylesPanel.userStyles[shapeName] = styles;
                if (this.currentEditorState === 'createItem' && styles && styles.length > 0) {
                    this.prepareStyleItemPreviews(shapeName, item);
                    this.currentPanel = Panels.Styles;
                    this.stylesPanel.isEdit = false;
                }
            });
        },

        prepareStyleItemPreviews(shapeName, originalItem) {
            this.previewItem.shown = false;

            const shape = Shape.find(shapeName);
            if (!shape) {
                return;
            }
            this.stylesPanel.previewComponent = shape.component;

            const styles = this.stylesPanel.userStyles[shapeName];
            this.stylesPanel.previewItems = _.map(styles, style => {
                const item = {
                    name: style.name,
                    area: {x: 10, y: 10, w: 120, h: 80},
                    shapeProps: utils.clone(originalItem.shapeProps),
                    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
                };
                this.enrichItemWithShapeProps(item, shape);
                _.forEach(style.shapeProps, (propValue, propName) => {
                    item.shapeProps[propName] = propValue;
                });
                return {
                    name: style.name,
                    item,
                    style,
                    shape: shapeName
                };
            });
        },

        applyStyle(shape, style) {
            EventBus.$emit(EventBus.SHAPE_STYLE_APPLIED, shape, style);
        },

        removeUserStyle(index) {
            const previewItem = this.stylesPanel.previewItems[index];
            if (!previewItem) {
                return;
            }
            const style = this.stylesPanel.userStyles[previewItem.shape][index];

            apiClient.styles.deleteStyle(previewItem.shape, style.id).then(() => {
                this.stylesPanel.userStyles[previewItem.shape].splice(index, 1);
                this.stylesPanel.previewItems.splice(index, 1);
            });
        },

        switchBackToItemsList() {
            this.currentPanel = Panels.Items;
            this.stylesPanel.isEdit = false;
        }
    }
}
</script>

<style lang="css">
</style>
