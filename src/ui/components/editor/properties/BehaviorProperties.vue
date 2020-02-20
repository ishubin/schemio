<template>
    <div>
        <panel name="Groups">
            <vue-tags-input v-model="itemGroup"
                :tags="itemGroups"
                :autocomplete-items="filteredItemGroupsSuggestions"
                @tags-changed="onItemGroupsChange"
                ></vue-tags-input>
        </panel>

        <panel name="Events">
            <div class="behavior-container" v-for="(behavior, behaviorIndex) in item.behavior">
                <div class="behavior-event">
                    <div class="behavior-menu">
                        <span class="link icon-collapse" @click="toggleBehaviorCollapse(behaviorIndex)">
                            <i class="fas" :class="[behaviorsMetas[behaviorIndex].collapsed?'fa-caret-right':'fa-caret-down']"/>
                        </span>
                        <span class="icon-event"><i class="fas fa-bell"></i></span>
                    </div>
                    <div class="behavior-right-menu">
                        <span class="link"
                            v-if="behaviorIndex > 0"
                            @click="moveBehaviorInOrder(behaviorIndex, behaviorIndex - 1)"><i class="fas fa-caret-up"></i></span>
                        <span class="link"
                            v-if="behaviorIndex < item.behavior.length - 1"
                            @click="moveBehaviorInOrder(behaviorIndex, behaviorIndex + 1)"
                            ><i class="fas fa-caret-down"></i></span>
                        <span class="link icon-delete" @click="removeBehavior(behaviorIndex)"><i class="fas fa-times"/></span>
                    </div>
                    <dropdown
                        :options="behaviorsMetas[behaviorIndex].eventOptions"
                        @selected="onBehaviorEventSelected(behaviorIndex, arguments[0])"
                        >
                        <span v-if="isStandardEvent(behavior.on.event)">{{behavior.on.event | toPrettyEventName}}</span>
                        <input v-else type="text" :value="behavior.on.event" @input="behavior.on.event = arguments[0].target.value"/>
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
                                <span v-if="action.method === 'set'"><i class="fas fa-cog"></i> {{action.args.field | toPrettyPropertyName(action.element, item, schemeContainer)}}</span>
                                <span v-if="action.method !== 'set' && action.method !== 'sendEvent'"><i class="fas fa-play"></i> {{action.method | toPrettyMethod(action.element) }} </span>
                                <span v-if="action.method === 'sendEvent'"><i class="fas fa-play"></i> {{action.args.event}} </span>
                            </dropdown>
                            <span v-if="action.method !== 'set' && action.method !== 'sendEvent' && action.args && Object.keys(action.args).length > 0"
                                class="action-method-arguments-expand"
                                @click="showFunctionArgumentsEditor(action, behaviorIndex, actionIndex)"
                                >(...)</span>
                        </div>
                        <span v-if="action.method === 'set'" class="function-brackets"> = </span>

                        <set-argument-editor v-if="action.method === 'set'"
                            :key="action.args.field"
                            :argument-description="getArgumentDescriptionForElement(action.element, action.args.field)"
                            :argument-value="action.args.value"
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

        <function-arguments-editor v-if="functionArgumentsEditor.shown"
            :function-description="functionArgumentsEditor.functionDescription"
            :args="functionArgumentsEditor.args"
            :scheme-container="schemeContainer"
            @close="functionArgumentsEditor.shown = false"
            @argument-changed="onFunctionArgumentsEditorChange"
        />
    </div>
</template>

<script>
import _ from 'lodash';
import shortid from 'shortid';
import VueTagsInput from '@johmun/vue-tags-input';
import utils from '../../../utils.js';
import Shape from '../items/shapes/Shape.js'
import Dropdown from '../../Dropdown.vue';
import Panel from '../Panel.vue';
import Functions from '../../../userevents/functions/Functions.js';
import Events from '../../../userevents/Events.js';
import ElementPicker from '../ElementPicker.vue';
import SetArgumentEditor from './behavior/SetArgumentEditor.vue';
import FunctionArgumentsEditor from './behavior/FunctionArgumentsEditor.vue';
import EventBus from '../EventBus.js';
import LimitedSettingsStorage from '../../../LimitedSettingsStorage';

const supportedProperties = {
    opacity: {id: 'opacity', name: 'Opacity', _type: 'text'}
};

const standardItemEvents = _.chain(Events.standardEvents).values().sortBy(event => event.name).value();
const standardItemEventIds = _.map(standardItemEvents, event => event.id);

const behaviorCollapseStateStorage = new LimitedSettingsStorage(window.localStorage, 'behavior-collapse', 400);

