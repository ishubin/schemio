<template>
    <div>
        <panel name="Styles">
            <span class="link" @click="isEdit = !isEdit"><i class="fas fa-edit"></i> Edit</span>
            <ul class="shape-styles-preview">
                <li v-for="(styleItem, styleItemIndex) in previewItems">
                    <div class="shape-style" @click="applyStyle(styleItem.shape, styleItem.item.shapeProps)">
                        <span v-if="isEdit" class="link link-remove-style" @click="removeUserStyle(styleItemIndex)"><i class="fas fa-times"/></span>

                        <svg width="140px" height="100px">
                            <g :transform="`translate(${styleItem.item.area.x}, ${styleItem.item.area.y})`">
                                <component :is="previewComponent" :item="styleItem.item"></component>
                            </g>
                        </svg>
                    </div>
                </li>
            </ul>
        </panel>
    </div>
</template>

<script>
import {forEach, map} from 'lodash';
import apiClient from '../../../apiClient';
import Shape from '../items/shapes/Shape';
import utils from '../../../utils';
import Panel from '../Panel.vue';

// this is used in order to cache user styles on the client side for all shapes
const userStyles = {};


export default {
    props: ['item'],

    components: {Panel},

    beforeMount() {
        this.init();
    },

    data() {
        return {
            userStyles          : userStyles,
            isEdit              : false,
            previewItems        : null,
            previewComponent    : null,
        }
    },
    methods: {
        init() {
            const shapeName = this.item.shape;

            if (this.userStyles.hasOwnProperty[shapeName] && this.userStyles[shapeName] && this.userStyles[shapeName].length > 0) {
                this.prepareStyleItemPreviews(this.item);
            }

            apiClient.styles.getStylesForShape(shapeName).then(styles => {
                userStyles[shapeName] = styles;
                this.userStyles[shapeName] = styles;
                this.prepareStyleItemPreviews(this.item);
            });

        },

        applyStyle(shape, shapeProps) {
            this.$emit('style-applied', shape, shapeProps);
        },

        removeUserStyle(index) {
            const previewItem = this.previewItems[index];
            if (!previewItem) {
                return;
            }
            const style = this.userStyles[previewItem.shape][index];

            apiClient.styles.deleteStyle(previewItem.shape, style.id).then(() => {
                this.userStyles[previewItem.shape].splice(index, 1);
                this.previewItems.splice(index, 1);
            });
        },

        prepareStyleItemPreviews(originalItem) {
            const shapeName = originalItem.shape;
            const shape = Shape.find(shapeName);
            if (!shape) {
                return;
            }
            this.previewComponent = shape.component;

            const styles = this.userStyles[shapeName];
            this.previewItems = map(styles, style => {
                const item = {
                    name: style.name,
                    area: {x: 10, y: 10, w: 120, h: 80},
                    shapeProps: utils.clone(originalItem.shapeProps),
                    text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
                };
                this.enrichItemWithShapeProps(item, shape);

                forEach(style.shapeProps, (propValue, propName) => {
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

        enrichItemWithShapeProps(item, shape) {
            if (shape.args) {
                if (!item.shapeProps) {
                    item.shapeProps = {};
                }
                forEach(shape.args, (shapeArg, shapeArgName) => {
                    if (!item.shapeProps.hasOwnProperty(shapeArgName)) {
                        item.shapeProps[shapeArgName] = shapeArg.value;
                    }
                });
            }
        },
    }
}
</script>