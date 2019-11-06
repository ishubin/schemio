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

        <panel name="Events">
            <div class="behavior-container" v-for="(behavior, behaviorIndex) in item.behavior">
                <div class="behavior-event">
                    <div class="behavior-menu">
                        <span class="link icon-collapse" @click="toggleBehaviorCollapse(behaviorIndex)">
                            <i class="fas" :class="[behaviorsMetas[behaviorIndex].collapsed?'fa-caret-right':'fa-caret-down']"/>
                        </span>
                        <span class="icon-event"><i class="fas fa-bell"></i></span>
                        <span class="link icon-delete" @click="removeBehavior(behaviorIndex)"><i class="fas fa-times"/></span>
                    </div>
                    <dropdown
                        :options="behaviorsMetas[behaviorIndex].eventOptions"
                        @selected="onBehaviorEventSelected(behaviorIndex, arguments[0])"
                        >
                        <span>{{behavior.on.event | toPrettyEventName}}</span>
                    </dropdown>
                </div>
                <div v-if="!behaviorsMetas[behaviorIndex].collapsed">
                    <div class="behavior-action-container" v-for="(action, actionIndex) in behavior.do">
                        <div class="icon-container">
                            <span class="icon-action"><i class="fas fa-circle"></i></span>
                            <span class="link icon-delete" @click="removeAction(behaviorIndex, actionIndex)"><i class="fas fa-times"/></span>
                        </div>
                        <div>
                            <element-picker
                                :element="action.element" 
                                :scheme-container="schemeContainer"
                                :self-item="item"
                                @selected="onActionElementSelected(behaviorIndex, actionIndex, arguments[0])"
                                />
                        </div>
                        <span>: </span>
                        <div>
                            <dropdown
                                :key="action.element.item + ' ' + (action.element.connector||'')"
                                :options="createMethodSuggestionsForElement(action.element)"
                                @selected="onActionMethodSelected(behaviorIndex, actionIndex, arguments[0])"
                                >
                                <span v-if="action.method === 'set'"><i class="fas fa-cog"></i> {{action.args[0] | toPrettyPropertyName(action.element, item, schemeContainer)}}</span>
                                <span v-else><i class="fas fa-caret-right"></i> {{action.method | toPrettyMethod(action.element) }}</span>
                            </dropdown>
                        </div>
                        <span v-if="action.method === 'set'" class="function-brackets"> = </span>

                        <set-argument-editor v-if="action.method === 'set'"
                            :key="action.args[0]"
                            :argument-description="getArgumentDescriptionForElement(action.element, action.args[0])"
                            :argument-value="action.args[1]"
                            @changed="onArgumentValueChangeForSet(behaviorIndex, actionIndex, arguments[0])"
                            />
                    </div>
                    <div class="behavior-event-add-action">
                        <span class="btn btn-secondary" @click="addActionToBehavior(behaviorIndex)">Add Action</span>
                        <span class="btn btn-secondary" @click="duplicateBehavior(behaviorIndex)">Duplicate event</span>
                    </div>
                </div>
            </div>


            <span class="btn btn-primary" @click="addBehavior()">Add behavior event</span>

        </panel>

    </div>
</template>

<script>
import _ from 'lodash';
import shortid from 'shortid';
import utils from '../../../utils.js';
import Shape from '../items/shapes/Shape.js'
import Dropdown from '../../Dropdown.vue';
import Panel from '../Panel.vue';
import Functions from '../../../userevents/functions/Functions.js';
import Events from '../../../userevents/Events.js';
import Item from '../../../scheme/Item.js';
import ElementPicker from '../ElementPicker.vue';
import SetArgumentEditor from './behavior/SetArgumentEditor.vue';
import EventBus from '../EventBus.js';

const supportedProperties = {
    opacity: {id: 'opacity', name: 'Opacity', _type: 'text'}
};

const standardItemEvents = _.chain(Events.standardEvents).values().sortBy(event => event.name).value();

