<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="item-properties">
        <ul class="button-group">
            <li v-for="tab in tabs">
                <span class="toggle-button" @click="currentTab = tab.name"
                    :class="{'toggled': tab.name === currentTab}">
                    <i :class="[tab.icon]"></i>
                </span>
            </li>
        </ul>

        <general-panel v-if="currentTab === 'description'" :key="`general-panel-${item.id}`" :project-id="projectId" :item="item"/>
        <links-panel v-if="currentTab === 'description'" :key="`links-panel-${item.id}`" :projectId="projectId" :item="item"/>
        <position-panel v-if="currentTab === 'position'"
            :key="`position-panel-${item.id}`"
            :item="item"
            @item-transform-type-changed="onItemTransformTypeChanged"
            @item-area-changed="onItemAreaChanged"
            />

        <behavior-properties v-if="currentTab === 'behavior'"
            :key="`behavior-panel-${item.id}`"
            :project-id="projectId"
            :item="item"
            :scheme-container="schemeContainer"
            @item-field-changed="emitItemFieldChange(arguments[0], arguments[1])"
            />

        <div v-if="currentTab === 'styles'">
            <styles-palette :key="`styles-palette-for-item-${item.id}`" :item="item" @style-applied="onStyleApplied"/>
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
                            <td class="label" width="50%">Blend mode</td>
                            <td class="value" width="50%">
                                <select :value="item.blendMode" @input="emitItemFieldChange('blendMode', arguments[0].target.value)">
                                    <option v-for="blendMode in knownBlendModes">{{blendMode}}</option>
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
                        <tr>
                            <td class="label" width="50%">Cursor</td>
                            <td class="value" width="50%">
                                <select :value="item.cursor" @input="emitItemFieldChange('cursor', arguments[0].target.value)">
                                    <option v-for="cursor in knownCursors">{{cursor}}</option>
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
                            <td class="label" width="50%">Shape</td>
                            <td class="value" width="50%">
                                <select :value="item.shape" @input="$emit('shape-changed', arguments[0].target.value)">
                                    <option v-for="shape in knownShapes">{{shape}}</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Fill &amp; Stroke" v-if="shapeComponent.shapeType === 'standard'">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Fill</td>
                            <td class="value" width="50%">
                                <advanced-color-editor :project-id="projectId" :value="item.shapeProps.fill" width="100%" @changed="emitShapePropChange('fill', 'advanced-color', arguments[0])" />
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Stroke</td>
                            <td class="value" width="50%">
                                <color-picker :color="item.shapeProps.strokeColor" @input="emitShapePropChange('strokeColor', 'color', arguments[0])"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Stroke Size</td>
                            <td class="value" width="50%">
                                <number-textfield :value="item.shapeProps.strokeSize" @changed="emitShapePropChange('strokeSize', 'number', arguments[0])" :min="0"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Stroke Pattern</td>
                            <td class="value" width="50%">
                                <stroke-pattern-dropdown :value="item.shapeProps.strokePattern" @selected="emitShapePropChange('strokePattern', 'stroke-pattern', arguments[0])"/>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Shape Properties">
                <table class="properties-table">
                    <tbody>
                        <tr v-for="(arg, argName) in shapeComponent.args" v-if="shapePropsControlStates[argName] && shapePropsControlStates[argName].shown">
                            <td class="label" width="50%">
                                {{arg.name}}
                                <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input v-if="arg.type === 'string'" class="textfield" :value="item.shapeProps[argName]" @input="emitShapePropChange(argName, arg.type, arguments[0])"/>

                                <number-textfield v-if="arg.type === 'number'" :value="item.shapeProps[argName]" @changed="emitShapePropChange(argName, arg.type, arguments[0])" :min="minForShapeProp(arg)" :max="maxForShapeProp(arg)"/>

                                <color-picker v-if="arg.type === 'color'" :color="item.shapeProps[argName]" @input="emitShapePropChange(argName, arg.type, arguments[0])"></color-picker>

                                <advanced-color-editor v-if="arg.type === 'advanced-color'" :project-id="projectId" :value="item.shapeProps[argName]" @changed="emitShapePropChange(argName, arg.type, arguments[0])" />

                                <input v-if="arg.type === 'boolean'" type="checkbox" :checked="item.shapeProps[argName]" @input="emitShapePropChange(argName, arg.type, arguments[0].srcElement.checked)"/>

                                <select v-if="arg.type === 'choice'" :value="item.shapeProps[argName]" @input="emitShapePropChange(argName, arg.type, arguments[0].target.value)">
                                    <option v-for="argOption in arg.options">{{argOption}}</option>
                                </select>

                                <stroke-pattern-dropdown v-if="arg.type === 'stroke-pattern'" :value="item.shapeProps[argName]" @selected="emitShapePropChange(argName, arg.type, arguments[0])"/>

                                <element-picker v-if="arg.type === 'element'"
                                    :element="item.shapeProps[argName]"
                                    :use-self="false"
                                    :allow-none="true"
                                    :scheme-container="schemeContainer"
                                    :excluded-item-ids="[item.id]"
                                    @selected="emitShapePropChange(argName, arg.type, arguments[0])"
                                    />

                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>
        </div>

    </div>
