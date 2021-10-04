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
                        @mouseleave="stopPreviewItem(item)"
                        @mouseover="showPreviewItem(item)"
                        @mousedown="onItemMouseDown($event, item)"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        >
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
                        @mousedown="onArtMouseDown($event, icon)"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        >
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
                            @mousedown="onArtMouseDown($event, icon)"
                            @dragstart="preventEvent"
                            @drag="preventEvent"
                            >
                            <img :src="icon.url" :title="`${icon.name} ${icon.description}`"/>
                        </div>
                    </div>
                </div>
            </panel>
        </div>

        <create-image-modal v-if="imageCreation.popupShown" @close="imageCreation.popupShown = false" @submit-image="onImageSubmited(arguments[0])"></create-image-modal>

        <custom-art-upload-modal v-if="customArtUploadModalShown" @close="customArtUploadModalShown = false" @art-created="onArtCreated"/>
        <edit-art-modal v-if="editArtModalShown" :art-list="artList" @close="editArtModalShown = false"/>

        <modal title="Error" v-if="errorMessage" @close="errorMessage = null">
            {{errorMessage}}
        </modal>

        <link-edit-popup v-if="linkCreation.popupShown" :edit="false" @submit-link="linkSubmited" @close="linkCreation.popupShown = false"/>

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

        <div ref="itemDragger" style="position: fixed;" :style="{display: itemCreationDragged.item && itemCreationDragged.startedDragging ? 'inline-block' : 'none' }">
            <svg v-if="itemCreationDragged.item && itemCreationDragged.startedDragging"
                :width="`${itemCreationDragged.item.area.x + itemCreationDragged.item.area.w + 50}px`"
                :height="`${itemCreationDragged.item.area.y + itemCreationDragged.item.area.h + 50}px`"
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

const mouseOffset = 2;

