<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div>
        <h5>Name</h5>
        <input class="textfield" type="text" v-model="connector.name"/>

        <table class="properties-table">
            <tbody>
                <tr>
                    <td class="label" width="50%">Type</td>
                    <td class="value" width="50%">
                        <select :value="connector.connectorType" @change="onPropertyChange(arguments[0].target.value, 'connectorType')">
                            <option v-for="type in connectorTypes">{{type}}</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Visible</td>
                    <td class="value" width="50%">
                        <input type="checkbox" :value="connector.visible" @input="onPropertyChange(parseInt(arguments[0].target.value), 'visible')"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Opacity</td>
                    <td class="value" width="50%">
                        <input class="textfield" type="text" :value="connector.opacity" @input="onPropertyChange(parseInt(arguments[0].target.value), 'opacity')"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Source Type</td>
                    <td class="value" width="50%">
                        <select :value="connector.source.type" @change="onPropertyChange(arguments[0].target.value, 'source', 'type')">
                            <option v-for="type in knownCapStyleTypes">{{type}}</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Source Size</td>
                    <td class="value" width="50%">
                        <input class="textfield" type="text" :value="connector.source.size" @input="onPropertyChange(parseInt(arguments[0].target.value), 'source', 'size')"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Destination Type</td>
                    <td class="value" width="50%">
                        <select :value="connector.destination.type" @change="onPropertyChange(arguments[0].target.value, 'destination', 'type')">
                            <option v-for="type in knownCapStyleTypes">{{type}}</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Destination Size</td>
                    <td class="value" width="50%">
                        <input class="textfield" type="text" :value="connector.destination.size" @input="onPropertyChange(parseInt(arguments[0].target.value), 'destination', 'size')"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Color</td>
                    <td class="value" width="50%">
                        <color-picker :color="connector.color" @input="onPropertyChange(arguments[0], 'color');"></color-picker>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Stroke size</td>
                    <td class="value" width="50%">
                        <input class="textfield" type="text" :value="connector.width" @input="onPropertyChange(parseInt(arguments[0].target.value), 'width')"/>
                    </td>
                </tr>
                <tr>
                    <td class="label" width="50%">Pattern</td>
                    <td class="value" width="50%">
                        <dropdown :value="connector.pattern" :options="patternOptions"
                            @selected="onPropertyChange(arguments[0].name, 'pattern')">
                            <span :style="{'background-image': `url(/images/line-patterns/${connector.pattern}.svg)`, 'display': 'block', 'height': '20px', 'width': '140px', 'background-repeat': 'no-repeat'}"></span>
                        </dropdown>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
import ColorPicker from './ColorPicker.vue';
import EventBus from './EventBus.js';
import Connector from './../../scheme/Connector.js';
import Dropdown from '../Dropdown.vue';
import _ from 'lodash';
import recentPropsChanges from '../../history/recentPropsChanges';


export default {
    props: ['connector'],

    components: {ColorPicker, Dropdown},
    data() {
        return {
            knownCapStyleTypes: Connector.CapType.values(),
            knownPatterns: Connector.Pattern.values(),
            connectorTypes: Connector.Type.values()
        };
    },
    methods: {
        onConnectorChange() {
            EventBus.emitConnectorChanged(this.connector.id);
        },

        onPropertyChange(value, field, subField) {
            let propertyPath = field;
            if (subField) {
                this.connector[field][subField] = value;
                propertyPath += '.' + subField;
            } else {
                this.connector[field] = value;
            }

            if (propertyPath !== 'visible' && propertyPath !== 'opacity') {
                recentPropsChanges.registerConnectorProp(propertyPath, value);
            }
            this.onConnectorChange();
        }
    },
    computed: {
        patternOptions() {
            return _.map(Connector.Pattern.values(), pattern => {
                return {
                    name: pattern,
                    style: {
                        'background-image': `url(/images/line-patterns/${pattern}.svg)`,
                        'background-repeat': 'no-repeat',
                        'height': '20px',
                        'font-size': '0',
                        'display': 'block'
                    }
                }
            });
        }
    }
}
</script>