</template>

<script>
import map from 'lodash/map';
import indexOf from 'lodash/indexOf';
import mapValues from 'lodash/mapValues';
import forEach from 'lodash/forEach';
import keys from 'lodash/keys';
import utils from '../../../utils';
import EventBus from '../EventBus.js';
import Panel from '../Panel.vue';
import Tooltip from '../../Tooltip.vue';
import GeneralPanel from './GeneralPanel.vue';
import PositionPanel from './PositionPanel.vue';
import LinksPanel from './LinksPanel.vue';
import Shape from '../items/shapes/Shape.js';
import ColorPicker from '../ColorPicker.vue';
import AdvancedColorEditor from '../AdvancedColorEditor.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import StrokePattern from '../items/StrokePattern.js';
import {ItemInteractionMode} from '../../../scheme/Item.js';
import LimitedSettingsStorage from '../../../LimitedSettingsStorage';
import StylesPalette from './StylesPalette.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import ElementPicker from '../ElementPicker.vue';
import StrokePatternDropdown from '../StrokePatternDropdown.vue';
import myMath from '../../../myMath';


const ALL_TABS = [
    {name: 'description',   icon: 'fas fa-paragraph'},
    {name: 'shape',         icon: 'fas fa-vector-square'},
    {name: 'position',      icon: 'fas fa-map-marker-alt'},
    {name: 'behavior',      icon: 'far fa-hand-point-up'},
    {name: 'styles',        icon: 'fas fa-palette'}
];

const ALL_TABS_NAMES = map(ALL_TABS, tab => tab.name);

const tabsSettingsStorage = new LimitedSettingsStorage(window.localStorage, 'tabs-state', 100);

