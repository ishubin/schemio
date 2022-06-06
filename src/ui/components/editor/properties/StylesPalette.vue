<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <panel uid="default-styles" name="Default Styles">
            <div v-for="styleSection in defaultStyleSections">
                <ul class="shape-styles-preview">
                    <li v-for="stylePreview in styleSection.styles">
                        <div class="shape-style" @click="applyStyle(stylePreview.style)">
                            <svg width="70" height="40">
                                <advanced-fill :fill-id="stylePreview.style.id" :fill="stylePreview.style.fill" :area="{x: 4, y:4, w:62, h:32}"/>
                                <rect x="4" y="4" width="62" height="32" :fill="stylePreview.previewFill" :stroke="stylePreview.previewStroke" stroke-width="1"/>
                            </svg>
                        </div>
                    </li>
                </ul>
            </div>
        </panel>
        <panel v-if="userStylesEnabled" uid="user-styles" name="User Styles">
            <span class="btn" @click="saveStyleFromItem">Add to Styles</span>
            <span v-if="!isEdit" class="btn" @click="isEdit = true"><i class="fas fa-edit"></i> Edit</span>
            <span v-else class="btn" @click="isEdit = false"><i class="fas fa-edit"></i> Stop Edit</span>

            <ul class="shape-styles-preview">
                <li v-for="(stylePreview, stylePreviewIndex) in stylePreviews">
                    <div class="shape-style" @click="applyUserStyle(stylePreview.style)">
                        <span v-if="isEdit" class="link link-remove-style" @click="removeStyle(stylePreviewIndex)"><i class="fas fa-times"/></span>

                        <svg width="70" height="40">
                            <advanced-fill :fill-id="stylePreview.style.id" :fill="stylePreview.style.fill" :area="{x: 4, y:4, w:62, h:32}"/>
                            <rect x="4" y="4" width="62" height="32" :fill="stylePreview.previewFill" :stroke="stylePreview.previewStroke" stroke-width="1"/>
                        </svg>
                    </div>
                </li>
            </ul>
        </panel>
    </div>
</template>

<script>
import filter from 'lodash/filter';
import map from 'lodash/map';
import Panel from '../Panel.vue';
import AdvancedFill from '../items/AdvancedFill.vue';
import Shape from '../items/shapes/Shape';
import {defaultStyles} from './ItemStyles';
import StoreUtils from '../../../store/StoreUtils';


const maxStyles = 100;

let cachedUserStyles = null;

export default {
    props: {
        item: { type: Object },
        userStylesEnabled: { type: Boolean, default: false }
    },

    components: {Panel, AdvancedFill},

    beforeMount() {
        this.init();
    },

    data() {
        return {
            isEdit              : false,
            previewItems        : null,
            previewComponent    : null,
            stylePreviews       : [],
            defaultStyleSections: map(defaultStyles, styleSection => {
                return {
                    name: styleSection.name,
                    styles: map(styleSection.styles, this.convertStyleToPreview)
                };
            })
        }
    },

    methods: {
        init() {
            // optimizing it to not call api every time a new item is selected
            if (cachedUserStyles === null && this.userStylesEnabled) {
                this.$store.state.apiClient.getStyles().then(styles => {
                    cachedUserStyles = styles;
                    this.stylePreviews = map(styles, this.convertStyleToPreview);
                });
            } else {
                this.stylePreviews = map(cachedUserStyles, this.convertStyleToPreview);
            }
        },

        convertStyleToPreview(style) {
            return {
                style,
                previewFill: AdvancedFill.computeSvgFill(style.fill, style.id),
                previewStroke: style.strokeColor
            };
        },

        applyStyle(style) {
            this.$emit('style-applied', style);
        },

        applyUserStyle(style) {
            if (!this.isEdit) {
                this.applyStyle(style);
            }
        },

        saveStyleFromItem() {
            if (this.stylePreviews.length >= maxStyles) {
                StoreUtils.addErrorSystemMessage(this.$store, `Cannot add style as you already have ${maxStyles} styles. Please consider removing some.`)
                return;
            }

            const shape = Shape.find(this.item.shape);
            if (!shape) {
                return;
            }

            const isShapeSupported = shape.shapeType === 'standard' || (shape.args.fill && shape.args.fill.type === 'advanced-color'
                && shape.args.strokeColor && shape.args.strokeColor === 'color');

            if (!isShapeSupported) {
                return;
            }

            let textColor = null;
            const textSlots = shape.getTextSlots(this.item);
            if (textSlots && textSlots.length > 0) {
                const textSlotName = textSlots[0].name;

                if (this.item.textSlots[textSlotName] && this.item.textSlots[textSlotName].color) {
                    textColor = this.item.textSlots[textSlotName].color;
                }
            }

            this.$store.state.apiClient.saveStyle(this.item.shapeProps.fill, this.item.shapeProps.strokeColor, textColor).then(style => {
                this.stylePreviews.push(this.convertStyleToPreview(style));
                cachedUserStyles.push(style);
            });
        },

        removeStyle(index) {
            const stylePreview = this.stylePreviews[index];
            if (!stylePreview) {
                return;
            }
            const styleId = stylePreview.style.id;
            this.$store.state.apiClient.deleteStyle(styleId).then(() => {
                this.stylePreviews.splice(index, 1);
                this.stylePreviews = filter(this.stylePreviews, sp => sp.style.id !== styleId);
            });

            cachedUserStyles = filter(cachedUserStyles, style => style.id !== styleId);
        },
    },
}
</script>