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

        <general-panel v-if="currentTab === 'description'" :key="`general-panel-${item.id}-${revision}`" :project-id="projectId" :item="item"/>
        <links-panel v-if="currentTab === 'description'" :key="`links-panel-${item.id}-${revision}`" :projectId="projectId" :item="item"/>
        <connections-panel v-if="currentTab === 'description'" :key="`connections-panel-${item.id}-${revision}`" :item="item"/>
        <position-panel v-if="currentTab === 'position'" :key="`position-panel-${item.id}-${revision}`" :item="item"/>

        <behavior-properties v-if="currentTab === 'behavior'" :key="`behavior-panel-${item.id}-${revision}`" :item="item" :scheme-container="schemeContainer"/>

        <div v-if="currentTab === 'styles'">
            <styles-palette :key="`styles-palette-for-item-${item.id}`" :item="item" @style-applied="applyStyle"/>
        </div>

        <div v-if="currentTab === 'shape'">
            <panel name="General">
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Opacity</td>
                            <td class="value" width="50%">
                                <number-textfield :value="item.opacity" @changed="onOpacityChange" :min="0" :max="100"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Self Opacity</td>
                            <td class="value" width="50%">
                                <number-textfield :value="item.selfOpacity" @changed="onSelfOpacityChange" :min="0" :max="100"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Blend mode</td>
                            <td class="value" width="50%">
                                <select :value="item.blendMode" @input="onBlendModeChange(arguments[0].target.value)">
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
                                <select :value="item.interactionMode" @input="item.interactionMode = arguments[0].target.value; onInteractionModeChange()">
                                    <option v-for="interactionMode in knownInteractionModes"
                                        :value="interactionMode"
                                        :key="interactionMode">{{interactionMode}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr v-if="item.interactionMode === 'tooltip'">
                            <td class="label" width="50%">Tooltip Background</td>
                            <td class="value" width="50%">
                                <color-picker :color="item.tooltipBackground" @input="onTooltipBackgroundChange"></color-picker>
                            </td>
                        </tr>
                        <tr v-if="item.interactionMode === 'tooltip'">
                            <td class="label" width="50%">Tooltip Color</td>
                            <td class="value" width="50%">
                                <color-picker :color="item.tooltipColor" @input="onTooltipColorChange"></color-picker>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Cursor</td>
                            <td class="value" width="50%">
                                <select :value="item.cursor" @input="onCursorChange(arguments[0].target.value)">
                                    <option v-for="cursor in knownCursors">{{cursor}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Visible</td>
                            <td class="value" width="50%">
                                <input class="checkbox" type="checkbox" :checked="item.visible" @input="onVisibleChange(arguments[0].target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Shape</td>
                            <td class="value" width="50%">
                                <select :value="item.shape" @input="onShapeChange(arguments[0].target.value)">
                                    <option v-for="shape in knownShapes">{{shape}}</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Properties">
                <table class="properties-table">
                    <tbody>
                        <tr v-for="(arg, argName) in shapeComponent.args" v-if="shapePropsControlStates[argName] && shapePropsControlStates[argName].shown">
                            <td class="label" width="50%">
                                {{arg.name}}
                                <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                            </td>
                            <td class="value" width="50%">
                                <input v-if="arg.type === 'string'" class="textfield" :value="item.shapeProps[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>

                                <number-textfield v-if="arg.type === 'number'" :value="item.shapeProps[argName]" @changed="onStyleValueChange(argName, arguments[0])" :min="minForShapeProp(arg)" :max="maxForShapeProp(arg)"/>

                                <color-picker v-if="arg.type === 'color'" :color="item.shapeProps[argName]" @input="onStyleColorChange(argName, arguments[0])"></color-picker>

                                <div v-if="arg.type === 'image'" class="image-property-container">
                                    <input class="textfield" :value="item.shapeProps[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>
                                    <div class="upload-button-container">
                                        <div class="upload-button">
                                            <i class="fas fa-file-upload icon"></i>
                                            <input type="file" @change="onShapePropInputFileUploaded(argName, arguments[0])"/>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="arg.type === 'image'">
                                    <img :src="item.shapeProps[argName]" style="max-width: 60px; max-height: 60px;"/>
                                </div>
                                <input v-if="arg.type === 'boolean'" type="checkbox" :checked="item.shapeProps[argName]" @input="onStyleCheckboxChange(argName, arg, arguments[0])"/>

                                <select v-if="arg.type === 'choice'" :value="item.shapeProps[argName]" @input="onStyleSelectChange(argName, arg, arguments[0])">
                                    <option v-for="argOption in arg.options">{{argOption}}</option>
                                </select>

                                <stroke-pattern-dropdown v-if="arg.type === 'stroke-pattern'" :value="item.shapeProps[argName]" @selected="onStyleValueChange(argName, arguments[0])"/>

                                <element-picker v-if="arg.type === 'element'"
                                    :element="item.shapeProps[argName]"
                                    :use-self="false"
                                    :allow-none="true"
                                    :scheme-container="schemeContainer"
                                    :excluded-item-ids="[item.id]"
                                    @selected="onStyleValueChange(argName, arguments[0])"
                                    />

                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>
            <span class="btn btn-primary" @click="onSaveToStylesClicked">Save to styles</span>
            <span class="btn btn-primary" @click="onResetToDefaultsClicked">Reset to defaults</span>
        </div>

        <save-style-modal v-if="saveStyleModalShown" :item="item" @close="saveStyleModalShown = false"/>
    </div>
</template>

<script>
import _ from 'lodash';
import apiClient from '../../../apiClient';
import EventBus from '../EventBus.js';
import Panel from '../Panel.vue';
import Tooltip from '../../Tooltip.vue';
import GeneralPanel from './GeneralPanel.vue';
import PositionPanel from './PositionPanel.vue';
import LinksPanel from './LinksPanel.vue';
import ConnectionsPanel from './ConnectionsPanel.vue';
import Shape from '../items/shapes/Shape.js';
import ColorPicker from '../ColorPicker.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import StrokePattern from '../items/StrokePattern.js';
import Item from '../../../scheme/Item.js';
import LimitedSettingsStorage from '../../../LimitedSettingsStorage';
import SaveStyleModal from './SaveStyleModal.vue';
import StylesPalette from './StylesPalette.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import ElementPicker from '../ElementPicker.vue';
import StrokePatternDropdown from '../StrokePatternDropdown.vue';


const ALL_TABS = [
    {name: 'description',   icon: 'fas fa-paragraph'},
    {name: 'shape',         icon: 'fas fa-vector-square'},
    {name: 'position',      icon: 'fas fa-map-marker-alt'},
    {name: 'behavior',      icon: 'far fa-hand-point-up'},
    {name: 'styles',        icon: 'fas fa-palette'}
];

const ALL_TABS_NAMES = _.map(ALL_TABS, tab => tab.name);

const tabsSettingsStorage = new LimitedSettingsStorage(window.localStorage, 'tabs-state', 100);

export default {
    props: ['projectId', 'item', 'schemeContainer', 'revision'],
    components: {
        Panel, Tooltip, ColorPicker,  PositionPanel, LinksPanel,
        ConnectionsPanel, GeneralPanel, BehaviorProperties, SaveStyleModal,
        StylesPalette, NumberTextfield, ElementPicker, StrokePatternDropdown
    },

    beforeMount() {
        let tab = tabsSettingsStorage.get(this.schemeContainer.scheme.id, ALL_TABS_NAMES[0]);
        if (_.indexOf(ALL_TABS_NAMES, tab) < 0) {
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
        return {
            tabs: ALL_TABS,
            knownCursors: ['default', 'pointer', 'grab', 'crosshair', 'not-allowed', 'zoom-in', 'help', 'wait'],

            knownStrokePatterns: StrokePattern.patterns,

            knownShapes: _.chain(Shape.shapeReigstry).keys().sort().value(),
            currentTab: 'description',
            shapeComponent: shapeComponent,
            oldShape: this.item.shape,
            knownBlendModes: [  'normal', 'multiply', 'screen', 'overlay', 'darken', 
                                'lighten', 'color-dodge', 'color-burn', 'difference',
                                'exclusion', 'hue', 'saturation', 'color', 'luminosity'
            ],

            shapePropsControlStates: _.mapValues(shapeComponent.args, () => {return {shown: true};}),
            knownInteractionModes: Item.InteractionMode.values(),

            saveStyleModalShown: false
        };
    },

    methods: {
        onStyleValueChange(styleArgName, value) {
            this.item.shapeProps[styleArgName] = value;
            EventBus.emitItemChanged(this.item.id, `shapeProps.${styleArgName}`);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
            this.updateShapePropsDependencies();
        },
        onStyleInputChange(styleArgName, componentArg, event) {
            const text = event.target.value;
            if (componentArg.type === 'number') {
                this.item.shapeProps[styleArgName] = parseInt(text) || 0;
            } else {
                this.item.shapeProps[styleArgName] = text;
            }
            EventBus.emitItemChanged(this.item.id, `shapeProps.${styleArgName}`);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
            this.updateShapePropsDependencies();
        },
        onStyleCheckboxChange(styleArgName, componentArg, event) {
            this.item.shapeProps[styleArgName] = event.srcElement.checked;
            EventBus.emitItemChanged(this.item.id, `shapeProps.${styleArgName}`);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
            this.updateShapePropsDependencies();
        },
        onStyleColorChange(styleArgName, value) {
            this.item.shapeProps[styleArgName] = value;
            EventBus.emitItemChanged(this.item.id, `shapeProps.${styleArgName}`);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
            this.updateShapePropsDependencies();
        },
        onStyleSelectChange(styleArgName, componentArg, event) {
            const value = event.target.value;
            this.item.shapeProps[styleArgName] = value;
            EventBus.emitItemChanged(this.item.id, `shapeProps.${styleArgName}`);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
            this.updateShapePropsDependencies();
        },

        onShapeChange(shape) {
            this.item.shape = shape;
            this.schemeContainer.enrichItemWithDefaults(this.item);
            this.shapeComponent = Shape.make(this.item.shape);
            this.updateShapePropsDependencies();
            EventBus.emitItemChanged(this.item.id, 'shape');
        },

        onOpacityChange(opacity) {
            const value = parseFloat(opacity);
            if (isNaN(value)) {
                this.item.opacity = 0;
            } else {
                this.item.opacity = value;
            }
            EventBus.emitItemChanged(this.item.id, 'opacity');
        },

        onSelfOpacityChange(opacity) {
            const value = parseFloat(opacity);
            if (isNaN(value)) {
                this.item.selfOpacity = 0;
            } else {
                this.item.selfOpacity = value;
            }
            EventBus.emitItemChanged(this.item.id, 'selfOpacity');
        },

        onBlendModeChange(blendMode) {
            this.item.blendMode = blendMode;
            EventBus.emitItemChanged(this.item.id, 'blendMode');
        },

        onCursorChange(cursor) {
            this.item.cursor = cursor;
            EventBus.emitItemChanged(this.item.id, 'cursor');
        },

        onVisibleChange(visible) {
            this.item.visible = visible;
            EventBus.emitItemChanged(this.item.id, 'visible');
        },

        onInteractionModeChange() {
            if (this.item.interactionMode === 'tooltip') {
                if (!this.item.tooltipBackground) {
                    this.item.tooltipBackground = 'rgba(250, 250, 250, 1.0)';
                }
                if (!this.item.tooltipColor) {
                    this.item.tooltipColor = 'rgba(30, 30, 30, 1.0)';
                }
            }
            this.emitItemChanged('interactionMode');
        },

        onTooltipBackgroundChange(color) {
            this.item.tooltipBackground = color;
            this.emitItemChanged('tooltipBackground');
        },
        onTooltipColorChange(color) {
            this.item.tooltipColor = color;
            this.emitItemChanged('tooltipColor');
        },

        emitItemChanged(propertyPath) {
            EventBus.emitItemChanged(this.item.id, propertyPath);
        },

        updateShapePropsDependencies() {
            _.forEach(this.shapeComponent.args, (argConfig, argName) => {
                if (argConfig.type === 'curve-points' || (argConfig.hasOwnProperty('hidden') && argConfig.hidden === true)) {
                    this.shapePropsControlStates[argName].shown = false;
                } else if (argConfig.depends) {
                    _.forEach(argConfig.depends, (depArgValue, depArgName) => {
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

        onShapePropInputFileUploaded(argName, event) {
            const file = event.target.files[0];
            if (file) {
                apiClient.uploadFile(this.projectId, file)
                .then(imageUrl => {
                    this.item.shapeProps[argName] = imageUrl;
                }).catch(err => {
                    console.error('Could not upload file', err);
                });
            }
        },

        onSaveToStylesClicked() {
            this.saveStyleModalShown = true;
        },

        onResetToDefaultsClicked() {
            const shape = Shape.find(this.item.shape);
            _.forEach(shape.args, (arg, argName) => {
                this.item.shapeProps[argName] = arg.value;
            });
            EventBus.emitItemChanged(this.item.id);
        },

        applyStyle(shapeName, shapeProps) {
            if (this.item.shape === shapeName) {
                _.forEach(shapeProps, (argValue, argName) => {
                    this.item.shapeProps[argName] = argValue;
                });
            }
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
