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

        <GeneralPanel v-if="currentTab === 'description'"
            :key="`general-panel-${item.id}`"
            :editorId="editorId"
            :item="item"
            :schemeContainer="schemeContainer"
            @tags-changed="emitItemFieldChange('tags', arguments[0])"/>
        <LinksPanel v-if="currentTab === 'description'" :editorId="editorId" :key="`links-panel-${item.id}`" :item="item"/>

        <div v-if="currentTab === 'behavior'">
            <span class="btn btn-secondary" @click="toggleBehaviorEditorModal">Advanced Mode</span>
            <BehaviorProperties
                :key="`behavior-panel-${item.id}-${behaviorPanelRevision}`"
                :editorId="editorId"
                :item="item"
                :scheme-container="schemeContainer"
                @item-field-changed="emitItemFieldChange(arguments[0], arguments[1])"
                @jumped-to-item="onJumpedToItem"
                />
        </div>

        <div v-if="currentTab === 'styles'">
            <styles-palette :key="`styles-palette-for-item-${item.id}`" :userStylesEnabled="userStylesEnabled" :item="item" @style-applied="onStyleApplied"/>
        </div>

        <div v-if="currentTab === 'effects'">
            <div class="hint hint-small" v-if="!item.effects || item.effects.length === 0">There are no effects yet</div>
            <ul class="effects-list" v-else>
                <li v-for="(effect, effectIndex) in item.effects">

                    <div class="effect-name" @click="openEditEffectModal(effectIndex)">{{effect.name | prettyEffectName}}</div>

                    <div class="effect-right-panel">
                        <span class="icon icon-effect-edit" @click="openEditEffectModal(effectIndex)">
                            <i class="fas fa-edit"></i>
                        </span>
                        <span class="icon icon-effect-delete" @click="deleteEffect(effectIndex)">
                            <i class="fas fa-times"></i>
                        </span>

                    </div>
                </li>
            </ul>
            <span class="btn btn-secondary" @click="startAddingEffect">Add Effect</span>
        </div>


        <div v-if="currentTab === 'shape'">
            <panel name="General" uid="general-item-properties">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Opacity</td>
                            <td class="value" width="50%">
                                <number-textfield :value="item.opacity" @changed="emitItemFieldChange('opacity', arguments[0])" :min="0" :max="100"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Self Opacity</td>
                            <td class="value" width="50%">
                                <number-textfield :value="item.selfOpacity" @changed="emitItemFieldChange('selfOpacity', arguments[0])" :min="0" :max="100"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Cursor</td>
                            <td class="value" width="50%">
                                <select :value="item.cursor" @input="emitItemFieldChange('cursor', arguments[0].target.value)">
                                    <option v-for="cursor in knownCursors">{{cursor}}</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Shape Properties" v-if="hasShapeArgs">
                <table class="properties-table">
                    <tbody>
                        <tr v-for="(arg, argName) in shapeComponent.args" v-if="shapePropsControlStates[argName] && !isArgumentHidden(arg)">
                            <td class="label" width="50%" :class="{disabled: !shapePropsControlStates[argName].shown}">
                                {{arg.name}}
                                <tooltip v-if="arg.description" :disabled="!shapePropsControlStates[argName].shown">{{arg.description}}</tooltip>
                            </td>
                            <td class="value" width="50%">
                                <PropertyInput
                                    :key="`prop-input-${item.id}-${item.shape}-${argName}-${item.shapeProps.fat}`"
                                    :editorId="editorId"
                                    :descriptor="arg"
                                    :value="item.shapeProps[argName]"
                                    :shapeProps="item.shapeProps"
                                    :disabled="!shapePropsControlStates[argName].shown"
                                    :schemeContainer="schemeContainer"
                                    :leftOriented="argName === 'sourceCap'"
                                    :itemId="item.id"
                                    @input="onShapePropChange(argName, arg.type, arguments[0])"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <PositionPanel
                v-if="schemeContainer.multiItemEditBox"
                :key="`position-panel-${item.id}-${schemeContainer.multiItemEditBox.id}`"
                :editorId="editorId"
                :edit-box="schemeContainer.multiItemEditBox"
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
                                <select :value="item.blendMode" @input="emitItemFieldChange('blendMode', arguments[0].target.value)">
                                    <option v-for="blendMode in knownBlendModes">{{blendMode}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Visible</td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.visible" @input="emitItemFieldChange('visible', arguments[0].target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">
                                Clip children
                                <tooltip>Only renders parts of the child items that are located inside the visible shape of the parent item</tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.clip" @input="emitItemFieldChange('clip', arguments[0].target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Shape</td>
                            <td class="value" width="50%">
                                <select :value="item.shape" @input="$emit('shape-changed', arguments[0].target.value)">
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
                                <select :value="item.interactionMode" @input="emitItemFieldChange('interactionMode', arguments[0].target.value)">
                                    <option v-for="interactionMode in knownInteractionModes"
                                        :value="interactionMode"
                                        :key="interactionMode">{{interactionMode}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr v-if="item.interactionMode === 'tooltip'">
                            <td class="label" width="50%">Tooltip Background</td>
                            <td class="value" width="50%">
                                <color-picker :color="item.tooltipBackground" @input="emitItemFieldChange('tooltipBackground', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr v-if="item.interactionMode === 'tooltip'">
                            <td class="label" width="50%">Tooltip Color</td>
                            <td class="value" width="50%">
                                <color-picker :color="item.tooltipColor" @input="emitItemFieldChange('tooltipColor', arguments[0])"></color-picker>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>
        </div>

        <EditEffectModal v-if="editEffectModal.shown"
            :key="`edit-effect-modal-${item.id}-${editEffectModal.currentEffectIndex}-${editEffectModal.effectId}`"
            :editorId="editorId"
            :isAdding="editEffectModal.isAdding"
            :effectId="editEffectModal.effectId"
            :effectArgs="editEffectModal.effectArgs"
            :schemeContainer="schemeContainer"
            @close="effectModalClosed"
            @effect-submited="onEffectSubmited"
            @effect-arg-changed="onEffectArgChanged"
            @effect-name-changed="onEffectNameChanged"
            @effect-id-changed="onEffectIdChanged"
            />
    </div>
</template>

<script>
import map from 'lodash/map';
import indexOf from 'lodash/indexOf';
import mapValues from 'lodash/mapValues';
import forEach from 'lodash/forEach';
import EditorEventBus from '../EditorEventBus.js';
import Panel from '../Panel.vue';
import Tooltip from '../../Tooltip.vue';
import GeneralPanel from './GeneralPanel.vue';
import PositionPanel from './PositionPanel.vue';
import LinksPanel from './LinksPanel.vue';
import Shape from '../items/shapes/Shape.js';
import ColorPicker from '../ColorPicker.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import AdvancedBehaviorProperties from './AdvancedBehaviorProperties.vue';
import {ItemInteractionMode} from '../../../scheme/Item.js';
import {knownBlendModes} from '../../../scheme/ItemConst';
import {createSettingStorageFromLocalStorage} from '../../../LimitedSettingsStorage';
import StylesPalette from './StylesPalette.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import EditEffectModal from '../../effects/EditEffectModal.vue';
import { DEFAULT_ITEM_MODIFICATION_CONTEXT, ITEM_MODIFICATION_CONTEXT_RESIZED, ITEM_MODIFICATION_CONTEXT_ROTATED } from '../../../scheme/SchemeContainer.js';
import StoreUtils from '../../../store/StoreUtils.js';
import { getDefaultEffectId, findEffect, generateEffectArgs } from '../../effects/Effects.js';
import PropertyInput from './PropertyInput.vue';
import utils from '../../../utils.js';
import myMath from '../../../myMath.js';
import shortid from 'shortid';

const ALL_TABS = [
    {name: 'description', displayName: 'Description',       icon: 'fas fa-paragraph'},
    {name: 'shape',       displayName: 'Shape Properties',  icon: 'fas fa-vector-square'},
    {name: 'behavior',    displayName: 'Behavior (Script)', icon: 'fas fa-running'},
    {name: 'effects',     displayName: 'Effects',           icon: 'fa-solid fa-wand-magic-sparkles'},
    {name: 'styles',      displayName: 'Style Palette',     icon: 'fas fa-palette'}
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
        Panel, Tooltip, ColorPicker,  PositionPanel, LinksPanel,
        GeneralPanel, BehaviorProperties, AdvancedBehaviorProperties, StylesPalette, NumberTextfield,
        EditEffectModal, PropertyInput
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
            knownCursors: ['default', 'pointer', 'grab', 'crosshair', 'not-allowed', 'zoom-in', 'help', 'wait'],

            knownShapes,
            currentTab: 'description',
            shapeComponent: shapeComponent,
            oldShape: this.item.shape,
            knownBlendModes: utils.clone(knownBlendModes),

            shapePropsControlStates: shapeComponent ? mapValues(shapeComponent.args, () => {return {shown: true};}) : {},
            knownInteractionModes: ItemInteractionMode.values(),

            behaviorPanelRevision: 1,

            editEffectModal: {
                effectId: 'drop-shadow',
                isAdding: true,
                shown: false,
                currentEffectIndex: -1,
                effectArgs: {}
            }
        };
    },

    methods: {
        onItemChanged() {
            this.$forceUpdate();
        },

        emitItemFieldChange(name, value) {
            this.$emit('item-field-changed', name, value);
        },

        onShapePropChange(name, type, value) {
            // handling onUpdate shape arg callback (used in swim lane item and code_block)
            const shape = Shape.find(this.item.shape);
            if (shape && shape.args[name]) {
                const argConfig = shape.args[name];
                if (argConfig.onUpdate) {
                    const previousValue = this.item.shapeProps[name];
                    this.item.shapeProps[name] = value;
                    argConfig.onUpdate(this.$store, this.item, value, previousValue);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, `shapeProps.${name}`);
                }
            }

            this.schemeContainer.updateMultiItemEditBox();
            this.$emit('shape-prop-changed', name, type, value);
            this.updateShapePropsDependencies();

            this.$forceUpdate();
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
            const box = this.schemeContainer.multiItemEditBox;

            if (box) {
                if (areaProperty === 'w' || areaProperty === 'h') {
                    box.area[areaProperty] = value;
                    this.schemeContainer.updateMultiItemEditBoxItems(box, false, ITEM_MODIFICATION_CONTEXT_RESIZED);
                    if (box.items.length === 1) {
                        StoreUtils.setItemControlPoints(this.$store, box.items[0]);
                    }
                } else if (areaProperty === 'r') {
                    box.area.r = value;
                    const worldPivotPoint = myMath.worldPointInArea(box.pivotPoint.x * box.area.w, box.pivotPoint.y * box.area.h, box.area);
                    box.area.x += box.worldPivotPoint.x - worldPivotPoint.x;
                    box.area.y += box.worldPivotPoint.y - worldPivotPoint.y;

                    this.schemeContainer.updateMultiItemEditBoxItems(box, false, ITEM_MODIFICATION_CONTEXT_ROTATED);
                } else {
                    box.area[areaProperty] = value;
                    this.schemeContainer.updateMultiItemEditBoxItems(box, false, DEFAULT_ITEM_MODIFICATION_CONTEXT);
                }
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `editbox.area.${areaProperty}`);
            }
        },

        onPositionPanelScaleChanged(sx, sy) {
            if (this.schemeContainer.multiItemEditBox) {
                if (this.schemeContainer.multiItemEditBox.items.length === 1) {
                    const item = this.schemeContainer.multiItemEditBox.items[0];

                    if (sx > 0) {
                        item.area.sx = sx;
                    }
                    if (sy > 0) {
                        item.area.sy = sy;
                    }

                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'area.sx');
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `editbox.area.s`);
                    this.schemeContainer.updateMultiItemEditBoxAreaOnly();
                    this.schemeContainer.updateChildTransforms(this.schemeContainer.multiItemEditBox.items[0]);
                    EditorEventBus.editBox.updated.$emit(this.editorId);
                }
            }
        },

        toggleBehaviorEditorModal() {
            this.$emit('clicked-advanced-behavior-editor');
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

        startAddingEffect() {
            const effectId = getDefaultEffectId();
            const effect = findEffect(effectId);
            this.editEffectModal.effectArgs = generateEffectArgs(effect);
            this.item.effects.push({
                id: shortid.generate(),
                effect: effectId,
                name: effect.name,
                args: this.editEffectModal.effectArgs
            });
            this.editEffectModal.isAdding = true;
            this.editEffectModal.effectId = effectId;
            this.editEffectModal.shown = true;
            this.editEffectModal.currentEffectIndex = this.item.effects.length - 1;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'effects');
        },

        effectModalClosed() {
            if (this.editEffectModal.isAdding) {
                if (this.editEffectModal.currentEffectIndex >= 0 && this.editEffectModal.currentEffectIndex < this.item.effects.length) {
                    this.item.effects.splice(this.editEffectModal.currentEffectIndex, 1);
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'effects');
            }
            this.editEffectModal.shown = false;
            this.editEffectModal.currentEffectIndex = -1;
        },

        onEffectArgChanged(argName, value) {
            if (this.editEffectModal.currentEffectIndex >= 0 && this.editEffectModal.currentEffectIndex < this.item.effects.length) {
                this.item.effects[this.editEffectModal.currentEffectIndex].args[argName] = value;
            }
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'effects');
        },

        onEffectNameChanged(name) {
            if (this.editEffectModal.currentEffectIndex >= 0 && this.editEffectModal.currentEffectIndex < this.item.effects.length) {
                this.item.effects[this.editEffectModal.currentEffectIndex].name = name;
            }
        },

        onEffectSubmited(effect) {
            this.editEffectModal.shown = false;
            if (this.editEffectModal.isAdding) {
                if (this.editEffectModal.currentEffectIndex >= 0 && this.editEffectModal.currentEffectIndex < this.item.effects.length) {
                    this.item.effects[this.editEffectModal.currentEffectIndex] = effect;
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'effects');
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
            }
        },

        openEditEffectModal(idx) {
            this.editEffectModal.currentEffectIndex = idx;
            this.editEffectModal.effectId = this.item.effects[idx].effect;
            this.editEffectModal.isAdding = false;
            this.editEffectModal.shown = true;
            this.editEffectModal.effectArgs = this.item.effects[idx].args;
        },

        deleteEffect(idx) {
            if (idx < 0 || idx >= this.item.effects.length) {
                return;
            }

            this.item.effects.splice(idx, 1);
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'effects');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.item.id}.effects`);
        },

        onEffectIdChanged(newEffectId) {
            if (this.editEffectModal.currentEffectIndex < 0 || this.editEffectModal.currentEffectIndex >= this.item.effects.length) {
                return;
            }

            const effect = findEffect(newEffectId);
            this.editEffectModal.effectArgs = generateEffectArgs(effect);
            this.editEffectModal.effectId = newEffectId;
            this.item.effects[this.editEffectModal.currentEffectIndex] = {
                id: this.item.effects[this.editEffectModal.currentEffectIndex].id,
                effect: newEffectId,
                name: effect.name,
                args: this.editEffectModal.effectArgs
            };
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id, 'effects');
        }
    },
    computed: {
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
    filters: {
        prettyEffectName(name) {
            if (!name) {
                return 'Unnamed Effect';
            }
            return name;
        }
    }
}
</script>

<style lang="css">
</style>
