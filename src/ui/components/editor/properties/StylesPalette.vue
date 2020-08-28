<template>
    <div>
        <panel name="Default Styles">
        </panel>
        <panel name="User Styles">
            <span class="btn" @click="saveStyleFromItem">Save to Styles</span>
            <span class="btn" @click="isEdit = !isEdit"><i class="fas fa-edit"></i> Edit</span>
            <ul class="shape-styles-preview">
                <li v-for="(stylePreview, stylePreviewIndex) in stylePreviews">
                    <div class="shape-style" @click="applyStyle(stylePreview.style)">
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
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import apiClient from '../../../apiClient';
import Panel from '../Panel.vue';
import AdvancedFill from '../items/AdvancedFill.vue';
import Shape from '../items/shapes/Shape';
import utils from '../../../utils';
import EventBus from '../EventBus';

export default {
    props: ['item'],

    components: {Panel, AdvancedFill},

    beforeMount() {
        this.init();
    },

    data() {
        return {
            isEdit              : false,
            previewItems        : null,
            previewComponent    : null,
            stylePreviews       : []
        }
    },

    methods: {
        init() {
            apiClient.styles.getStyles().then(styles => {
                this.stylePreviews = map(styles, this.convertStyleToPreview);
            });
        },

        convertStyleToPreview(style) {
            return {
                style,
                previewFill: AdvancedFill.computeSvgFill(style.fill, style.id),
                previewStroke: style.strokeColor
            };
        },

        isItemShapeSupportedForStyles() {
            const shape = Shape.find(this.item.shape);
            if (!shape) {
                return false;
            }

            return shape.shapeType === 'standard' || (shape.args.fill && shape.args.fill.type === 'advanced-color'
                && shape.args.strokeColor && shape.args.strokeColor === 'color');
        },

        applyStyle(style) {
            this.$emit('style-applied', style);
        },

        saveStyleFromItem() {
            if (this.isItemShapeSupportedForStyles) {

                apiClient.styles.saveStyle(this.item.shapeProps.fill, this.item.shapeProps.strokeColor).then(style => {
                    this.stylePreviews.push(this.convertStyleToPreview(style));
                });
            }
        },

        removeStyle(index) {
            const stylePreview = this.stylePreviews[index];
            if (!stylePreview) {
                return;
            }

            apiClient.styles.deleteStyle(stylePreview.style.id).then(() => {
                this.stylePreviews.splice(index, 1);
            });
        },
    }
}
</script>