export default {
    props: ['schemeContainer'],
    components: {Panel, CreateImageModal, Modal, CustomArtUploadModal, EditArtModal, LinkEditPopup, ItemSvg},
    beforeMount() {
        this.reloadArt();
        this.filterItemPanels();
    },
    data() {
        return {
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
            imageCreation: {
                popupShown: false,
                item: null
            },
            previewItem: {
                shown         : false,
                item          : null,
                artIcon       : null,
                gif           : null,
                y             : 50,
                description   : null
            },

            itemCreationDragged: {
                startedDragging: false,
                item: null,
                pageX: 0,
                pageY: 0,
                imageProperty: null
            }
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
            if (this.$store.state.apiClient && this.$store.state.apiClient.getAllArt) {
                this.$store.state.apiClient.getAllArt().then(artList => {
                    this.artList = artList;
                });
            }
            if (this.$store.state.apiClient && this.$store.state.apiClient.getGlobalArt) {
                this.$store.state.apiClient.getGlobalArt().then(globalArt => {
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
            }
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

        onItemPicked(item) {
            if (this.itemCreationDragged.startedDragging) {
                return;
            }

            const pageX = window.innerWidth / 2;
            const pageY = window.innerHeight / 2;

            const itemClone = utils.clone(item.item);
            itemClone.area.w = 100;
            itemClone.area.h = 60;

            if (item.imageProperty) {
                this.imageCreation.item  = itemClone;
                this.itemCreationDragged.pageX = pageX / 2;
                this.itemCreationDragged.pageY = pageY / 2;
                this.imageCreation.popupShown = true;
            } else if (item.item.shape === 'link') {
                this.linkCreation.item = itemClone;
                this.itemCreationDragged.pageX = pageX / 2;
                this.itemCreationDragged.pageY = pageY / 2;
                this.linkCreation.popupShown = true;
            } else {
                const newItem = itemClone;
                newItem.id = shortid.generate();
                newItem.name = this.makeUniqueName(item.name);
                recentPropsChanges.applyItemProps(newItem);

                EventBus.emitItemCreationDraggedToSvgEditor(newItem, pageX, pageY);
            }
        },

        linkSubmited(link) {
            this.linkCreation.popupShown = false;
            const item = utils.clone(this.linkCreation.item);
            item.name = this.makeUniqueName('Link');
            item.shapeProps.url = link.url;
            item.textSlots.link.text = link.title;
            item.shapeProps.icon = link.type;
            recentPropsChanges.applyItemProps(item);
            EventBus.emitItemCreationDraggedToSvgEditor(item, this.itemCreationDragged.pageX + mouseOffset, this.itemCreationDragged.pageY + mouseOffset);
        },

        onImageSubmited(imageUrl) {
            this.imageCreation.popupShown = false;
            var img = new Image();
            const that = this;
            img.onload = function () {
                if (this.width > 1 && this.height > 1) {
                    const newItem = utils.clone(that.imageCreation.item);
                    newItem.name = that.makeUniqueName('Image');
                    newItem.id = shortid.generate();
                    newItem.area = { x: 0, y: 0, w: this.width, h: this.height};

                    utils.setObjectProperty(newItem, that.itemCreationDragged.imageProperty, imageUrl);
                    EventBus.emitItemCreationDraggedToSvgEditor(newItem, that.itemCreationDragged.pageX + mouseOffset, that.itemCreationDragged.pageY + mouseOffset);
                }
                that.imageCreation.popupShown = false;
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
            EventBus.$emit(EventBus.START_CURVE_EDITING, item);
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

        onArtMouseDown(event, art) {
            const item = {
                id: shortid.generate(),
                cursor: 'default',
                opacity: 100,
                blendMode: 'normal',
                name: this.makeUniqueName(art.name),
                description: '',
                text: '',
                links: [],
                shape: 'rect',
                area: { x: 0, y: 0, w: 100, h: 60},
                shapeProps: {
                    strokeSize: 0,
                    fill: {type: 'image', image: art.url}
                },
            };
            enrichItemWithDefaults(item);

            this.onItemMouseDown(event, {
                item,
                name: item.name
            });
        },

        onItemMouseDown(event, item) {
            const that = this;
            const itemDragger = this.$refs.itemDragger;
            const itemClone = utils.clone(item.item);
            let pixelsMoved = 0;

            if (item.previewArea) {
                itemClone.area.w = item.previewArea.w;
                itemClone.area.h = item.previewArea.h;
            } else {
                itemClone.area.w = 100;
                itemClone.area.h = 60;
            }
            this.itemCreationDragged.item = itemClone;
            this.itemCreationDragged.startedDragging = false;

            if (item.imageProperty) {
                this.itemCreationDragged.imageProperty = item.imageProperty;
            } else {
                this.itemCreationDragged.imageProperty = null;
            }

            const originalPageX = event.pageX;
            const originalPageY = event.pageY;

            function moveAt(pageX, pageY) {
                pixelsMoved += Math.abs(pageX - originalPageX) + Math.abs(pageY - originalPageY);

                if (!that.itemCreationDragged.startedDragging && pixelsMoved > 10) {
                    that.itemCreationDragged.startedDragging = true;
                }
                itemDragger.style.left = `${pageX + mouseOffset}px`;
                itemDragger.style.top = `${pageY + mouseOffset}px`;
                that.itemCreationDragged.pageX = pageX;
                that.itemCreationDragged.pageY = pageY;
            }

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
                } else if (pixelsMoved < 10) {
                    that.onItemPicked(item);
                }
            }


            function reset() {
                that.itemCreationDragged.startedDragging = false;
                that.itemCreationDragged.item = null;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            function submitItem(pageX, pageY) {
                that.itemCreationDragged.pageX = pageX;
                that.itemCreationDragged.pageY = pageY;

                if (item.item.shape === 'link') {
                    that.linkCreation.item = itemClone;
                    that.linkCreation.popupShown = true;
                    return;
                } else if (item.imageProperty) {
                    that.itemCreationDragged.imageProperty = item.imageProperty;
                    that.imageCreation.item = itemClone;
                    that.imageCreation.popupShown = true;
                    return;
                }

                const newItem = utils.clone(item.item);
                newItem.id = shortid.generate();
                newItem.area = { x: 0, y: 0, w: itemClone.area.w, h: itemClone.area.h};
                newItem.name = that.makeUniqueName(item.name);
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