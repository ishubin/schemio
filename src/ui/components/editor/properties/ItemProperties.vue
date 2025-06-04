<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="item-properties">
        <ul class="button-group">
            <li v-for="tab in tabs">
                <span class="toggle-button" @click="currentTab = tab.name"
                    :class="{'toggled': tab.name === currentTab}"
                    :title="tab.displayName">
                    <i :class="[tab.icon]"></i>
                </span>
            </li>
        </ul>

        <div class="msg msg-info msg-small" v-if="isTemplatedChild">
            This item was generated with template. Modifications to this item are discouraged.
            Consider applying changes to the item in the "Template" tab.
        </div>


        <GeneralPanel v-if="currentTab === 'description'"
            :key="`general-panel-${item.id}`"
            :editorId="editorId"
            :item="item"
            :schemeContainer="schemeContainer"
            @tags-changed="emitItemFieldChange('tags', $event)"/>
        <LinksPanel v-if="currentTab === 'description'" :editorId="editorId" :key="`links-panel-${item.id}`" :item="item"/>

        <div v-if="currentTab === 'behavior'">
            <BehaviorProperties
                :key="`behavior-panel-${item.id}-${behaviorPanelRevision}`"
                :editorId="editorId"
                :item="item"
                :scheme-container="schemeContainer"
                :onlyEvents="false"
                @item-field-changed="emitItemFieldChange(arguments[0], arguments[1])"
                @jumped-to-item="onJumpedToItem"
                />
        </div>

        <div v-if="currentTab === 'auto-layout' && item">
            <AutoLayoutProperties
                :key="`auto-layout-properties-panel-${item.id}`"
                :editorId="editorId"
                :item="item"
                :schemeContainer="schemeContainer"
                />
        </div>


        <div v-if="currentTab === 'styles'">
            <StylesPalette :key="`styles-palette-for-item-${item.id}`" :userStylesEnabled="userStylesEnabled" :item="item" @style-applied="onStyleApplied"/>
        </div>

        <div v-if="currentTab === 'effects'">
            <EffectsPanel :key="`effects-panel-${item.id}`"
                :editorId="editorId"
                :item="item"
                :schemeContainer="schemeContainer"
                />
        </div>


        <div v-if="currentTab === 'shape'">
            <panel name="General" uid="general-item-properties">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Opacity</td>
                            <td class="value" width="50%">
                                <NumberTextfield :value="item.opacity" @changed="emitItemFieldChange('opacity', $event)" :min="0" :max="100" :slider="true"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Self Opacity</td>
                            <td class="value" width="50%">
                                <NumberTextfield :value="item.selfOpacity" @changed="emitItemFieldChange('selfOpacity', $event)" :min="0" :max="100" :slider="true"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Cursor</td>
                            <td class="value" width="50%">
                                <select :value="item.cursor" @input="emitItemFieldChange('cursor', $event.target.value)">
                                    <option v-for="cursor in knownCursors">{{cursor}}</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Shape Properties" v-if="hasShapeArgs">
                <div v-if="shapeComponent.editorProps && shapeComponent.editorProps.shapePropsEditor &&  shapeComponent.editorProps.shapePropsEditor.component">
                    <component
                        :key="`shape-properties-editor-${item.shape}-${item.id}`"
                        :is="shapeComponent.editorProps.shapePropsEditor.component"
                        :editorId="editorId"
                        :item="item"
                        :refreshKey="shapePropsEditorKey"
                        @shape-prop-changed="onShapePropChange"
                        @item-mutated="onItemMutated"
                    />
                </div>
                <table v-else class="properties-table">
                    <tbody>
                        <tr v-for="(arg, argName) in shapeComponent.args" v-if="shapePropsControlStates[argName] && !isArgumentHidden(arg)">
                            <td class="label" width="50%" :class="{disabled: !shapePropsControlStates[argName].shown}">
                                {{arg.name}}
                                <tooltip v-if="arg.description" :disabled="!shapePropsControlStates[argName].shown">{{arg.description}}</tooltip>
                            </td>
                            <td class="value" width="50%">
                                <PropertyInput
                                    :key="`prop-input-${item.id}-${item.shape}-${argName}-${item.shapeProps.thick}`"
                                    :editorId="editorId"
                                    :descriptor="arg"
                                    :value="item.shapeProps[argName]"
                                    :shapeProps="item.shapeProps"
                                    :disabled="!shapePropsControlStates[argName].shown"
                                    :schemeContainer="schemeContainer"
                                    :leftOriented="argName === 'sourceCap'"
                                    :itemId="item.id"
                                    @input="onShapePropChange(argName, arg.type, $event)"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <PositionPanel
                v-if="schemeContainer.editBox"
                :key="`position-panel-${item.id}-${schemeContainer.editBox.id}`"
                :editorId="editorId"
                :edit-box="schemeContainer.editBox"
                :item="item"
                @area-changed="onPositionPanelAreaChanged"
                @scale-changed="onPositionPanelScaleChanged"
                />

            <panel name="Advanced">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Blend mode</td>
                            <td class="value" width="50%">
                                <select :value="item.blendMode" @input="emitItemFieldChange('blendMode', $event.target.value)">
                                    <option v-for="blendMode in knownBlendModes">{{blendMode}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Visible</td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.visible" @input="emitItemFieldChange('visible', $event.target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">
                                Clip children
                                <tooltip>Only renders parts of the child items that are located inside the visible shape of the parent item</tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.clip" @input="emitItemFieldChange('clip', $event.target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">
                                Weld
                                <tooltip>
                                    If enabled, the item will not be selectable, and connectors will not attach to it.
                                    It will be treated as part of the parent item, which will receive all mouse events instead.
                                </tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.weld" @input="emitItemFieldChange('weld', $event.target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">
                                Allow mounting
                                <tooltip>
                                    Allows mounting of other items to this item.
                                    You can disable it if you don't want other items to be automatically mounted to it.
                                </tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.mount" @input="emitItemFieldChange('mount', $event.target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Shape</td>
                            <td class="value" width="50%">
                                <select :value="item.shape" @input="$emit('shape-changed', $event.target.value)">
                                    <option v-for="shape in knownShapes">{{shape}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">
                                Interaction Mode
                                <tooltip>
                                    Specifies item default behavior on click.
                                    "side-panel" or "tooltip" modes are only used in case item has a non-empty description
                                </tooltip>
                            </td>
                            <td class="value" width="50%">
                                <select :value="item.interactionMode" @input="emitItemFieldChange('interactionMode', $event.target.value)">
                                    <option v-for="interactionMode in knownInteractionModes"
                                        :value="interactionMode"
                                        :key="interactionMode">{{interactionMode}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr v-if="item.interactionMode === 'tooltip'">
                            <td class="label" width="50%">Tooltip Background</td>
                            <td class="value" width="50%">
                                <color-picker :editorId="editorId" :color="item.tooltipBackground" @input="emitItemFieldChange('tooltipBackground', $event)"></color-picker>
                            </td>
                        </tr>
                        <tr v-if="item.interactionMode === 'tooltip'">
                            <td class="label" width="50%">Tooltip Color</td>
                            <td class="value" width="50%">
                                <color-picker :editorId="editorId" :color="item.tooltipColor" @input="emitItemFieldChange('tooltipColor', $event)"></color-picker>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>
        </div>
    </div>
</template>

<script>
import {forEach, map, mapObjectValues, indexOf } from '../../../collections';
import EditorEventBus from '../EditorEventBus.js';
import Panel from '../Panel.vue';
import Tooltip from '../../Tooltip.vue';
import GeneralPanel from './GeneralPanel.vue';
import PositionPanel from './PositionPanel.vue';
import LinksPanel from './LinksPanel.vue';
import Shape from '../items/shapes/Shape.js';
import ColorPicker from '../ColorPicker.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import {ItemInteractionMode, supportedCursorOptions} from '../../../scheme/Item.js';
import {knownBlendModes} from '../../../scheme/ItemConst';
import {createSettingStorageFromLocalStorage} from '../../../LimitedSettingsStorage';
import StylesPalette from './StylesPalette.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import { DEFAULT_ITEM_MODIFICATION_CONTEXT, ITEM_MODIFICATION_CONTEXT_RESIZED, ITEM_MODIFICATION_CONTEXT_ROTATED } from '../../../scheme/SchemeContainer.js';
import StoreUtils from '../../../store/StoreUtils.js';
import PropertyInput from './PropertyInput.vue';
import utils from '../../../utils.js';
import myMath from '../../../myMath.js';
import AutoLayoutProperties from './AutoLayoutProperties.vue';
import EffectsPanel from './EffectsPanel.vue';

const ALL_TABS = [
    {name: 'description', displayName: 'Description',       icon: 'fas fa-paragraph'},
    {name: 'shape',       displayName: 'Shape Properties',  icon: 'fas fa-vector-square'},
    {name: 'behavior',    displayName: 'Behavior (Script)', icon: 'fas fa-running'},
    {name: 'auto-layout', displayName: 'Auto-layout',       icon: 'fa-solid fa-ruler'},
    {name: 'effects',     displayName: 'Effects',           icon: 'fa-solid fa-wand-magic-sparkles'},
    {name: 'styles',      displayName: 'Style Palette',     icon: 'fas fa-palette'},
];

const ALL_TABS_NAMES = map(ALL_TABS, tab => tab.name);

const tabsSettingsStorage = createSettingStorageFromLocalStorage('tabs-state', 100);

export default {
    props: {
        editorId: {type: String, required: true},
        item: { type: Object },
        schemeContainer: { type: Object },
        userStylesEnabled: { type: Boolean, default: false}
    },
    components: {
    Panel, Tooltip, ColorPicker, PositionPanel, LinksPanel,
    GeneralPanel, BehaviorProperties, StylesPalette, NumberTextfield,
    PropertyInput, AutoLayoutProperties, EffectsPanel
},

    beforeMount() {
        let tab = tabsSettingsStorage.get(this.schemeContainer.scheme.id, ALL_TABS_NAMES[0]);
        if (indexOf(ALL_TABS_NAMES, tab) < 0) {
            tab = ALL_TABS_NAMES[0];
        }
        this.currentTab = tab;
        EditorEventBus.behaviorPanel.requested.$on(this.editorId, this.onBehaviorPanelRequested);
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EditorEventBus.behaviorPanel.requested.$off(this.editorId, this.onBehaviorPanelRequested);
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },

    mounted() {
        this.oldShape = this.item.shape;
        this.shapeComponent = Shape.find(this.item.shape);
        this.updateShapePropsDependencies();
    },

    data() {
        const shapeComponent = Shape.find(this.item.shape);
        const knownShapes = Shape.getShapeIds();
        knownShapes.sort();
        return {
            tabs: ALL_TABS,
            knownCursors: supportedCursorOptions,

            knownShapes,
            currentTab: 'description',
            shapeComponent: shapeComponent,
            oldShape: this.item.shape,
            knownBlendModes: utils.clone(knownBlendModes),

            shapePropsControlStates: shapeComponent ? mapObjectValues(shapeComponent.args, () => {return {shown: true};}) : {},
            knownInteractionModes: ItemInteractionMode.values(),

            behaviorPanelRevision: 1,

            shapePropsEditorKey: 1
        };
    },

    methods: {
        updateCurrentItem(property, callback) {
            this.schemeContainer.updateItem(this.item.id, property, callback);
        },

        onItemChanged() {
            this.shapePropsEditorKey += 1;
            this.$forceUpdate();
        },

        emitItemFieldChange(name, value) {
            this.$emit('item-field-changed', name, value);
        },

        onItemMutated() {
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.updateShapePropsDependencies();
            this.$forceUpdate();
        },

        onShapePropChange(name, type, value) {
            // handling onUpdate shape arg callback (used in swim lane item and code_block)
            this.updateCurrentItem(`shapeProps.${name}`, item => {
                const shape = Shape.find(item.shape);
                if (shape && shape.args[name]) {
                    const argConfig = shape.args[name];
                    if (argConfig.onUpdate) {
                        const previousValue = item.shapeProps[name];
                        item.shapeProps[name] = value;
                        argConfig.onUpdate(this.$store, item, value, previousValue);
                        EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `shapeProps.${name}`);
                    }
                }

                if (type !== 'color' && type !== 'advanced-color') {
                    this.schemeContainer.updateEditBox();
                }
                this.$emit('shape-prop-changed', name, type, value);
                this.updateShapePropsDependencies();

                this.$forceUpdate();
            });
        },

        updateShapePropsDependencies() {
            if (!this.shapeComponent) {
                return;
            }
            forEach(this.shapeComponent.args, (argConfig, argName) => {
                if (argConfig.depends) {
                    let shown = true;
                    forEach(argConfig.depends, (depArgValue, depArgName) => {
                        if (Array.isArray(depArgValue)) {
                            let hasMatchingValue = false;
                            for (let i = 0; i < depArgValue.length && !hasMatchingValue; i++) {
                                hasMatchingValue = this.item.shapeProps[depArgName] === depArgValue[i];
                            }
                            shown = shown & hasMatchingValue;
                        } else {
                            shown = shown & this.item.shapeProps[depArgName] === depArgValue;
                        }
                    });
                    if (!this.shapePropsControlStates[argName]) {
                        this.shapePropsControlStates[argName] = {shown: shown};
                    } else {
                        this.shapePropsControlStates[argName].shown = shown;
                    }
                }
            });
        },

        isArgumentHidden(argConfig) {
            return argConfig.type === 'path-points' || argConfig.type === 'animations' || (argConfig.hasOwnProperty('hidden') && argConfig.hidden === true);
        },

        onStyleApplied(style) {
            this.$emit('item-style-applied', style);
        },

        onPositionPanelAreaChanged(areaProperty, value) {
            const box = this.schemeContainer.editBox;

            if (box) {
                if (areaProperty === 'w' || areaProperty === 'h') {
                    box.area[areaProperty] = value;
                    this.schemeContainer.updateEditBoxItems(box, false, ITEM_MODIFICATION_CONTEXT_RESIZED);
                    if (box.items.length === 1) {
                        StoreUtils.setItemControlPoints(this.$store, box.items[0]);
                    }
                } else if (areaProperty === 'r') {
                    box.area.r = value;
                    const worldPivotPoint = myMath.worldPointInArea(box.pivotPoint.x * box.area.w, box.pivotPoint.y * box.area.h, box.area);
                    box.area.x += box.worldPivotPoint.x - worldPivotPoint.x;
                    box.area.y += box.worldPivotPoint.y - worldPivotPoint.y;

                    this.schemeContainer.updateEditBoxItems(box, false, ITEM_MODIFICATION_CONTEXT_ROTATED);
                } else {
                    box.area[areaProperty] = value;
                    this.schemeContainer.updateEditBoxItems(box, false, DEFAULT_ITEM_MODIFICATION_CONTEXT);
                }
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `editbox.area.${areaProperty}`);
            }
        },

        onPositionPanelScaleChanged(sx, sy) {
            if (this.schemeContainer.editBox) {
                if (this.schemeContainer.editBox.items.length === 1) {
                    const item = this.schemeContainer.editBox.items[0];

                    if (sx > 0) {
                        item.area.sx = sx;
                    }
                    if (sy > 0) {
                        item.area.sy = sy;
                    }

                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area.sx');
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `editbox.area.s`);
                    this.schemeContainer.updateEditBoxAreaOnly();
                    this.schemeContainer.updateChildTransforms(this.schemeContainer.editBox.items[0]);
                    EditorEventBus.editBox.updated.$emit(this.editorId);
                }
            }
        },

        // triggered from behavior properties when user wants to jump to another item
        onJumpedToItem(item) {
            if (!item) {
                return;
            }
            this.schemeContainer.selectItem(item);
        },

        onBehaviorPanelRequested() {
            this.behaviorPanelRevision += 1;
            this.currentTab = 'behavior';
        },
    },
    computed: {
        isTemplatedChild() {
            return (this.item.args && this.item.args.templated && !this.item.args.templateRef);
        },
        hasShapeArgs() {
            const shape = Shape.find(this.item.shape);
            if (shape && shape.args) {
                return Object.keys(shape.args).length > 0;
            }
            return false;
        },
    },

    watch: {
        currentTab(value) {
            tabsSettingsStorage.save(this.schemeContainer.scheme.id, value);
        }
    },
}
</script>

<style lang="css">
</style>