export default {
    props: ['item', 'schemeContainer'],

    components: {Dropdown, ElementPicker, SetArgumentEditor, Panel},

    data() {
        const items = _.chain(this.schemeContainer.getItems())
            .map(item => {return {id: item.id, name: item.name || 'Unnamed'}})
            .sortBy(item => item.name)
            .value();

        return {
            itemMap: this.createItemMap(),
            items: items,
            behaviorsMetas: _.map(this.item.behavior, this.createBehaviorMeta),
            knownInteractionModes: Item.InteractionMode.values(),
        };
    },

    methods: {
        createBehaviorMeta(behavior) {
            return{
                collapsed: behavior.do && behavior.do.length > 0, // collapsing behaviors that do not have any actions
                eventOptions: this.createEventOptions(behavior),
            };
        },

        toggleBehaviorCollapse(behaviorIndex) {
            this.behaviorsMetas[behaviorIndex].collapsed = !this.behaviorsMetas[behaviorIndex].collapsed;
        },

        findElement(element) {
            if (element.item) {
                const item = this.findItem(element.item);
                if (element.connector && item && item.connectors) {
                    return _.find(item.connectors, connector => connector.id === element.connector);
                }
                return item;
            }
            return null;
        },

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

        createMethodSuggestionsForElement(element) {
            if (element.item) {
                const item = this.findItem(element.item);
                if (item) {
                    let scope = 'item';
                    if (element.connector) {
                        scope = 'connector';
                    }

                    const options = [];
                    _.forEach(Functions[scope], (func, funcId) => {
                        if (funcId !== 'set') {
                            options.push({
                                method: funcId,
                                name: func.name,
                                iconClass: 'fas fa-dice-d6'
                            });
                        }
                    });
                    options.push({
                        method: 'set',
                        name: 'Opacity',
                        fieldPath: 'opacity',
                        iconClass: 'fas fa-cog'
                    });

                    if (!element.connector) {
                        const shape = Shape.find(item.shape);
                        if (shape) {
                            _.forEach(shape.args, (arg, argName) => {
                                options.push({
                                    method: 'set',
                                    name: arg.name,
                                    fieldPath: `shapeProps.${argName}`,
                                    iconClass: 'fas fa-cog'
                                });
                            });
                        }
                    }
                    return options;
                }
            }
            return [];
        },

        addBehavior() {
            if (!this.item.behavior) {
                this.item.behavior = [];
            }
            const newBehavior = {
                id: shortid.generate(),
                on: {
                    element: {item: 'self'},
                    event: 'mousein',
                    args: []
                },
                do: []
            };
            this.item.behavior.push(newBehavior);
            this.behaviorsMetas.push(this.createBehaviorMeta(newBehavior));
            EventBus.emitSchemeChangeCommited();
            this.$forceUpdate();
        },

        removeBehavior(behaviorIndex) {
            this.item.behavior.splice(behaviorIndex, 1);
            this.behaviorsMetas.splice(behaviorIndex, 1)
            EventBus.emitSchemeChangeCommited();
        },
        
        onBehaviorEventElementSelected(behaviorIndex, element) {
            this.item.behavior[behaviorIndex].on.element = element;
            this.behaviorsMetas[behaviorIndex] = this.createBehaviorMeta(this.item.behavior[behaviorIndex]);
            EventBus.emitSchemeChangeCommited();
        },

        onBehaviorEventSelected(behaviorIndex, eventOption) {
            this.item.behavior[behaviorIndex].on.event = eventOption.id;
            EventBus.emitSchemeChangeCommited();
        },

        addActionToBehavior(behaviorIndex) {
            const behavior = this.item.behavior[behaviorIndex];
            if (!behavior.do) {
                behavior.do = [];
            }

            behavior.do.push({
                element: {item: 'self'},
                method: 'show',
                args: []
            });
            EventBus.emitSchemeChangeCommited();
        },

        removeAction(behaviorIndex, actionIndex) {
            this.item.behavior[behaviorIndex].do.splice(actionIndex, 1);
            EventBus.emitSchemeChangeCommited();
        },

        onActionElementSelected(behaviorIndex, actionIndex, element) {
            this.item.behavior[behaviorIndex].do[actionIndex].element = element;
            EventBus.emitSchemeChangeCommited();
        },

        onActionMethodSelected(behaviorIndex, actionIndex, methodOption) {
            const action = this.item.behavior[behaviorIndex].do[actionIndex];
            if (methodOption.method === 'set') {
                action.method = methodOption.method;
                const args = [];
                args[0] = methodOption.fieldPath;

                const element = this.findElement(action.element);
                if (element) {
                    args[1] = utils.getObjectProperty(element, methodOption.fieldPath);
                }
                action.args = args;
            } else {
                action.method = methodOption.method;
                action.args = [];
            }
            EventBus.emitSchemeChangeCommited();
        },

        onActionSetFunctionPropertyChanged(behaviorIndex, actionIndex, propertyId, value) {
            this.item.behavior[behaviorIndex].do[actionIndex].args[0] = propertyId;
            this.item.behavior[behaviorIndex].do[actionIndex].args[1] = value;
            EventBus.emitSchemeChangeCommited();
            this.$forceUpdate();
        },

        getArgumentDescriptionForElement(element, propertyPath) {
            if (propertyPath.indexOf('shapeProps.') === 0) {
                const entity = this.findElement(element);
                if (entity && entity.shape) {
                    const shape = Shape.find(entity.shape);
                    if (shape) {
                        const shapeArgName = propertyPath.substr('shapeProps.'.length);
                        if (shape.args.hasOwnProperty(shapeArgName)) {
                            return shape.args[shapeArgName];
                        }
                    }
                }
            }
            return {type: 'string'};
        },

        onArgumentValueChangeForSet(behaviorIndex, actionIndex, value) {
            this.item.behavior[behaviorIndex].do[actionIndex].args[1] = value;
            EventBus.emitSchemeChangeCommited();
        },

        duplicateBehavior(behaviorIndex) {
            const newBehavior = utils.clone(this.item.behavior[behaviorIndex]);
            this.item.behavior.push(newBehavior);
            this.behaviorsMetas.push(this.createBehaviorMeta(newBehavior));
            EventBus.emitSchemeChangeCommited();
            this.$forceUpdate();
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

        toPrettyMethod(method, element) {
            let scope = 'page';
            if (element && element.item) {
                scope = 'item';
                if (element.connector) {
                    scope = 'connector';
                }
            }
            if (Functions[scope][method]) {
                return Functions[scope][method].name;
            } else {
                return method;
            }
        },


        toPrettyPropertyName(propertyPath, element, selfItem, schemeContainer) {
            //TODO cache all item properties instead of fetching them over and over again
            if (propertyPath === 'opacity') {
                return 'Opacity';
            } else if (propertyPath.indexOf('shapeProps.') === 0) {
                let item = null;
                if (element.item === 'self') {
                    item = selfItem;
                } else {
                    item = schemeContainer.findItemById(element.item);
                }
                if (item && item.shape) {
                    const shape = Shape.find(item.shape);
                    const shapeArgName = propertyPath.substr('shapeProps.'.length);
                    if (shape && shape.args.hasOwnProperty(shapeArgName)) {
                        return shape.args[shapeArgName].name;
                    }
                }
            }
            return propertyPath;
        }
    }
}
</script>