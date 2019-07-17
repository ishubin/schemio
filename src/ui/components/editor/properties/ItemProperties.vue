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

        <general-panel :project-id="projectId" v-if="currentTab === 'description'" :item="item"/>
        <links-panel v-if="currentTab === 'description'" :item="item"/>
        <connections-panel v-if="currentTab === 'description'" :item="item"/>
        <position-panel v-if="currentTab === 'position'" :item="item" @ungroup-item="$emit('ungroup-item')"/>

        <behavior-properties v-if="currentTab === 'behavior'" :item="item" :scheme-container="schemeContainer"/>

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
                                <color-picker v-if="arg.type === 'color'" :color="item.shapeProps[argName]" @input="item.shapeProps[argName]= arguments[0]; redrawItem();"></color-picker>

                                <input v-if="arg.type === 'image'" class="textfield" :value="item.shapeProps[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>
                                <div v-if="arg.type === 'image'">
                                    <img :src="item.shapeProps[argName]" style="max-width: 60px; max-height: 60px;"/>
                                </div>
                                <input v-if="arg.type === 'boolean'" type="checkbox" v-model="item.shapeProps[argName]"/>

                                <select v-if="arg.type === 'choice'" v-model="item.shapeProps[argName]">
                                    <option v-for="argOption in arg.options">{{argOption}}</option>
                                </select>

                                <select v-if="arg.type === 'stroke-pattern'" v-model="item.shapeProps[argName]">
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

export default {
    props: ['projectId', 'item', 'schemeContainer'],
    components: {Panel, ColorPicker,  PositionPanel, LinksPanel, ConnectionsPanel, GeneralPanel, BehaviorProperties},

    mounted() {
        this.switchShape(this.item.shape);
    },

    data() {
        return {
            tabs: [
                {name: 'description', icon: 'fas fa-paragraph'},
                {name: 'shape', icon: 'fas fa-vector-square'},
                {name: 'position', icon: 'fas fa-map-marker-alt'},
                {name: 'behavior', icon: 'far fa-hand-point-up'}
            ],

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
        },
        onStyleCheckboxChange(styleArgName, componentArg, event) {
            this.item.shapeProps[styleArgName] = event.srcElement.checked;
            console.log(JSON.stringify(this.item.style, null, 2));
        },
        switchShape(shape) {
            this.oldShape = this.item.shape;
            this.shapeComponent = Shape.make(shape);
        },

        redrawItem() {
            EventBus.emitRedrawItem(this.item.id);
        }
    },

    watch: {
        //TODO get rid of this watcher and detect changes in other ways. At this moment this component is the one responsible for detecting any changes on the item (even dragging it)
       item: {
           handler: function(newItem) {
                if (this.oldShape !== newItem.shape) {
                    this.switchShape(newItem.shape);
                }
                EventBus.$emit(EventBus.ITEM_CHANGED, newItem);
           },
           deep: true
       }
   }
}
</script>

<style lang="css">
</style>