export default {
    props: ['item', 'schemeContainer'],

    components: {Dropdown, ElementPicker, SetArgumentEditor, Panel, FunctionArgumentsEditor, VueTagsInput},

    data() {
        const items = _.chain(this.schemeContainer.getItems())
            .map(item => {return {id: item.id, name: item.name || 'Unnamed'}})
            .sortBy(item => item.name)
            .value();

        const behaviorsMetas = _.map(this.item.behavior, this.createBehaviorMeta);
        _.forEach(behaviorsMetas, (meta, index) => {
            const collapsed = behaviorCollapseStateStorage.get(`${this.schemeContainer.scheme.id}/${this.item.id}/${index}`, 0);
            meta.collapsed = collapsed === 1 ? true: false;
        });

        return {
            itemMap: this.createItemMap(),
            items: items,
            behaviorsMetas: behaviorsMetas,
            functionArgumentsEditor: {
                shown: false,
                functionDescription: null,
                behaviorIndex: 0,
                actionIndex: 0,
                args: {}
            },
            itemGroup: '',
            existingItemGroups: _.map(this.schemeContainer.itemGroups, group => {return {text: group}})
        };
    },

    methods: {
        createBehaviorMeta(behavior) {
            return{
                collapsed: behavior.do && behavior.do.length > 0, // collapsing behaviors that do not have any actions
                eventOptions: this.createEventOptions(behavior),
            };
        },

        onItemGroupsChange(newGroups) {
            this.item.groups = _.map(newGroups, group => group.text);
            this.schemeContainer.reindexItems();
        },

        toggleBehaviorCollapse(behaviorIndex) {
            this.behaviorsMetas[behaviorIndex].collapsed = !this.behaviorsMetas[behaviorIndex].collapsed;
            behaviorCollapseStateStorage.save(`${this.schemeContainer.scheme.id}/${this.item.id}/${behaviorIndex}`, this.behaviorsMetas[behaviorIndex].collapsed ? 1 : 0);
        },

        moveBehaviorInOrder(srcIndex, dstIndex)  {
            if (dstIndex < 0 || dstIndex >= this.item.behavior.length) {
                return;
            }

            let temp = this.item.behavior[srcIndex];
            this.item.behavior[srcIndex] = this.item.behavior[dstIndex];
            this.item.behavior[dstIndex] = temp;

            temp = this.behaviorsMetas[srcIndex];
            this.behaviorsMetas[srcIndex] = this.behaviorsMetas[dstIndex];
            this.behaviorsMetas[dstIndex] = temp;

            this.$forceUpdate();
        },

        findElement(element) {
            if (element.connector) {
                return this.schemeContainer.findConnectorById(element.connector);
            }
            if (element.item) {
                return this.findItem(element.item);
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

                eventOptions.push({
                    id: 'custom-event',
                    name: 'Custom event ...'
                });
            }
            return eventOptions;
        },

        createMethodSuggestionsForElement(element) {
            const options = [];
            let scope = 'item';
            if (element.connector) {
                scope = 'connector';
            }
            _.forEach(Functions[scope], (func, funcId) => {
                if (funcId !== 'set') {
                    options.push({
                        method: funcId,
                        name: func.name,
                        iconClass: 'fas fa-play'
                    });
                }
            });
            if (element.item) {
                const item = this.findItem(element.item);
                if (!item) {
                    return [];
                }

                _.forEach(this.collectAllItemCustomEvents(item), customEvent => {
                    options.push({
                        method: 'custom-event',
                        name: customEvent,
                        event: customEvent,
                        iconClass: 'fas fa-play'
                    });
                });

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
            options.push({
                method: 'set',
                name: 'Opacity',
                fieldPath: 'opacity',
                iconClass: 'fas fa-cog'
            });

            return options;
        },

        collectAllItemCustomEvents(item) {
            if (!item.behavior) {
                return [];
            }
            const filteredBehavior = _.filter(item.behavior, behavior => {
                if (!behavior.on.element || !behavior.on.event) {
                    return false;
                }
                // checking that it is it's own event
                if (behavior.on.element.item !== 'self' && behavior.on.element.item !== item.id) {
                    return false;
                }
                return !this.isStandardEvent(behavior.on.event);
            });

            return _.uniq(_.map(filteredBehavior, behavior => behavior.on.event));
        },

        isStandardEvent(event) {
            return _.indexOf(standardItemEventIds, event) >= 0;
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
            this.emitChangeCommited();
            this.$forceUpdate();
        },

        removeBehavior(behaviorIndex) {
            this.item.behavior.splice(behaviorIndex, 1);
            this.behaviorsMetas.splice(behaviorIndex, 1)
            this.emitChangeCommited();
        },
        
        onBehaviorEventElementSelected(behaviorIndex, element) {
            this.item.behavior[behaviorIndex].on.element = element;
            this.behaviorsMetas[behaviorIndex] = this.createBehaviorMeta(this.item.behavior[behaviorIndex]);
            this.emitChangeCommited();
        },

        onBehaviorEventSelected(behaviorIndex, eventOption) {
            if (eventOption.id === 'custom-event') {
                this.item.behavior[behaviorIndex].on.event = 'Unknown event...';
            } else {
                this.item.behavior[behaviorIndex].on.event = eventOption.id;
            }
            this.emitChangeCommited();
        },

        addActionToBehavior(behaviorIndex) {
            const behavior = this.item.behavior[behaviorIndex];
            if (!behavior.do) {
                behavior.do = [];
            }

            let element = {item: 'self'};

            if (behavior.do.length > 0) {
                // picking element from the last action
                element = utils.clone(behavior.do[behavior.do.length - 1].element);
            }
            behavior.do.push({
                element,
                method: 'show',
                args: _.mapValues(Functions.item.show.args, arg => arg.value)
            });
            this.emitChangeCommited();
        },

        removeAction(behaviorIndex, actionIndex) {
            this.item.behavior[behaviorIndex].do.splice(actionIndex, 1);
            this.emitChangeCommited();
        },

        onActionElementSelected(behaviorIndex, actionIndex, element) {
            this.item.behavior[behaviorIndex].do[actionIndex].element = element;
            this.emitChangeCommited();
        },

        onActionMethodSelected(behaviorIndex, actionIndex, methodOption) {
            const action = this.item.behavior[behaviorIndex].do[actionIndex];
            if (!action) {
                return;
            }
            if (methodOption.method === 'set') {
                action.method = methodOption.method;
                const args = {
                    field: methodOption.fieldPath,
                    value: ''
                };

                const element = this.findElement(action.element);
                if (element) {
                    args.value = utils.getObjectProperty(element, methodOption.fieldPath);
                }
                action.args = args;
            } else if (methodOption.method === 'custom-event') {
                action.method = 'sendEvent';
                action.args = {event: methodOption.event};
            } else {
                action.method = methodOption.method;
                action.args = this.getDefaultArgsForMethod(action, methodOption.method);
            }
            this.emitChangeCommited();
        },

        getDefaultArgsForMethod(action, method) {
            let functions = Functions.scheme;
            if (action.element && (action.element.item || action.element.itemGroup)) {
                functions = Functions.item;
            }
            if (action.element && action.element.connector) {
                functions = Functions.connector;
            }
            if (functions[method]) {
                const functionArgs = functions[method].args;
                if (functionArgs) {
                    const args = {};

                    _.forEach(functionArgs, (arg, argName) => {
                        args[argName] = arg.value;
                    });

                    return args;
                }
            }
            return {};
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
            this.item.behavior[behaviorIndex].do[actionIndex].args.value = value;
            const propertyName = this.item.behavior[behaviorIndex].do[actionIndex].args.field;
            this.emitChangeCommited(`${this.item.id}.shapeProps.${propertyName}`);
        },

        duplicateBehavior(behaviorIndex) {
            const newBehavior = utils.clone(this.item.behavior[behaviorIndex]);
            this.item.behavior.push(newBehavior);
            this.behaviorsMetas.push(this.createBehaviorMeta(newBehavior));
            this.emitChangeCommited();
            this.$forceUpdate();
        },

        emitChangeCommited(affinityId) {
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(affinityId);
        },

        showFunctionArgumentsEditor(action, behaviorIndex, actionIndex) {
            let functionDescription = null;
            if (action.element) {
                if (action.element.item || action.element.itemGroup) {
                    functionDescription = Functions.item[action.method];
                }
                if (action.element.connector) {
                    functionDescription = Functions.connector[action.method];
                }
            }

            if (!functionDescription) {
                functionDescription = {
                    args: {}
                };
            }
            this.functionArgumentsEditor.functionDescription = functionDescription;
            this.functionArgumentsEditor.args = action.args;
            this.functionArgumentsEditor.behaviorIndex = behaviorIndex;
            this.functionArgumentsEditor.actionIndex = actionIndex;
            this.functionArgumentsEditor.shown = true;
        },

        onFunctionArgumentsEditorChange(argName, value) {
            const behaviorIndex = this.functionArgumentsEditor.behaviorIndex
            const actionIndex   = this.functionArgumentsEditor.actionIndex;

            if (behaviorIndex < this.item.behavior.length) {
                const behavior = this.item.behavior[behaviorIndex];
                if (actionIndex < behavior.do.length) {
                    behavior.do[actionIndex].args[argName] = value;
                }
            }
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
            if (element && (element.item || element.itemGroup)) {
                scope = 'item';
            }
            if (element && element.connector) {
                scope = 'connector';
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
    },

    computed: {
        filteredItemGroupsSuggestions() {
            return this.existingItemGroups.filter(i => new RegExp(this.itemGroup, 'i').test(i.text));
        },
        itemGroups() {
            return _.map(this.item.groups, group => {return {text: group}});
        }
    }
}
</script>