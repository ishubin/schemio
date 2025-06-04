<template>
    <div>
        <div class="hint hint-small">
            Auto-layout lets you define rules by which the positioning of the item should be adjusted, depending on the changes in the document
        </div>

        <div v-if="item.autoLayout && item.autoLayout.on">
            <span class="btn btn-danger" @click="turnAutoLayoutOff">Disable auto-layout</span>

            <div class="auto-layout-editor-plot">
                <table>
                    <tbody>
                        <tr>
                            <td></td>
                            <td class="guide-top guide-side" :class="[`guide-type-${topGuide.type}`]">
                                <div class="guide-container">
                                    <span class="guide"></span>
                                    <GuideLabel :key="topGuide.id" :guide="topGuide"
                                        :guideOptions="sideVerticalGuideOptions"
                                        @value-changed="onGuideValueChange($event, 'top', 'relTop')"
                                        @type-selected="onTopTypeChange"
                                        />
                                </div>
                            </td>
                            <td></td>
                        </tr>
                        <tr>
                            <td class="guide-left guide-side" :class="[`guide-type-${leftGuide.type}`]">
                                <div class="guide-container">
                                    <span class="guide"></span>
                                    <GuideLabel :key="leftGuide.id" :guide="leftGuide"
                                        :guideOptions="sideHorizontalGuideOptions"
                                        @value-changed="onGuideValueChange($event, 'left', 'relLeft')"
                                        @type-selected="onLeftTypeChange"
                                        />
                                </div>
                            </td>
                            <td class="guide-center">
                                <div class="guide-container">
                                    <div class="box">
                                        <GuideLabel class="label-width" :key="widthGuide.id" :guide="widthGuide"
                                            :guideOptions="sizeGuideOptions"
                                            @value-changed="onGuideValueChange($event, 'width', 'relWidth')"
                                            @type-selected="onWidthTypeChange"
                                            >
                                            <i class="label-width-arrow fa-solid fa-angle-right"></i>
                                        </GuideLabel>
                                        <GuideLabel class="label-height" :key="heightGuide.id" :guide="heightGuide"
                                            :guideOptions="sizeGuideOptions"
                                            @value-changed="onGuideValueChange($event, 'height', 'relHeight')"
                                            @type-selected="onHeightTypeChange"
                                            >
                                            <i class="label-height-arrow fa-solid fa-angle-down"></i>
                                        </GuideLabel>
                                    </div>
                                </div>
                            </td>
                            <td class="guide-right guide-side" :class="[`guide-type-${rightGuide.type}`]">
                                <div class="guide-container">
                                    <span class="guide"></span>
                                    <GuideLabel :key="rightGuide.id" :guide="rightGuide"
                                        :guideOptions="sideHorizontalGuideOptions"
                                        @value-changed="onGuideValueChange($event, 'right', 'relRight')"
                                        @type-selected="onRightTypeChange"
                                        />
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="guide-bottom guide-side" :class="[`guide-type-${bottomGuide.type}`]">
                                <div class="guide-container">
                                    <span class="guide"></span>
                                    <GuideLabel :key="bottomGuide.id" :guide="bottomGuide"
                                        :guideOptions="sideVerticalGuideOptions"
                                        @value-changed="onGuideValueChange($event, 'bottom', 'relBottom')"
                                        @type-selected="onBottomTypeChange"
                                        />
                                </div>
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
        <div v-else>
            <div v-if="!autoLayoutAllowed" class="msg msg-info">
                Auto-layout is not available for this item. To make use of auto-layout make sure that the item is attached to any other item.
            </div>
            <span class="btn btn-secondary" :class="{'disabled': !autoLayoutAllowed}" @click="turnAutoLayoutOn">Enable auto-layout</span>
        </div>
    </div>
</template>

<script>
import shortid from 'shortid';
import NumberTextfield from '../../NumberTextfield.vue';
import EditorEventBus from '../EditorEventBus';
import ElementPicker from '../ElementPicker.vue';
import { generateAutoLayoutForItem, autoLayoutCenterItemHorizontally,
        autoLayoutCenterItemVertically, autoLayoutRemoveTop, autoLayoutSwitchTopToAbsolute, autoLayoutSwitchTopToRelative,
        autoLayoutRemoveBottom,
        autoLayoutSwitchBottomToAbsolute,
        autoLayoutSwitchBottomToRelative,
        autoLayoutRemoveLeft,
        autoLayoutSwitchLeftToAbsolute,
        autoLayoutSwitchLeftToRelative,
        autoLayoutRemoveRight,
        autoLayoutSwitchRightToAbsolute,
        autoLayoutSwitchRightToRelative,
        autoLayoutRemoveWidth,
        autoLayoutSwitchWidthToAbsolute,
        autoLayoutSwitchWidthToRelative,
        autoLayoutRemoveHeight,
        autoLayoutSwitchHeightToAbsolute,
        autoLayoutSwitchHeightToRelative} from '../../../scheme/AutoLayout';
