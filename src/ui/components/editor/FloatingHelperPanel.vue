<template>
    <transition name="floating-helper-panel">
        <div ref="floatingHelperPanel" class="floating-helper-panel" :style="{top: `${posY}px`, left: `${posX}px`}">
            <ul class="button-group">
                <li>
                    <div class="item-name">
                        <input v-if="nameEdited" ref="nameInput" type="text" v-model="itemName" placeholder="Name..." @keydown.enter="nameEdited = false" @blur="nameEdited = false
                        "/>
                        <span v-else @click="triggerNameEdit" :title="itemName">{{item.name}}</span>
                    </div>
                </li>
                <li>
                    <span class="toggle-button" @click="descriptionEditorShown = true" title="Description">
                        <i class="fas fa-paragraph"></i>
                    </span>
                </li>
                <li v-if="supportsFill && item.shape !== 'connector'">
                    <advanced-color-editor
                        :value="fillColor"
                        width="18px"
                        height="18px"
                        @changed="updateShapeProp('fill', arguments[0])"
                        title="Fill"/>
                </li>
                <li v-if="supportsStroke">
                    <StrokeControl
                        :editorId="editorId"
                        :item="item"
                        @color-changed="updateShapeProp('strokeColor', arguments[0])"
                        @size-changed="updateShapeProp('strokeSize', arguments[0])"
                        @pattern-changed="updateShapeProp('strokePattern', arguments[0])"
                        title="Stroke"
                        />
                </li>
                <li v-if="item.shape === 'path'">
                    <span class="toggle-button" @click="editPath" title="Edit path"><img width="20px" :src="`${assetsPath}/images/icons/create-curve.svg`"/></span>
                </li>
                <li v-if="item.shape === 'image'">
                    <span @click="cropImage" class="toggle-button" title="Crop image"><i class="fas fa-crop"></i></span>
                </li>
                <li v-if="supportsFill && item.shape !== 'connector'">
                    <span class="toggle-button" title="Styles" @click="toggleStylesPopup()"> <i class="fas fa-palette"></i> </span>
                </li>
                <li>
                    <span class="toggle-button" title="Remove" @click="deleteItem()"> <i class="fas fa-trash"></i> </span>
                </li>
            </ul>

            <modal title="Description" v-if="descriptionEditorShown" @close="descriptionEditorShown = false">
                <h5>Name</h5>
                <input type="text" class="textfield" v-model="item.name"/>

                <h5>Tags</h5>
                <vue-tags-input v-model="itemTag"
                    :tags="itemTags"
                    :autocomplete-items="filteredItemTags"
                    @tags-changed="onItemTagChange"
                    ></vue-tags-input>

                <h5>Description</h5>
                <rich-text-editor :id="`floating-helper-panel-${item.id}`" :value="item.description" @changed="item.description = arguments[0]; commitSchemeChange('description')" ></rich-text-editor>

                <LinksPanel :editorId="editorId" :item="item"/>
            </modal>

            <div class="styles-popup" v-if="stylesPopup.shown" :style="{top: `${stylesPopup.y}px`, left: `${stylesPopup.x}px`}">
                <styles-mini-palette @style-applied="applyItemStyle"/>
            </div>
        </div>
    </transition>
</template>

<script>
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import RichTextEditor from '../RichTextEditor.vue';
import StrokeControl from './StrokeControl.vue';
import StylesMiniPalette from './properties/StylesMiniPalette.vue';
import Modal from '../Modal.vue';
import Shape from './items/shapes/Shape';
import myMath from '../../myMath';
import VueTagsInput from '@johmun/vue-tags-input';
import { applyItemStyle } from './properties/ItemStyles';
import LinksPanel from './properties/LinksPanel.vue';
import {map} from '../../collections';
import EditorEventBus from './EditorEventBus';

export default {
    props: {
        editorId       : {type: String, required: true},
        x              : {type: Number},
        y              : {type: Number},
        item           : {type: Object},
        schemeContainer: {type: Object}
    },

    components: {
        AdvancedColorEditor, StrokeControl, Modal,
        RichTextEditor, VueTagsInput, StylesMiniPalette, LinksPanel
    },

    mounted() {
        this.updatePosition();
    },

    data() {
        let fillColor = null;
        let supportsFill = false;
        let supportsStroke = false;
        const shape = Shape.find(this.item.shape);

        if (shape && shape.argType('fill') === 'advanced-color') {
            fillColor = this.item.shapeProps.fill;
            supportsFill = true;
        }
        if (shape && shape.argType('strokeColor') === 'color') {
            supportsStroke = true;
        }

        return {
            fillColor,
            supportsFill,
            supportsStroke,
            posX: this.x,
            posY: this.y,
            nameEdited: false,
            itemName: this.item.name,
            descriptionEditorShown: false,

            itemTag: '',
            existingItemTags: map(this.schemeContainer.itemTags, tag => {return {text: tag}}),

            stylesPopup: {
                shown: false,
                x: 0,
                y: 0
            }
        };
    },

    methods: {
        onItemTagChange(newTags) {
            this.item.tags = newTags.map(tag => tag.text);
        },

        updatePosition() {
            const bbRect = this.$refs.floatingHelperPanel.getBoundingClientRect();

            this.posX = myMath.clamp(this.x - bbRect.width / 2, 10, window.innerWidth - 10);
            this.posY = this.y;
        },

        editPath() {
            this.$emit('edit-path-requested', this.item);
        },

        cropImage() {
            this.$emit('image-crop-requested', this.item);
        },

        commitSchemeChange(propertyName) {
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.${propertyName}`);
        },

        updateShapeProp(name, value) {
            this.item.shapeProps[name] = value;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, `shapeProps.${name}`);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.shapeProps.${name}`);
        },

        deleteItem() {
            this.schemeContainer.deleteSelectedItems();
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        triggerNameEdit() {
            this.nameEdited = true;
            this.$nextTick(() => {
                this.$refs.nameInput.focus();
            });
        },

        toggleStylesPopup() {
            if (!this.stylesPopup.shown) {
                this.stylesPopup.x = 0;
                this.stylesPopup.y = 35;
                this.stylesPopup.shown = true;
            } else {
                this.stylesPopup.shown = false;
            }
        },

        applyItemStyle(style) {
            if (applyItemStyle(this.item, style)) {
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.styles`);
            }
            this.stylesPopup.shown = false;
        }
    },

    watch: {
        x(value) {
            this.updatePosition();
        },
        y(value) {
            this.updatePosition();
        },

        itemName(value) {
            this.item.name = value;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'name');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.name`);
        }
    },

    computed: {
        assetsPath() {
            return this.$store.getters.assetsPath;
        },

        filteredItemTags() {
            return this.existingItemTags.filter(i => new RegExp(this.itemTag, 'i').test(i.text));
        },

        itemTags() {
            if (!Array.isArray(this.item.tags)) {
                return [];
            }
            return this.item.tags.map(tag => {return {text: tag}});
        }
    },
}
</script>