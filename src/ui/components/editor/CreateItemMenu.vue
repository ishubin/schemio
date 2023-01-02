<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="create-item-menu">
        <div>
            <input type="text" class="textfield" placeholder="Search..." v-model="searchKeyword"/>

            <div class="item-menu">
                <div class="item-container" @click="initiateSelectAndDrag()" title="Select/Drag">
                    <img :src="`${assetsPath}/images/icons/select.svg`" width="35" height="30"/>
                </div>
                <div class="item-container" @click="initiatePathCreation()" title="Create Path"
                    @mouseover="showPreviewGif($event, 'create-curve')"
                    @mouseleave="stopPreviewGif('create-curve')"
                    >
                    <img :src="`${assetsPath}/images/icons/create-curve.svg`" width="35" height="30"/>
                </div>
                <div class="item-container" @click="initiateDrawing()" title="Draw"
                    @mouseover="showPreviewGif($event, 'draw')"
                    @mouseleave="stopPreviewGif('draw')"
                    >
                    <img :src="`${assetsPath}/images/icons/draw.svg`" width="35" height="30"/>
                </div>
            </div>

            <panel v-for="panel in filteredItemPanels" v-if="panel.items.length > 0" :name="panel.name">
                <div class="item-menu">
                    <div v-for="item in panel.items"
                        class="item-container"
                        :title="item.name"
                        @mouseleave="stopPreviewItem($event, item)"
                        @mouseover="showPreviewItem($event, item)"
                        @mousedown="onItemMouseDown($event, item)"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        >

                        <img v-if="item.iconUrl" :src="item.iconUrl" width="42px" height="32px"/>
                        <svg v-else-if="item.iconSVG" width="42px" height="32px" v-html="item.iconSVG"></svg>
                    </div>
                </div>
            </panel>

            <panel v-for="panel in extraShapeGroups" :name="panel.name">
                <div class="item-menu">
                    <div v-for="item in panel.items"
                        class="item-container"
                        :title="item.name"
                        @mouseleave="stopPreviewItem(item)"
                        @mouseover="showExtraShapePreviewItem(item, item.id)"
                        @mousedown="onItemMouseDown($event, item)"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        >

                        <img v-if="item.iconUrl" :src="item.iconUrl" width="42px" height="32px"/>
                        <svg v-else-if="item.iconSVG" width="42px" height="32px" v-html="item.iconSVG"></svg>
                    </div>
                </div>
            </panel>
            <panel v-if="projectArtEnabled" name="Project Art">
                <span class="btn btn-primary" @click="customArtUploadModalShown = true" title="Upload art icon"><i class="fas fa-file-upload"></i></span>
                <span class="btn btn-primary" @click="editArtModalShown = true" title="Edit art icons"><i class="fas fa-pencil-alt"></i></span>
                <div class="item-menu">
                    <div class="item-container"
                        v-for="art in artList"
                        v-if="!searchKeyword || safeTextMatchKeyword(art.name)"
                        @mouseover="showPreviewArt(art)"
                        @mouseleave="stopPreviewArt(art)"
                        @mousedown="onArtMouseDown($event, art)"
                        @dragstart="preventEvent"
                        @drag="preventEvent"
                        >
                        <img :src="art.url"/>
                    </div>
                </div>
            </panel>

            <panel v-for="artPack in filteredArtPacks" v-if="artPack.icons.length > 0" :name="artPack.name" :closable="true" @close="closeArtPack(artPack)">
                <div class="art-pack">
                    <div class="art-pack-author">Created by <a :href="artPack.link">{{artPack.author}}</a></div>
                    <div class="item-menu">
                        <div class="item-container"
                            v-for="icon in artPack.icons"
                            v-if="!searchKeyword || safeTextMatchKeyword(icon.name) || safeTextMatchKeyword(icon.description)"
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

            <div class="section">
                <span class="btn btn-secondary btn-block" @click="extraShapesModal.shown = true">More shapes &#8230;</span>
            </div>

        </div>

        <create-image-modal v-if="imageCreation.popupShown" @close="imageCreation.popupShown = false" @submit-image="onImageSubmited(arguments[0])"></create-image-modal>

        <custom-art-upload-modal v-if="customArtUploadModalShown" @close="customArtUploadModalShown = false" @art-created="onArtCreated"/>
        <edit-art-modal v-if="editArtModalShown" :art-list="artList" @close="editArtModalShown = false"/>

        <modal title="Error" v-if="errorMessage" @close="errorMessage = null">
            {{errorMessage}}
        </modal>

        <ExtraShapesModal v-if="extraShapesModal.shown"
            @art-pack-added="updateAllArtPacks"
            @extra-shapes-registered="updateAllPanels"
            @close="extraShapesModal.shown = false"/>

        <link-edit-popup v-if="linkCreation.popupShown" :edit="false" @submit-link="linkSubmited" @close="linkCreation.popupShown = false"/>

        <div v-if="previewItem.shown" class="preview-item">
            <div  class="item-container">
                <div v-if="previewItem.item">
                    <h4>{{previewItem.item.name}}</h4>

                    <svg v-if="previewItem.item.item" :width="previewWidth + 'px'" :height="previewHeight + 'px'">
                        <ItemSvg :editorId="editorId" :item="previewItem.item.item" mode="edit"/>
                    </svg>
                </div>
                <div v-if="previewItem.artIcon">
                    <h4>{{previewItem.artIcon.name}}</h4>
                    <img class="preview-art" :src="previewItem.artIcon.url"/>
                </div>

                <div v-if="previewItem.gif">
                    <img :src="`${assetsPath}/images/animations/${previewItem.gif}.gif`" style="max-width: 100%;"/>
                </div>

                <div v-if="previewItem.description" class="preview-item-description">{{previewItem.description}}</div>
            </div>
        </div>

        <div ref="itemDragger" style="position: fixed;" :style="{display: itemCreationDragged.item && itemCreationDragged.startedDragging ? 'inline-block' : 'none' }">
            <svg v-if="itemCreationDragged.item && itemCreationDragged.startedDragging"
                :width="`${itemCreationDragged.item.area.x + itemCreationDragged.item.area.w + 50}px`"
                :height="`${itemCreationDragged.item.area.y + itemCreationDragged.item.area.h + 50}px`"
                >
                <ItemSvg :editorId="editorId" :item="itemCreationDragged.item" mode="edit"/>
            </svg>
        </div>
    </div>
