<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="create-item-menu">
        <div>
            <input type="text" class="textfield" placeholder="Search..." v-model="searchKeyword"/>

            <div class="item-menu">
                <div class="item-container" @click="initiateSelectAndDrag()" title="Select/Drag">
                    <img src="/assets/images/icons/select.svg" width="35" height="30"/>
                </div>
                <div class="item-container" @click="initiateCurveCreation()" title="Create Curve"
                    @mouseover="showPreviewGif('create-curve')"
                    @mouseleave="stopPreviewGif('create-curve')"
                    >
                    <img src="/assets/images/icons/create-curve.svg" width="35" height="30"/>
                </div>
                <div class="item-container" @click="initiateDrawing()" title="Draw"
                    @mouseover="showPreviewGif('draw')"
                    @mouseleave="stopPreviewGif('draw')"
                    >
                    <img src="/assets/images/icons/draw.svg" width="35" height="30"/>
                </div>
                <div class="item-container" @click="initiateSmartDrawing()" title="Smart Draw"
                    @mouseover="showPreviewGif('smart-draw')"
                    @mouseleave="stopPreviewGif('smart-draw')"
                    >

                    <img src="/assets/images/icons/smart-draw.svg" width="35" height="30"/>
                </div>
            </div>

            <panel v-for="panel in filteredItemPanels" v-if="panel.items.length > 0" :name="panel.name">
                <div class="item-menu">
                    <div v-for="item in panel.items"
                        class="item-container"
                        :title="item.name"
                        @mousedown="onItemMouseDown($event, item)"
                        @mouseleave="stopPreviewItem(item)"
                        @mouseover="showPreviewItem(item)"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        @click="onItemPicked(item)"
                        >
                        <img v-if="item.iconUrl" :src="item.iconUrl" width="42px" height="32px"/>
                    </div>
                </div>
            </panel>

            <panel v-if="projectId" name="Project Art">
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

            <panel v-for="artPack in filteredArtPacks" v-if="artPack.icons.length > 0" :name="artPack.name">
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
                    
                    <svg v-if="previewItem.item.item" :width="previewWidth + 'px'" :height="previewHeight + 'px'">
                        <item-svg :item="previewItem.item.item" mode="edit"/>
                    </svg>
                </div>
                <div v-if="previewItem.artIcon">
                    <h4>{{previewItem.artIcon.name}}</h4>
                    <img class="preview-art" :src="previewItem.artIcon.url"/>
                </div>

                <div v-if="previewItem.gif">
                    <img :src="`/assets/images/animations/${previewItem.gif}.gif`" style="max-width: 100%;"/>
                </div>

                <div v-if="previewItem.description" class="preview-item-description">{{previewItem.description}}</div>
            </div>
        </div>

        <div ref="itemDragger" style="position: fixed;" :style="{display: itemCreationDragged ? 'inline-block' : 'none' }">
            <svg v-if="itemCreationDragged"
                :width="`${itemCreationDragged.item.area.x + itemCreationDragged.item.area.w}px`"
                :height="`${itemCreationDragged.item.area.y + itemCreationDragged.item.area.h}px`"
                >
                <item-svg :item="itemCreationDragged.item" mode="edit"/>
            </svg>
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
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import filter from 'lodash/filter';
import utils from '../../../ui/utils.js';
import Shape from './items/shapes/Shape.js';
import LinkEditPopup from './LinkEditPopup.vue';
import recentPropsChanges from '../../history/recentPropsChanges';
import {enrichItemWithDefaults, enrichItemWithDefaultShapeProps, defaultItem} from '../../scheme/Item';
import ItemSvg from './items/ItemSvg.vue';

const _gifDescriptions = {
    'create-curve': 'Lets you design your own complex shapes',
    'draw': 'Allows to draw complex shapes with mouse. Once the drawing is submited - it will optimize its points so that you can easily edit it later',
    'smart-draw': 'Identifies objects by the drawings. At this moment this feature is still experimental and is limited in the amount of shapes it is able to recognize',
}

