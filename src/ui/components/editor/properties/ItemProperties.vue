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
        <ul class="button-group">
            <li>
                <span class="toggle-button" @click="toggleItemLock()"
                    :class="{'toggled': itemLocked}"
                    >
                    <i class="fas" :class="[itemLocked ? 'fa-lock' : 'fa-unlock']"></i>
                </span>
            </li>
            <li v-if="itemGroup">
                <span class="toggle-button" @click="ungroupItem()">
                    <i class="fas fa-object-ungroup"></i>
                </span>
            </li>
        </ul>

        <general-panel v-if="currentTab === 'description'" :item="item"/>
        <links-panel v-if="currentTab === 'description'" :item="item"/>
        <connections-panel v-if="currentTab === 'description'" :item="item"/>
        <position-panel v-if="currentTab === 'position'" :item="item"/>

        <behavior-properties v-if="currentTab === 'behavior'" :item="item" :scheme-container="schemeContainer"/>

        <div v-if="currentTab === 'shape'">
            <select v-model="item.shape">
                <option>none</option>
                <option>rect</option>
                <option>ellipse</option>
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
                                <input v-if="arg.type === 'string'" class="textfield" :value="item.style[argName]"/>
                                <input v-if="arg.type === 'number'" class="textfield" :value="item.style[argName]" @input="onStyleInputChange(argName, arg, arguments[0])"/>
                                <color-picker v-if="arg.type === 'color'" :color="item.style[argName]" @input="item.style[argName]= arguments[0]; redrawItem();"></color-picker>
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

export default {
    props: ['item', 'schemeContainer'],
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
            currentTab: 'description',
            itemLocked: this.item.locked || false,
            itemGroup: this.item.group,
            shapeComponent: {},
            oldShape: this.item.shape
        };
    },

    methods: {
        onStyleInputChange(styleArgName, componentArg, event) {
            const text = event.target.value;
            if (componentArg.type === 'number') {
                this.item.style[styleArgName] = parseInt(text) || 0;
            } else {
                this.item.style[styleArgName] = text;
            }
        },
        toggleItemLock() {
            this.itemLocked = !this.itemLocked;
            this.item.locked = this.itemLocked;
        },

        ungroupItem() {
            this.$emit('ungroup-item');
            this.itemGroup = null;
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