</template>

<script>
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
import {defaultItem} from '../../scheme/Item';
import {enrichItemWithDefaults, enrichItemWithDefaultShapeProps} from '../../scheme/ItemFixer';
import ItemSvg from './items/ItemSvg.vue';
import ExtraShapesModal from './ExtraShapesModal.vue';
import StoreUtils from '../../store/StoreUtils.js';
import { dragAndDropBuilder } from '../../dragndrop';

const _gifDescriptions = {
    'create-curve': 'Lets you design your own complex shapes',
    'draw': 'Allows to draw complex shapes with mouse. Once the drawing is submited - it will optimize its points so that you can easily edit it later',
}

const mouseOffset = 2;

const ITEM_PICKED_FOR_CREATION = 'item-picked-for-creation';
const PATH_EDITED = 'path-edited';

export default {
    props: {
        editorId         : {type: String, required: true},
        schemeContainer  : {type: Object},
        projectArtEnabled: {type: Boolean, default: true},
    },

    components: { Panel, CreateImageModal, Modal, CustomArtUploadModal, EditArtModal, LinkEditPopup, ItemSvg, ExtraShapesModal, ExtraShapesModal },

    beforeMount() {
        this.loadProjectArt();
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
                item          : null,
                withMouse     : false
            },
            imageCreation: {
                popupShown: false,
                item      : null,
                withMouse : false
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
            },

            extraShapesModal: {
                shown: false
            }
        }
    },
    methods: {
        loadProjectArt() {
            if (this.$store.state.apiClient && this.$store.state.apiClient.getAllArt) {
                this.$store.state.apiClient.getAllArt()
                .then(artList => {
                    this.artList = artList;
                });
            }
        },

        updateAllPanels() {
            this.itemPanels = this.generateItemPanels();
            this.filterItemPanels();
        },

        generateItemPanels() {
            const panelsMap = {};
            forEach(Shape.getRegistry(), (shape, shapeId) => {
                if (shape.menuItems) {
                    forEach(shape.menuItems, menuEntry => {
                        // this is a dirty hack to fix it for static version of schemio app
                        if (menuEntry.iconUrl && menuEntry.iconUrl.startsWith('/assets')) {
                            menuEntry.iconUrl = this.$store.state.assetsPath + menuEntry.iconUrl.substring(7);
                        }
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

        updateAllArtPacks() {
            this.filterArtPacks();
            this.$forceUpdate();
        },

        safeTextMatchKeyword(text) {
            let safeText = text || '';
            const searchKeyword = this.searchKeyword.toLowerCase();
            return safeText.toLowerCase().indexOf(searchKeyword) >= 0;
        },

        filterArtPacks() {

            this.filteredArtPacks = map(this.$store.state.itemMenu.artPacks, artPack => {
                let packMatches = this.safeTextMatchKeyword(artPack.name);

                return {
                    id    : artPack.id,
                    name  : artPack.name,
                    link  : artPack.link,
                    author: artPack.author,
                    icons : filter(artPack.icons, icon => {
                        if (this.searchKeyword) {
                            return packMatches || this.safeTextMatchKeyword(icon.name) || this.safeTextMatchKeyword(icon.description);
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

        showExtraShapePreviewItem(menuEntry, shapeId) {
            if (!menuEntry.item) {
                const shape = Shape.find(shapeId);
                this.prepareItemForMenu(menuEntry, shape, shapeId);
            }
            this.showPreviewItem(menuEntry);
        },

        showPreviewItem(event, item) {
            enrichItemWithDefaults(item.item);

            this.previewItem.item = item;
            this.previewItem.artIcon = null;
            this.previewItem.gif = null;
            this.previewItem.description = item.description;
            this.previewItem.shown = true;
        },
        stopPreviewItem(event, item) {
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

        showPreviewGif(event, gifName) {
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
            const clonedItem = utils.clone(item.item);
            clonedItem.name = this.schemeContainer.generateUniqueName(item.name);

            if (item.item.shape === 'link') {
                this.linkCreation.item = clonedItem;
                this.linkCreation.withMouse = true;
                this.linkCreation.popupShown = true;
                return;
            } else if (item.imageProperty) {
                this.itemCreationDragged.imageProperty = item.imageProperty;
                this.imageCreation.item = clonedItem;
                this.imageCreation.withMouse = true;
                this.imageCreation.popupShown = true;
                return;
            } else {
                this.$emit(ITEM_PICKED_FOR_CREATION, clonedItem);
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
            if (this.linkCreation.withMouse) {
                this.$emit(ITEM_PICKED_FOR_CREATION, item);
            } else {
                this.$emit('item-creation-dragged-to-editor', item, this.itemCreationDragged.pageX + mouseOffset, this.itemCreationDragged.pageY + mouseOffset);
            }
        },

        onImageSubmited(imageUrl) {
            this.imageCreation.popupShown = false;
            var img = new Image();
            const that = this;

            const newItem = utils.clone(that.imageCreation.item);
            newItem.name = that.makeUniqueName('Image');
            newItem.id = shortid.generate();
            newItem.area = { x: 0, y: 0, w: 100, h: 100};
            utils.setObjectProperty(newItem, that.itemCreationDragged.imageProperty, imageUrl);

            if (this.imageCreation.withMouse) {
                this.$emit(ITEM_PICKED_FOR_CREATION, newItem);
            } else {
                img.onload = function () {
                    if (this.width > 1 && this.height > 1) {
                        newItem.area = { x: 0, y: 0, w: this.width, h: this.height};
                        that.$emit('item-creation-dragged-to-editor', newItem, that.itemCreationDragged.pageX + mouseOffset, that.itemCreationDragged.pageY + mouseOffset);
                    }
                };
                img.onerror = (err) => {
                    that.$emit('item-creation-dragged-to-editor', newItem, that.itemCreationDragged.pageX + mouseOffset, that.itemCreationDragged.pageY + mouseOffset);
                };
                img.src = imageUrl;
            }
        },

        makeUniqueName(name) {
            return this.schemeContainer.copyNameAndMakeUnique(name);
        },

        initiateSelectAndDrag() {
            this.previewItem.shown = false;
            this.$emit('state-drag-item-requested');
        },

        initiatePathCreation() {
            this.previewItem.shown = false;
            const item = {
                name: this.makeUniqueName('Path'),
                area: {x: 0, y: 0, w: 100, h: 100, r: 0, sx: 1, sy: 1, px: 0.5, py: 0.5},
                shape: 'path',
                shapeProps: {
                    paths: []
                }
            };
            enrichItemWithDefaults(item);
            this.$emit(PATH_EDITED, item);
        },

        initiateDrawing(name) {
            this.previewItem.shown = false;
            this.$emit('drawing-requested');
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
                shape: 'image',
                area: { x: 0, y: 0, w: 100, h: 60},
                shapeProps: {
                    strokeSize: 0,
                    showTitle: false,
                    image: art.url,
                    stretch: false,
                },
            };
            enrichItemWithDefaults(item);

            this.onItemMouseDown(event, {
                item,
                name: item.name
            }, true);
        },

        onItemMouseDown(originalEvent, item, shouldIgnoreRecentProps) {
            this.previewItem.shown = false;

            const itemClone = utils.clone(item.item);

            dragAndDropBuilder(originalEvent)
            .withDroppableClass('svg-editor-plot')
            .withDraggedElement(this.$refs.itemDragger)
            .onDragStart(() => {
                if (!shouldIgnoreRecentProps && itemClone.shape !== 'sticky_note') {
                    recentPropsChanges.applyItemProps(itemClone);
                }

                if (item.previewArea) {
                    itemClone.area.w = item.previewArea.w;
                    itemClone.area.h = item.previewArea.h;
                } else {
                    itemClone.area.w = 100;
                    itemClone.area.h = 60;
                }

                // each item might have different size defined in its menu
                if (item.size) {
                    itemClone.area.w = item.size.w;
                    itemClone.area.h = item.size.h;
                }

                this.itemCreationDragged.item = itemClone;
                this.itemCreationDragged.startedDragging = true;

                if (item.imageProperty) {
                    this.itemCreationDragged.imageProperty = item.imageProperty;
                } else {
                    this.itemCreationDragged.imageProperty = null;
                }
            })
            .onDone(() => {
                this.itemCreationDragged.item = null;
                this.itemCreationDragged.startedDragging = false;
            })
            .onSimpleClick(() => {
                this.onItemPicked(item);
            })
            .onDrop((event, element, pageX, pageY) => {
                this.itemCreationDragged.pageX = pageX;
                this.itemCreationDragged.pageY = pageY;

                if (item.item.shape === 'link') {
                    this.linkCreation.item = itemClone;
                    this.linkCreation.withMouse = false;
                    this.linkCreation.popupShown = true;
                    return;
                } else if (item.imageProperty) {
                    this.itemCreationDragged.imageProperty = item.imageProperty;
                    this.imageCreation.item = itemClone;
                    this.imageCreation.withMouse = false;
                    this.imageCreation.popupShown = true;
                    return;
                }

                itemClone.id = shortid.generate();
                itemClone.area = { x: 0, y: 0, w: itemClone.area.w, h: itemClone.area.h};
                itemClone.name = this.makeUniqueName(item.name);
                this.$emit('item-creation-dragged-to-editor', itemClone, pageX, pageY);
            })
            .build();
        },

        closeArtPack(artPack) {
            StoreUtils.removeArtPack(this.$store, artPack.id);
            this.filterArtPacks();
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
        },

        extraShapeGroups() {
            return this.$store.getters.extraShapeGroups;
        },

        assetsPath() {
            return this.$store.getters.assetsPath;
        }
    }
}
</script>