export default {
    props: ['projectId', 'schemeContainer'],
    components: {Panel, CreateImageModal, Modal, CustomArtUploadModal, EditArtModal, LinkEditPopup, ItemSvg},
    beforeMount() {
        this.reloadArt();
        this.filterItemPanels();
    },
    data() {
        return {
            selectedImageItem           : null,
            createImageModalShown       : false,
            customArtUploadModalShown   : false,
            menu                        : 'main',
            artPacks                    : [],
            filteredArtPacks            : [],
            artList                     : [],
            searchKeyword               : '',
            errorMessage                : null,

            editArtModalShown           : false,
            
            itemPanels: this.generateItemPanels(),
            filteredItemPanels: [],

            linkCreation: {
                popupShown    : false,
                item          : null
            },
            previewItem: {
                shown         : false,
                item          : null,
                artIcon       : null,
                gif           : null,
                y             : 50,
                description   : null
            },

            itemCreationDragged: null,
        }
    },
    methods: {
        generateItemPanels() {
            const panelsMap = {};
            forEach(Shape.getRegistry(), (shape, shapeId) => {
                if (shape.menuItems) {
                    forEach(shape.menuItems, menuEntry => {
                        let group = menuEntry.group || 'Ungrouped';
                        if (!panelsMap[group]) {
                            panelsMap[group] = {
                                name: group,
                                items: []
                            };
                        }

                        panelsMap[group].items.push(this.prepareItemForMenu(utils.clone(menuEntry), shape, shapeId));
                    });
                }
            });

            const panels = [];
            forEach(panelsMap, (panel, name) => {
                panels.push(panel);
            });

            return panels;
        },

        filterItemPanels() {
            const searchKeyword = this.searchKeyword.toLowerCase();

            this.filteredItemPanels = map(this.itemPanels, panel => {
                const panelName = panel.name.toLowerCase();
                let panelMatches = panelName.indexOf(searchKeyword) >= 0;

                return {
                    name: panel.name,
                    items: filter(panel.items, item => {
                        if (this.searchKeyword) {
                            return panelMatches || item.name.toLowerCase().indexOf(searchKeyword) >= 0;
                        }
                        return true;
                    })
                };
            });
        },

        filterArtPacks() {
            const searchKeyword = this.searchKeyword.toLowerCase();

            this.filteredArtPacks = map(this.artPacks, artPack => {
                const artPackName = artPack.name.toLowerCase();
                let packMatches = artPackName.indexOf(searchKeyword) >= 0;

                return {
                    name  : artPack.name,
                    link  : artPack.link,
                    author: artPack.author,
                    icons : filter(artPack.icons, icon => {
                        if (this.searchKeyword) {
                            return packMatches || icon.name.toLowerCase().indexOf(searchKeyword) >= 0 || icon.description.toLowerCase().indexOf(searchKeyword) >= 0;
                        }
                        return true;
                    })
                };
            });

        },

        /**
         * Enriches item with defaults of its shape
         */
        prepareItemForMenu(menuEntry, shape, shapeId) {
            if (!menuEntry.item) {
                menuEntry.item = {};
            }
            menuEntry.item.shape = shapeId;
            menuEntry.item = utils.extendObject(menuEntry.item, defaultItem);

            if (menuEntry.previewArea) {
                // some items might override their area so that it can be shown nicely in a preview
                menuEntry.item.area = menuEntry.previewArea;
            } else {
                menuEntry.item.area = {x: 6, y: 6, w: 140, h: 90};
            }
            if (menuEntry.item.shape) {
                enrichItemWithDefaultShapeProps(menuEntry.item);
            }
            return menuEntry;
        },
        reloadArt() {
            this.artPacks = [];
            if (this.projectId) {
                apiClient.getAllArt(this.projectId).then(artList => {
                    this.artList = artList;
                });
            }
            apiClient.getGlobalArt().then(globalArt => {
                forEach(globalArt, artPack => {
                    forEach(artPack.icons, icon => {
                        if (!icon.name) {
                            icon.name = 'Unnamed';
                        }
                        if (!icon.description) {
                            icon.description = '';
                        }
                    })
                });
                this.artPacks = globalArt;
                this.filterArtPacks();
            });
        },

        showPreviewItem(item) {
            enrichItemWithDefaults(item.item);

            this.previewItem.item = item;
            this.previewItem.artIcon = null;
            this.previewItem.gif = null;
            this.previewItem.description = item.description;
            this.previewItem.shown = true;
        },
        stopPreviewItem(item) {
            if (this.previewItem.item && this.previewItem.item.name === item.name) {
                this.previewItem.shown = false;
            }
        },

        showPreviewArt(artIcon) {
            this.previewItem.item = null;
            this.previewItem.artIcon = artIcon;
            this.previewItem.gif = null;
            this.previewItem.description = artIcon.description;
            this.previewItem.shown = true;
        },
        stopPreviewArt(artIcon) {
            if (this.previewItem.artIcon &&this.previewItem.artIcon.name === artIcon.name) {
                this.previewItem.shown = false;
            }
        },

        showPreviewGif(gifName) {
            this.previewItem.item = null;
            this.previewItem.artIcon = null;
            this.previewItem.gif = gifName;
            if (_gifDescriptions[gifName]) {
                this.previewItem.description = _gifDescriptions[gifName];
            } else {
                this.previewItem.description = null;
            }
            this.previewItem.shown = true;
        },

        stopPreviewGif(gifName) {
            if (this.previewItem.gif === gifName) {
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
                area: { x: 0, y: 0, w: 0, h: 0},
                shapeProps: {
                    strokeSize: 0,
                    fill: {type: 'image', image: art.url}
                }
            };
            enrichItemWithDefaultShapeProps(item);
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, item);
        },

        onItemPicked(item) {
            if (item.imageProperty) {
                this.selectedImageItem = utils.clone(item);
                this.createImageModalShown = true;
            } else if (item.item.shape === 'link') {
                this.linkCreation.item = utils.clone(item.item);
                this.linkCreation.popupShown = true;
            } else {
                const newItem = utils.clone(item.item);
                newItem.id = shortid.generate();
                newItem.area = { x: 0, y: 0, w: 0, h: 0};
                newItem.name = item.name;
                recentPropsChanges.applyItemProps(newItem);

                EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
            }
        },

        startCreatingLink(link) {
            this.linkCreation.popupShown = false;
            const item = utils.clone(this.linkCreation.item);
            item.name = this.makeUniqueName('Link');
            item.shapeProps.url = link.url;
            item.textSlots.link.text = link.title;
            item.shapeProps.icon = link.type;
            recentPropsChanges.applyItemProps(item);
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, item);
        },

        startCreatingImage(imageUrl) {
            this.createImageModalShown = false;
            var img = new Image();
            const that = this;
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    const newItem = utils.clone(that.selectedImageItem.item);
                    newItem.name = that.makeUniqueName('Image');
                    newItem.id = shortid.generate();
                    newItem.area = { x: 0, y: 0, w: 0, h: 0};

                    utils.setObjectProperty(newItem, that.selectedImageItem.imageProperty, imageUrl);
                    EventBus.$emit(EventBus.START_CREATING_COMPONENT, newItem);
                }
                this.createImageModalShown = false;
            };
            img.onerror = () => {
                this.errorMessage = 'Could not load image. Check if the path is correct';
            };
            img.src = imageUrl;
        },

        makeUniqueName(name) {
            return this.schemeContainer.copyNameAndMakeUnique(name);
        },

        initiateSelectAndDrag() {
            EventBus.$emit(EventBus.CANCEL_CURRENT_STATE);
        },

        initiateCurveCreation() {
            const item = {
                name: this.makeUniqueName('Curve'),
                shape: 'curve',
                shapeProps: {
                    points: []
                }
            };
            enrichItemWithDefaults(item);
            EventBus.$emit(EventBus.START_CREATING_COMPONENT, item);
        },

        initiateDrawing(name) {
            EventBus.$emit(EventBus.START_DRAWING);
        },

        initiateSmartDrawing(name) {
            EventBus.$emit(EventBus.START_SMART_DRAWING);
        },

        preventEvent(event) {
            event.preventDefault();
            event.stopPropagation();
        },

        onItemMouseDown(event, item) {
            const mouseOffset = 2;
            const itemDragger = this.$refs.itemDragger;
            const itemClone = utils.clone(item);
            if (itemClone.previewArea) {
                itemClone.item.area.w = itemClone.previewArea.w;
                itemClone.item.area.h = itemClone.previewArea.h;
            } else {
                itemClone.item.area.w = 100;
                itemClone.item.area.h = 60;
            }
            this.itemCreationDragged = itemClone;

            function moveAt(pageX, pageY) {
                itemDragger.style.left = `${pageX + mouseOffset}px`;
                itemDragger.style.top = `${pageY + mouseOffset}px`;
            }

            moveAt(event.pageX, event.pageY);

            function onMouseMove(event) {
                if (event.buttons === 0) {
                    reset();
                }
                moveAt(event.pageX, event.pageY);
            }

            function onMouseUp(event) {
                reset();
                if (utils.domHasParentNode(event.target, el => el.id === 'svg_plot')) {
                    submitItem(event.pageX, event.pageY);
                }
            }

            const that = this;

            function reset() {
                that.itemCreationDragged = null;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            function submitItem(pageX, pageY) {
                const newItem = utils.clone(item.item);
                newItem.id = shortid.generate();
                newItem.area = { x: 0, y: 0, w: itemClone.item.area.w, h: itemClone.item.area.h};
                newItem.name = item.name;
                recentPropsChanges.applyItemProps(newItem);
                EventBus.emitItemCreationDraggedToSvgEditor(newItem, pageX + mouseOffset, pageY + mouseOffset);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    },

    watch: {
        searchKeyword() {
            this.filterItemPanels();
            this.filterArtPacks();
        }
    },

    computed: {
        previewWidth() {
            if (this.previewItem && this.previewItem.item && this.previewItem.item.item) {
                return this.previewItem.item.item.area.w + this.previewItem.item.item.area.x + 10;
            }
            return 150;
        },

        previewHeight() {
            if (this.previewItem && this.previewItem.item && this.previewItem.item.item) {
                return this.previewItem.item.item.area.h + this.previewItem.item.item.area.y + 10;
            }
            return 150;
        }
    }
}
</script>