<template>
    <div>
        <div>
            <table width="100%">
                <tbody>
                    <tr>
                        <td width="50%">Interaction Mode</td>
                        <td width="50%">
                            <select v-model="item.interactionMode">
                                <option v-for="interactionMode in knownInteractionModes"
                                    :value="interactionMode"
                                    :key="interactionMode">{{interactionMode}}</option>
                            </select>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <table v-if="item.behavior" class="behavior-events-table">
            <thead>
                <tr>
                    <th width="30xp"></th>
                    <th width="50%">Entity</th>
                    <th width="50%">Event</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(behavior, behaviorIndex) in item.behavior">
                    <td>
                        <span class="link" @click="removeBehavior(behaviorIndex)"><i class="fas fa-times"/></span>
                        </td>
                    <td>
                        <element-picker
                            :element="behavior.on.element" 
                            :scheme-container="schemeContainer"
                            :self-item="item"
                            @selected="onBehaviorEventElementSelected(behaviorIndex, arguments[0])"
                            />
                    </td>
                    <td>
                        <dropdown
                            :options="behaviorsEventOptions[behaviorIndex]"
                            @selected="onBehaviorEventSelected(behaviorIndex, arguments[0])"
                            >
                            <span>{{behavior.on.event}}</span>
                        </dropdown>
                    </td>
                </tr>
            </tbody>
        </table>

        <span class="btn btn-primary" @click="addBehavior()">Add behavior event</span>
    </div>
</template>

<script>
import _ from 'lodash';
import shortid from 'shortid';
import utils from '../../../utils.js';
import Shape from '../items/shapes/Shape.js'
import Dropdown from '../../Dropdown.vue';
import Functions from '../../../userevents/functions/Functions.js';
import BehaviorArgument from './BehaviorArgument.vue';
import Events from '../../../userevents/Events.js';
import Item from '../../../scheme/Item.js';
import ElementPicker from '../ElementPicker.vue';

const supportedFunctions = _.mapValues(Functions, (func, funcId) => {return {id: funcId, name: func.name}});

const supportedProperties = {
    opacity: {id: 'opacity', name: 'Opacity', _type: 'text'}
};

const standardItemEvents = _.chain(Events.standardEvents).values().sortBy(event => event.name).value();

export default {
    props: ['item', 'schemeContainer'],

    components: {BehaviorArgument, Dropdown, ElementPicker},

    data() {
        const items = _.chain(this.schemeContainer.getItems())
            .map(item => {return {id: item.id, name: item.name || 'Unnamed'}})
            .sortBy(item => item.name)
            .value();

        return {
            itemMap: this.createItemMap(),
            items: items,
            behaviorsEventOptions: _.map(this.item.behavior, this.createEventOptions),
            originatorOptions: [{id: 'self', name: 'Self'}].concat(items),
            supportedFunctions: _.chain(supportedFunctions).values().sortBy(func => func.name).value(),
            methodMap: supportedFunctions,
            knownInteractionModes: Item.InteractionMode.values()
        };
    },

    methods: {
        findItem(itemId) {
            let item = this.item;
            if (itemId !== 'self') {
                item = this.schemeContainer.findItemById(itemId);
            }
            return item;
        },

        findShapeArgsForItem(itemId) {
            const item = this.findItem(itemId);
            if (item) {
                const shape = Shape.find(item.shape);
                if (shape) {
                    return shape.args;
                }
            }
            return {};
        },

        createItemMap() {
            const itemMap = {};
            _.forEach(this.schemeContainer.getItems(), item => {
                itemMap[item.id] = {
                    id: item.id,
                    name: item.name
                };
            });
            return itemMap;
        },

        createEventOptions(behavior) {
            let eventOptions = [];
            if (behavior.on.element.item) {
                eventOptions = standardItemEvents;
                
                const item = this.findItem(behavior.on.element.item);
                if (item) {
                    const shape = Shape.find(item.shape);
                    if (shape) {
                        eventOptions = standardItemEvents.concat(_.chain(shape.getEvents(item)).map(event => {return {id: event.name, name: event.name}}).value());
                    }
                }
            }
            return eventOptions;
        },

        addBehavior() {
            if (!this.item.behavior) {
                this.item.behavior = [];
            }
            const newEvent = {
                on: {
                    element: {item: 'self'},
                    event: 'mousein',
                    args: []
                },
                do: []
            };
            this.item.behavior.push(newEvent);
            this.$forceUpdate();
        },

        removeBehavior(behaviorIndex) {
            this.item.behavior.splice(behaviorIndex, 1);
        },
        
        onBehaviorEventElementSelected(behaviorIndex, element) {
            this.item.behavior[behaviorIndex].on.element = element;
            this.behaviorsEventOptions[behaviorIndex] = this.createEventOptions(this.item.behavior[behaviorIndex]);
        },

        onBehaviorEventSelected(behaviorIndex, eventOption) {
            this.item.behavior[behaviorIndex].on.event = eventOption.id;
        }
    },

    filters: {
        toOriginatorPrettyName(originator, itemMap) {
            if (originator === 'self') {
                return 'Self';
            } else if (originator) {
                if (itemMap[originator]) {
                    return itemMap[originator].name || 'Unnamed';
                } else {
                    return originator;
                }
            } else {
                return 'Page';
            }
        },

        toPrettyEventName(event) {
            if (Events.standardEvents[event]) {
                return Events.standardEvents[event].name;
            } else {
                return event;
            }
        },

        toPrettyMethod(method, methodMap) {
            if (methodMap[method]) {
                return methodMap[method].name;
            } else {
                return method;
            }
        },

        toPrettySetPropertyName(propertyName, argMap) {
            if (argMap[propertyName]) {
                return argMap[propertyName].name;
            }
            return propertyName;
        }
    }
}
</script>