import GuideLabel from './GuideLabel.vue';



const ICON_REMOVE = 'fa-solid fa-xmark';
const ICON_ABSOLUTE = 'fa-solid fa-ruler-combined';
const ICON_RELATIVE = 'fa-solid fa-percent';
const ICON_H_CENTER = 'fa-solid fa-left-right';
const ICON_V_CENTER = 'fa-solid fa-up-down';

export default {
    props: {
        item: { type: Object, required: true },
        editorId: { type: String, required: true },
        schemeContainer: { type: Object, required: true },
    },

    components: { ElementPicker, NumberTextfield, GuideLabel },

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },

    data() {
        const parentItem = this.item.meta && this.item.meta.parentId ? this.schemeContainer.findItemById(this.item.meta.parentId) : null;

        return {
            autoLayoutAllowed: parentItem ? true : false,
            parentItem,
            leftGuide: this.buildLeftGuide(),
            rightGuide: this.buildRightGuide(),
            topGuide: this.buildTopGuide(),
            bottomGuide: this.buildBottomGuide(),

            widthGuide: this.buildWidthGuide(),
            heightGuide: this.buildHeightGuide(),

            sideHorizontalGuideOptions: [{
                type: 'removed',
                name: 'Remove',
                iconClass: ICON_REMOVE,
            }, {
                type: 'absolute',
                name: 'Absolute',
                iconClass: ICON_ABSOLUTE,
            }, {
                type: 'relative',
                name: 'Relative',
                iconClass: ICON_RELATIVE,
            }, {
                type: 'centered',
                name: 'Centered',
                iconClass: ICON_H_CENTER
            }],

            sideVerticalGuideOptions: [{
                type: 'removed',
                name: 'Remove',
                iconClass: ICON_REMOVE,
            }, {
                type: 'absolute',
                name: 'Absolute',
                iconClass: ICON_ABSOLUTE,
            }, {
                type: 'relative',
                name: 'Relative',
                iconClass: ICON_RELATIVE,
            }, {
                type: 'centered',
                name: 'Centered',
                iconClass: ICON_V_CENTER
            }],

            sizeGuideOptions: [{
                type: 'removed',
                name: 'Remove',
                iconClass: ICON_REMOVE,
            }, {
                type: 'absolute',
                name: 'Absolute',
                iconClass: ICON_ABSOLUTE,
            }, {
                type: 'relative',
                name: 'Relative',
                iconClass: ICON_RELATIVE
            } ],
        };
    },
    methods: {
        onItemChanged() {
            const parentItem = this.item.meta && this.item.meta.parentId ? this.schemeContainer.findItemById(this.item.meta.parentId) : null;
            this.autoLayoutAllowed = parentItem ? true : false;
        },

        updateItem() {
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
            this.schemeContainer.updateEditBox();
            this.schemeContainer.reindexItems();
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'area');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.item.id}.autoLayout`);
        },

        rebuildAllGuides() {
            this.leftGuide   = this.buildLeftGuide();
            this.rightGuide  = this.buildRightGuide();
            this.topGuide    = this.buildTopGuide();
            this.bottomGuide = this.buildBottomGuide();
            this.widthGuide  = this.buildWidthGuide();
            this.heightGuide = this.buildHeightGuide();
        },

        onTopTypeChange(option) {
            if (option.type === 'centered') {
                autoLayoutCenterItemVertically(this.item, this.parentItem);
            } else if (option.type === 'removed') {
                autoLayoutRemoveTop(this.item, this.parentItem);
            } else if (option.type === 'absolute') {
                autoLayoutSwitchTopToAbsolute(this.item, this.parentItem);
            } else if (option.type === 'relative') {
                autoLayoutSwitchTopToRelative(this.item, this.parentItem);
            }
            this.updateItem();
            this.rebuildAllGuides();
        },

        onBottomTypeChange(option) {
            if (option.type === 'centered') {
                autoLayoutCenterItemVertically(this.item, this.parentItem);
            } else if (option.type === 'removed') {
                autoLayoutRemoveBottom(this.item, this.parentItem);
            } else if (option.type === 'absolute') {
                autoLayoutSwitchBottomToAbsolute(this.item, this.parentItem);
            } else if (option.type === 'relative') {
                autoLayoutSwitchBottomToRelative(this.item, this.parentItem);
            }
            this.updateItem();
            this.rebuildAllGuides();
        },

        onLeftTypeChange(option) {
            if (option.type === 'centered') {
                autoLayoutCenterItemHorizontally(this.item, this.parentItem);
            } else if (option.type === 'removed') {
                autoLayoutRemoveLeft(this.item, this.parentItem);
            } else if (option.type === 'absolute') {
                autoLayoutSwitchLeftToAbsolute(this.item, this.parentItem);
            } else if (option.type === 'relative') {
                autoLayoutSwitchLeftToRelative(this.item, this.parentItem);
            }
            this.updateItem();
            this.rebuildAllGuides();
        },

        onRightTypeChange(option) {
            if (option.type === 'centered') {
                autoLayoutCenterItemHorizontally(this.item, this.parentItem);
            } else if (option.type === 'removed') {
                autoLayoutRemoveRight(this.item, this.parentItem);
            } else if (option.type === 'absolute') {
                autoLayoutSwitchRightToAbsolute(this.item, this.parentItem);
            } else if (option.type === 'relative') {
                autoLayoutSwitchRightToRelative(this.item, this.parentItem);
            }
            this.updateItem();
            this.rebuildAllGuides();
        },

        onWidthTypeChange(option) {
            if (option.type === 'removed') {
                autoLayoutRemoveWidth(this.item, this.parentItem);
            } else if (option.type === 'absolute') {
                autoLayoutSwitchWidthToAbsolute(this.item, this.parentItem);
            } else if (option.type === 'relative') {
                autoLayoutSwitchWidthToRelative(this.item, this.parentItem);
            }
            this.updateItem();
            this.rebuildAllGuides();
        },

        onHeightTypeChange(option) {
            if (option.type === 'removed') {
                autoLayoutRemoveHeight(this.item, this.parentItem);
            } else if (option.type === 'absolute') {
                autoLayoutSwitchHeightToAbsolute(this.item, this.parentItem);
            } else if (option.type === 'relative') {
                autoLayoutSwitchHeightToRelative(this.item, this.parentItem);
            }
            this.updateItem();
            this.rebuildAllGuides();
        },

        onGuideValueChange(value, ...fields) {
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                if (this.item.autoLayout.rules.hasOwnProperty(field)) {
                    this.item.autoLayout.rules[field] = value;
                    this.schemeContainer.readjustItemAndDescendants(this.item.id);
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.item.id}.autoLayout`);
                    this.schemeContainer.updateEditBox();
                    this.schemeContainer.delayFullReindex();
                    return;
                }
            }
        },

        turnAutoLayoutOn() {
            if (!this.parentItem) {
                return;
            }
            this.item.autoLayout = generateAutoLayoutForItem(this.item, this.parentItem);
            this.updateItem();
            this.rebuildAllGuides();
        },

        turnAutoLayoutOff() {
            if (!this.item.autoLayout) {
                this.item.autoLayout = {on: false, rules: {}};
                return;
            }
            this.item.autoLayout.on = false;
            this.item.autoLayout.rules = {};
            this.updateItem();
            this.rebuildAllGuides();
        },

        buildLeftGuide() {
            if (this.item.autoLayout.rules.hasOwnProperty('left')) {
                return {
                    id: shortid.generate(),
                    type: 'absolute',
                    value: this.item.autoLayout.rules.left,
                    number: true,
                    icon: ICON_ABSOLUTE,
                };
            } else if (this.item.autoLayout.rules.hasOwnProperty('relLeft')) {
                return {
                    id: shortid.generate(),
                    type: 'relative',
                    value: this.item.autoLayout.rules.relLeft,
                    number: true,
                    icon: ICON_RELATIVE
                }
            } else if (this.item.autoLayout.rules.hcenter) {
                return {
                    id: shortid.generate(),
                    type: 'centered',
                    value: '',
                    icon: ICON_H_CENTER
                }
            }
            return {
                id: shortid.generate(),
                type: 'removed',
                value: '',
                icon: ICON_REMOVE
            };
        },

        buildRightGuide() {
            if (this.item.autoLayout.rules.hasOwnProperty('right')) {
                return {
                    id: shortid.generate(),
                    type: 'absolute',
                    value: this.item.autoLayout.rules.right,
                    number: true,
                    icon: ICON_ABSOLUTE,
                };
            } else if (this.item.autoLayout.rules.hasOwnProperty('relRight')) {
                return {
                    id: shortid.generate(),
                    type: 'relative',
                    value: this.item.autoLayout.rules.relRight,
                    number: true,
                    icon: ICON_RELATIVE
                }
            } else if (this.item.autoLayout.rules.hcenter) {
                return {
                    id: shortid.generate(),
                    type: 'centered',
                    value: '',
                    icon: ICON_H_CENTER
                }
            }
            return {
                id: shortid.generate(),
                type: 'removed',
                value: '',
                icon: ICON_REMOVE
            };
        },

        buildTopGuide() {
            if (this.item.autoLayout.rules.hasOwnProperty('top')) {
                return {
                    id: shortid.generate(),
                    type: 'absolute',
                    value: this.item.autoLayout.rules.top,
                    number: true,
                    icon: ICON_ABSOLUTE,
                };
            } else if (this.item.autoLayout.rules.hasOwnProperty('relTop')) {
                return {
                    id: shortid.generate(),
                    type: 'relative',
                    value: this.item.autoLayout.rules.relTop,
                    number: true,
                    icon: ICON_RELATIVE
                }
            } else if (this.item.autoLayout.rules.vcenter) {
                return {
                    id: shortid.generate(),
                    type: 'centered',
                    value: '',
                    icon: ICON_V_CENTER
                }
            }
            return {
                id: shortid.generate(),
                type: 'removed',
                value: '',
                icon: ICON_REMOVE
            };
        },

        buildBottomGuide() {
            if (this.item.autoLayout.rules.hasOwnProperty('bottom')) {
                return {
                    id: shortid.generate(),
                    type: 'absolute',
                    value: this.item.autoLayout.rules.bottom,
                    number: true,
                    icon: ICON_ABSOLUTE,
                };
            } else if (this.item.autoLayout.rules.hasOwnProperty('relBottom')) {
                return {
                    id: shortid.generate(),
                    type: 'relative',
                    value: this.item.autoLayout.rules.relBottom,
                    number: true,
                    icon: ICON_RELATIVE
                }
            } else if (this.item.autoLayout.rules.vcenter) {
                return {
                    id: shortid.generate(),
                    type: 'centered',
                    value: '',
                    icon: ICON_V_CENTER
                }
            }
            return {
                id: shortid.generate(),
                type: 'removed',
                value: '',
                icon: ICON_REMOVE
            };
        },

        buildWidthGuide() {
            if (this.item.autoLayout.rules.hasOwnProperty('width')) {
                return {
                    id: shortid.generate(),
                    type: 'absolute',
                    value: this.item.autoLayout.rules.width,
                    number: true,
                    icon: ICON_ABSOLUTE,
                };
            } else if (this.item.autoLayout.rules.hasOwnProperty('relWidth')) {
                return {
                    id: shortid.generate(),
                    type: 'relative',
                    value: this.item.autoLayout.rules.relWidth,
                    number: true,
                    icon: ICON_RELATIVE
                }
            }
            return {
                id: shortid.generate(),
                type: 'removed',
                value: '',
                icon: ICON_REMOVE
            };
        },

        buildHeightGuide() {
            if (this.item.autoLayout.rules.hasOwnProperty('height')) {
                return {
                    id: shortid.generate(),
                    type: 'absolute',
                    value: this.item.autoLayout.rules.height,
                    number: true,
                    icon: ICON_ABSOLUTE,
                };
            } else if (this.item.autoLayout.rules.hasOwnProperty('relHeight')) {
                return {
                    id: shortid.generate(),
                    type: 'relative',
                    value: this.item.autoLayout.rules.relHeight,
                    number: true,
                    icon: ICON_RELATIVE
                }
            }
            return {
                id: shortid.generate(),
                type: 'removed',
                value: '',
                icon: ICON_REMOVE
            };
        },
    },

    computed: {
    }
}
</script>