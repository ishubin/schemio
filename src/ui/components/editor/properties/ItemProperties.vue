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
        <position-panel v-if="currentTab === 'position'" :key="`position-panel-${item.id}-${revision}`" :item="item" @ungroup-item="$emit('ungroup-item')"/>

        <behavior-properties v-if="currentTab === 'behavior'" :key="`behavior-panel-${item.id}-${revision}`" :item="item" :scheme-container="schemeContainer"/>

        <div v-if="currentTab === 'shape'">
            <select v-model="item.shape">
                <option v-for="shape in knownShapes">{{shape}}</option>
            </select>

            <h5>Opacity</h5>
            <input class="textfield" type="text" v-model="item.opacity"/>


            Blend Mode: 
            <select v-model="item.blendMode">
                <option v-for="blendMode in knownBlendModes">{{blendMode}}</option>
            </select>


            <panel name="General">
                <table>
                    <tbody>
                        <tr>
                            <td width="50%">Cursor</td>
                            <td width="50%">
                                <select v-model="item.cursor">
                                    <option v-for="cursor in knownCursors">{{cursor}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td width="50%">Visible</td>
                            <td width="50%">
                                <input class="checkbox" type="checkbox" v-model="item.visible"/>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>

            <panel name="Style">
                <table>
                    <tbody>
                        <tr v-for="(arg, argName) in shapeComponent.args">
                            <td width="50%">{{arg.name}}</td>
                            <td width="50%">
                                <input v-if="arg.type === 'string'" class="textfield" :value="item.shapeProps[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>
                                <input v-if="arg.type === 'number'" class="textfield" :value="item.shapeProps[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>
                                <color-picker v-if="arg.type === 'color'" :color="item.shapeProps[argName]" @input="onStyleColorChange(argName, arguments[0])"></color-picker>

                                <input v-if="arg.type === 'image'" class="textfield" :value="item.shapeProps[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>
                                <div v-if="arg.type === 'image'">
                                    <img :src="item.shapeProps[argName]" style="max-width: 60px; max-height: 60px;"/>
                                </div>
                                <input v-if="arg.type === 'boolean'" type="checkbox" :checked="item.shapeProps[argName]" @input="onStyleCheckboxChange(argName, arg, arguments[0])"/>

                                <select v-if="arg.type === 'choice'" :value="item.shapeProps[argName]" @input="onStyleSelectChange(argName, arg, arguments[0])">
                                    <option v-for="argOption in arg.options">{{argOption}}</option>
                                </select>

                                <select v-if="arg.type === 'stroke-pattern'" :value="item.shapeProps[argName]" @input="onStyleSelectChange(argName, arg, arguments[0])">
                                    <option v-for="knownPattern in knownStrokePatterns">{{knownPattern}}</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </panel>
        </div>
    </div>
</template>

<script>
import EventBus from '../EventBus.js';
import Panel from '../Panel.vue';
import GeneralPanel from './GeneralPanel.vue';
import PositionPanel from './PositionPanel.vue';
import LinksPanel from './LinksPanel.vue';
import ConnectionsPanel from './ConnectionsPanel.vue';
import Shape from '../items/shapes/Shape.js';
import ColorPicker from '../ColorPicker.vue';
import BehaviorProperties from './BehaviorProperties.vue';
import StrokePattern from '../items/StrokePattern.js';
import settingsStorage from '../../../settingsStorage.js';

const ALL_TABS = [
    {name: 'description', icon: 'fas fa-paragraph'},
    {name: 'shape', icon: 'fas fa-vector-square'},
    {name: 'position', icon: 'fas fa-map-marker-alt'},
    {name: 'behavior', icon: 'far fa-hand-point-up'}
];

const tabsSettingsStorage = settingsStorage.createStorageWithAllowedValues(
    'item-properties-current-tab',
    _.chain(ALL_TABS).map(x => x.name).value(),
    0
);

export default {
    props: ['projectId', 'item', 'schemeContainer', 'revision'],
    components: {Panel, ColorPicker,  PositionPanel, LinksPanel, ConnectionsPanel, GeneralPanel, BehaviorProperties},

    beforeMount() {
        this.currentTab = tabsSettingsStorage.get();
    },

    mounted() {
        this.oldShape = this.item.shape;
        this.shapeComponent = Shape.make(this.item.shape);
    },

    data() {
        return {
            tabs: ALL_TABS,
            knownCursors: ['default', 'pointer', 'grab', 'crosshair', 'not-allowed', 'zoom-in', 'help', 'wait'],

            knownStrokePatterns: StrokePattern.getPatternsList(),

            knownShapes: _.chain(Shape.shapeReigstry).keys().sort().value(),
            currentTab: 'description',
            shapeComponent: {},
            oldShape: this.item.shape,
            knownBlendModes: [  'normal', 'multiply', 'screen', 'overlay', 'darken', 
                                'lighten', 'color-dodge', 'color-burn', 'difference',
                                'exclusion', 'hue', 'saturation', 'color', 'luminosity'
            ]
        };
    },

    methods: {
        onStyleInputChange(styleArgName, componentArg, event) {
            const text = event.target.value;
            if (componentArg.type === 'number') {
                this.item.shapeProps[styleArgName] = parseInt(text) || 0;
            } else {
                this.item.shapeProps[styleArgName] = text;
            }
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
        },
        onStyleCheckboxChange(styleArgName, componentArg, event) {
            this.item.shapeProps[styleArgName] = event.srcElement.checked;
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
        },
        onStyleColorChange(styleArgName, value) {
            this.item.shapeProps[styleArgName] = value;
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
        },
        onStyleSelectChange(styleArgName, componentArg, event) {
            const value = event.target.value;
            this.item.shapeProps[styleArgName] = value;
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(`item.${this.item.id}.${styleArgName}`);
        },

        switchShape(shape) {
            this.oldShape = this.item.shape;
            this.shapeComponent = Shape.make(shape);
            EventBus.emitItemChanged(this.item.id);
        },

        emitItemChanged() {
            EventBus.emitItemChanged(this.item.id);
        },
    },

    watch: {
        currentTab(value) {
            tabsSettingsStorage.save(value);
        }
    }
}
</script>

<style lang="css">
</style>