export default {
    props: ['projectId', 'item', 'schemeContainer', 'viewportLeft', 'viewportTop'],
    components: {
        Panel, Tooltip, ColorPicker,  PositionPanel, LinksPanel,
        GeneralPanel, BehaviorProperties, StylesPalette, NumberTextfield,
        ElementPicker, StrokePatternDropdown, AdvancedColorEditor
    },

    beforeMount() {
        let tab = tabsSettingsStorage.get(this.schemeContainer.scheme.id, ALL_TABS_NAMES[0]);
        if (indexOf(ALL_TABS_NAMES, tab) < 0) {
            tab = ALL_TABS_NAMES[0];
        }
        this.currentTab = tab;
    },

    mounted() {
        this.oldShape = this.item.shape;
        this.shapeComponent = Shape.make(this.item.shape);
        this.updateShapePropsDependencies();
    },

    data() {
        const shapeComponent = Shape.make(this.item.shape);
        const knownShapes = keys(Shape.shapeRegistry);
        knownShapes.sort();
        return {
            tabs: ALL_TABS,
            knownCursors: ['default', 'pointer', 'grab', 'crosshair', 'not-allowed', 'zoom-in', 'help', 'wait'],

            knownStrokePatterns: StrokePattern.patterns,

            knownShapes,
            currentTab: 'description',
            shapeComponent: shapeComponent,
            oldShape: this.item.shape,
            knownBlendModes: [  'normal', 'multiply', 'screen', 'overlay', 'darken', 
                                'lighten', 'color-dodge', 'color-burn', 'difference',
                                'exclusion', 'hue', 'saturation', 'color', 'luminosity'
            ],

            shapePropsControlStates: mapValues(shapeComponent.args, () => {return {shown: true};}),
            knownInteractionModes: ItemInteractionMode.values(),

        };
    },

    methods: {
        emitItemFieldChange(name, value) {
            this.$emit('item-field-changed', name, value);
        },

        emitShapePropChange(name, type, value) {
            this.$emit('shape-prop-changed', name, type, value);
        },

        updateShapePropsDependencies() {
            forEach(this.shapeComponent.args, (argConfig, argName) => {
                if (argConfig.type === 'curve-points' || (argConfig.hasOwnProperty('hidden') && argConfig.hidden === true)) {
                    this.shapePropsControlStates[argName].shown = false;
                } else if (argConfig.depends) {
                    forEach(argConfig.depends, (depArgValue, depArgName) => {
                        const shown = this.item.shapeProps[depArgName] === depArgValue;
                        if (!this.shapePropsControlStates[argName]) {
                            this.shapePropsControlStates[argName] = {shown: shown};
                        } else {
                            this.shapePropsControlStates[argName].shown = shown;
                        }
                    });
                }
            });
        },

        minForShapeProp(arg) {
            if (arg.hasOwnProperty('min')) {
                return arg.min;
            }
            return null;
        },

        maxForShapeProp(arg) {
            if (arg.hasOwnProperty('max')) {
                return arg.max;
            }
            return null;
        },

        onStyleApplied(style) {
            this.$emit('item-style-applied', style);
        },

        onItemAreaChanged(propertyPath) {
            this.schemeContainer.updateAllMultiItemEditBoxes();
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${propertyPath}`);
        },

        onItemTransformTypeChanged(areaType) {
            if (this.item.area.type === areaType) {
                return;
            }

            let screenPoint = null;
            const worldPoint = this.schemeContainer.worldPointOnItem(0, 0, this.item);
            if (this.item.area.type === 'viewport') {
                screenPoint = worldPoint;
            } else {
                screenPoint = myMath.worldPointToViewport(this.schemeContainer.screenTransform, worldPoint.x, worldPoint.y);
            }

            // Since item transform has changed we need to make sure it is not attached to items with other transform
            if (this.item.meta && this.item.meta.parentId) {
                const parentItem = this.schemeContainer.findItemById(this.item.meta.parentId);
                if (parentItem && parentItem.area.type !== this.item.area.type) {
                    this.schemeContainer.remountItemToRoot(this.item.id);
                }
            }

            this.item.area.type = areaType;

            // now recalculating item new position so that it stays on the same place in screen
            if (areaType === 'viewport') {
                this.item.area.x = screenPoint.x - this.viewportLeft;
                this.item.area.y = screenPoint.y - this.viewportTop;
            } else {
                const recalculatedWorldPoint = myMath.viewportPointToWorld(this.schemeContainer.screenTransform, screenPoint.x + this.viewportLeft, screenPoint.y + this.viewportTop);
                this.item.area.x = recalculatedWorldPoint.x;
                this.item.area.y = recalculatedWorldPoint.y;
            }

            // need to preform a full reindex since item was moved in/out viewport/world coords
            this.schemeContainer.reindexItems();
            this.schemeContainer.updateAllMultiItemEditBoxes();
            EventBus.emitItemChanged(this.item.id, 'area.type');
        }
    },

    watch: {
        currentTab(value) {
            tabsSettingsStorage.save(this.schemeContainer.scheme.id, value);
        }
    }
}
</script>

<style lang="css">
</style>
