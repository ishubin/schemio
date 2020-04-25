<template>
    <div @dragend="onDragEnd">
        <panel name="Groups">
            <vue-tags-input v-model="itemGroup"
                :tags="itemGroups"
                :autocomplete-items="filteredItemGroupsSuggestions"
                @tags-changed="onItemGroupsChange"
                ></vue-tags-input>
        </panel>

        <panel name="Events">
            <div class="behavior-container" v-for="(event, eventIndex) in item.behavior.events">
                <div class="behavior-event" @dragover="onDragOverToEvent(eventIndex)">
                    <div class="behavior-menu">
                        <span class="link icon-collapse" @click="toggleBehaviorCollapse(eventIndex)">
                            <i class="fas" :class="[eventMetas[eventIndex].collapsed?'fa-caret-right':'fa-caret-down']"/>
                        </span>
                        <span class="icon-event"><i class="fas fa-bell"></i></span>
                    </div>
                    <div class="behavior-right-menu">
                        <span class="link"
                            v-if="eventIndex > 0"
                            @click="moveBehaviorInOrder(eventIndex, eventIndex - 1)"><i class="fas fa-caret-up"></i></span>
                        <span class="link"
                            v-if="eventIndex < item.behavior.events.length - 1"
                            @click="moveBehaviorInOrder(eventIndex, eventIndex + 1)"
                            ><i class="fas fa-caret-down"></i></span>
                        <span class="link icon-delete" @click="removeBehaviorEvent(eventIndex)"><i class="fas fa-times"/></span>
                    </div>
                    <dropdown
                        :options="eventOptions"
                        @selected="onBehaviorEventSelected(eventIndex, arguments[0])"
                        >
                        <span v-if="isStandardEvent(event.event)">{{event.event | toPrettyEventName}}</span>
                        <input v-else type="text" :value="event.event" @input="event.event = arguments[0].target.value"/>
                    </dropdown>
                </div>

                <div v-if="!eventMetas[eventIndex].collapsed">
                    <div class="behavior-action-container behavior-drop-highlight" v-if="dragging.readyToDrop && dragging.dropTo.eventIndex === eventIndex && dragging.dropTo.actionIndex === 0 && (!event.actions || event.actions.length === 0)"
                        v-html="dragging.action">
                    </div>
                    <div v-for="(action, actionIndex) in event.actions">
                        <div class="behavior-action-container behavior-drop-highlight" v-if="dragging.readyToDrop && dragging.dropTo.eventIndex === eventIndex && dragging.dropTo.actionIndex === actionIndex"
                            v-html="dragging.action">
                        </div>
                        <div class="behavior-action-container"
                            :id="`behavior-action-container-${item.id}-${eventIndex}-${actionIndex}`"
                            @dragover="onDragOverToAction(eventIndex, actionIndex, arguments[0])"
                            :class="{'dragged': dragging.readyToDrop && eventIndex === dragging.eventIndex && actionIndex === dragging.actionIndex}"
                            draggable="true"
                            @dragstart="onActionDragStarted(eventIndex, actionIndex)"
                            >
                            <div class="icon-container">
                                <span class="icon-action"><i class="fas fa-circle"></i></span>
                                <span class="link icon-delete" @click="removeAction(eventIndex, actionIndex)"><i class="fas fa-times"/></span>
                                <span class="link icon-move"><i class="fas fa-arrows-alt"/></span>
                            </div>
                            <div>
                                <element-picker
                                    :element="action.element" 
                                    :scheme-container="schemeContainer"
                                    :self-item="item"
                                    @selected="onActionElementSelected(eventIndex, actionIndex, arguments[0])"
                                    />
                            </div>
                            <span>: </span>
                            <div>
                                <dropdown
                                    :key="action.element.item"
                                    :options="createMethodSuggestionsForElement(action.element)"
                                    @selected="onActionMethodSelected(eventIndex, actionIndex, arguments[0])"
                                    >
                                    <span v-if="action.method === 'set'"><i class="fas fa-cog"></i> {{action.args.field | toPrettyPropertyName(action.element, item, schemeContainer)}}</span>
                                    <span v-if="action.method !== 'set' && action.method !== 'sendEvent'"><i class="fas fa-play"></i> {{action.method | toPrettyMethod(action.element) }} </span>
                                    <span v-if="action.method === 'sendEvent'"><i class="fas fa-play"></i> {{action.args.event}} </span>
                                </dropdown>
                                <span v-if="action.method !== 'set' && action.method !== 'sendEvent' && action.args && Object.keys(action.args).length > 0"
                                    class="action-method-arguments-expand"
                                    @click="showFunctionArgumentsEditor(action, eventIndex, actionIndex)"
                                    >(...)</span>
                            </div>
                            <span v-if="action.method === 'set'" class="function-brackets"> = </span>

                            <set-argument-editor v-if="action.method === 'set'"
                                :key="action.args.field"
                                :argument-description="getArgumentDescriptionForElement(action.element, action.args.field)"
                                :argument-value="action.args.value"
                                @changed="onArgumentValueChangeForSet(eventIndex, actionIndex, arguments[0])"
                                />
                        </div>
                    </div>

                    <div class="behavior-action-container behavior-drop-highlight" v-if="dragging.readyToDrop && dragging.dropTo.eventIndex === eventIndex && dragging.dropTo.actionIndex > 0 && dragging.dropTo.actionIndex >= event.actions.length"
                        v-html="dragging.action">
                    </div>

                    <div class="behavior-event-add-action">
                        <span class="btn btn-secondary" @click="addActionToEvent(eventIndex)">Add Action</span>
                        <span class="btn btn-secondary" @click="duplicateBehavior(eventIndex)">Duplicate event</span>
                    </div>
                </div>
            </div>

            <span class="btn btn-primary" @click="addBehaviorEvent()">Add behavior event</span>
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

    mounted() {
        document.body.addEventListener('mouseup', this.onMouseUp);
    },
    beforeDestroy() {
        document.body.removeEventListener('mouseup', this.onMouseUp);
    },

    data() {
        const items = _.chain(this.schemeContainer.getItems())
            .map(item => {return {id: item.id, name: item.name || 'Unnamed'}})
            .sortBy(item => item.name)
            .value();

        const eventMetas = _.map(this.item.behavior.events, this.createBehaviorEventMeta);
        _.forEach(eventMetas, (meta, index) => {
            const collapsed = behaviorCollapseStateStorage.get(`${this.schemeContainer.scheme.id}/${this.item.id}/${index}`, 0);
            meta.collapsed = collapsed === 1 ? true: false;
        });

        return {
            items: items,
            eventOptions: this.createEventOptions(),
            eventMetas: eventMetas,
            functionArgumentsEditor: {
                shown: false,
                functionDescription: null,
                eventIndex: 0,
                actionIndex: 0,
                args: {}
            },
            itemGroup: '',
            existingItemGroups: _.map(this.schemeContainer.itemGroups, group => {return {text: group}}),

            dragging: {
                action: null,
                eventIndex: -1,
                actionIndex: -1,
                readyToDrop: false,
                dropTo: {
                    eventIndex: -1,
                    actionIndex: -1,
                }
            }
        };
    },

    methods: {
        createBehaviorEventMeta(behaviorEvent) {
            return{
                collapsed: behaviorEvent.actions && behaviorEvent.actions.length > 0, // collapsing behaviors that do not have any actions
            };
        },

        onItemGroupsChange(newGroups) {
            this.item.groups = _.map(newGroups, group => group.text);
            this.schemeContainer.reindexItems();
        },

        toggleBehaviorCollapse(eventIndex) {
            this.eventMetas[eventIndex].collapsed = !this.eventMetas[eventIndex].collapsed;
            behaviorCollapseStateStorage.save(`${this.schemeContainer.scheme.id}/${this.item.id}/${eventIndex}`, this.eventMetas[eventIndex].collapsed ? 1 : 0);
        },

        moveEventInOrder(srcIndex, dstIndex)  {
            if (dstIndex < 0 || dstIndex >= this.item.behavior.events.length) {
                return;
            }

            let temp = this.item.behavior.events[srcIndex];
            this.item.behavior.events[srcIndex] = this.item.behavior.events[dstIndex];
            this.item.behavior.events[dstIndex] = temp;

            temp = this.eventMetas[srcIndex];
            this.eventMetas[srcIndex] = this.eventMetas[dstIndex];
            this.eventMetas[dstIndex] = temp;

            this.$forceUpdate();
        },

        findElement(selector) {
            const elements = this.schemeContainer.findElementsBySelector(selector, this.item);
            if (elements.length > 0) {
                return elements[0];
            }
            return null;
        },

        createEventOptions() {
            let eventOptions = [];
                
            const shape = Shape.find(this.item.shape);
            if (shape) {
                eventOptions = standardItemEvents.concat(_.chain(shape.getEvents(this.item)).map(event => {return {id: event.name, name: event.name}}).value());
            }

            eventOptions.push({
                id: 'custom-event',
                name: 'Custom event ...'
            });
            return eventOptions;
        },

        createMethodSuggestionsForElement(element) {
            const options = [];

            _.forEach(Functions.item, (func, funcId) => {
                if (funcId !== 'set') {
                    options.push({
                        method: funcId,
                        name: func.name,
                        iconClass: 'fas fa-play'
                    });
                }
            });

            const item = this.findElement(element);
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

            options.push({
                method: 'set',
                name: 'Opacity',
                fieldPath: 'opacity',
                iconClass: 'fas fa-cog'
            });

            return options;
        },

        collectAllItemCustomEvents(item) {
            if (!item.behavior.events) {
                return [];
            }
            const filteredEvents = _.filter(item.behavior.events, event => {
                return !this.isStandardEvent(event.event);
            });

            return _.uniq(_.map(filteredEvents, event => event.event));
        },

        isStandardEvent(event) {
            return _.indexOf(standardItemEventIds, event) >= 0;
        },

        addBehaviorEvent() {
            if (!this.item.behavior.events) {
                this.item.behavior.events = [];
            }
            const newEvent = {
                id: shortid.generate(),
                event: 'clicked',
                actions: []
            };
            this.item.behavior.events.push(newEvent);
            this.eventMetas.push(this.createBehaviorEventMeta(newEvent));
            this.emitChangeCommited();
            this.$forceUpdate();
        },

        removeBehaviorEvent(eventIndex) {
            this.item.behavior.events.splice(eventIndex, 1);
            this.eventMetas.splice(eventIndex, 1)
            this.emitChangeCommited();
        },
        
        onBehaviorEventSelected(eventIndex, eventOption) {
            if (eventOption.id === 'custom-event') {
                this.item.behavior.events[eventIndex].event = 'Unknown event...';
            } else {
                this.item.behavior.events[eventIndex].event = eventOption.id;
            }
            this.emitChangeCommited();
        },

        addActionToEvent(eventIndex) {
            const event = this.item.behavior.events[eventIndex];
            if (!event.actions) {
                event.actions = [];
            }

            let element = 'self';

            if (event.actions.length > 0) {
                // picking element from the last action
                element = event.actions[event.actions.length - 1].element;
            }
            event.actions.push({
                element,
                method: 'show',
                args: _.mapValues(Functions.item.show.args, arg => arg.value)
            });
            this.emitChangeCommited();
        },

        removeAction(eventIndex, actionIndex) {
            this.item.behavior.events[eventIndex].actions.splice(actionIndex, 1);
            this.emitChangeCommited();
        },

        onActionElementSelected(eventIndex, actionIndex, element) {
            this.item.behavior.events[eventIndex].actions[actionIndex].element = element;
            this.emitChangeCommited();
        },

        onActionMethodSelected(eventIndex, actionIndex, methodOption) {
            const action = this.item.behavior.events[eventIndex].actions[actionIndex];
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
            let functions = Functions.item;

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

        onArgumentValueChangeForSet(eventIndex, actionIndex, value) {
            this.item.behavior.events[eventIndex].actions[actionIndex].args.value = value;
            const propertyName = this.item.behavior.events[eventIndex].actions[actionIndex].args.field;
            this.emitChangeCommited(`${this.item.id}.behavior.events.${eventIndex}.actions.${actionIndex}.args.${propertyName}`);
        },

        duplicateBehavior(eventIndex) {
            const newEvent = utils.clone(this.item.behavior.events[eventIndex]);
            this.item.behavior.events.push(newEvent);
            this.eventMetas.push(this.createBehaviorEventMeta(newEvent));
            this.emitChangeCommited();
            this.$forceUpdate();
        },

        emitChangeCommited(affinityId) {
            EventBus.emitItemChanged(this.item.id);
            EventBus.emitSchemeChangeCommited(affinityId);
        },

        showFunctionArgumentsEditor(action, eventIndex, actionIndex) {
            let functionDescription = Functions.item[action.method];

            if (!functionDescription) {
                functionDescription = {
                    args: {}
                };
            }
            this.functionArgumentsEditor.functionDescription = functionDescription;
            this.functionArgumentsEditor.args = action.args;
            this.functionArgumentsEditor.eventIndex = eventIndex;
            this.functionArgumentsEditor.actionIndex = actionIndex;
            this.functionArgumentsEditor.shown = true;
        },

        onFunctionArgumentsEditorChange(argName, value) {
            const eventIndex = this.functionArgumentsEditor.eventIndex
            const actionIndex   = this.functionArgumentsEditor.actionIndex;

            if (eventIndex < this.item.behavior.events.length) {
                const event = this.item.behavior.events[eventIndex];
                if (actionIndex < event.actions.length) {
                    event.actions[actionIndex].args[argName] = value;
                }
            }
        },

        onActionDragStarted(eventIndex, actionIndex) {
            const action = this.item.behavior.events[eventIndex].actions[actionIndex];
            let name = 'Drop here';
            // TODO refactor to use $ref
            const domActionContainer = document.getElementById(`behavior-action-container-${this.item.id}-${eventIndex}-${actionIndex}`);
            if (domActionContainer) {
                name = domActionContainer.innerHTML;
            }
            this.dragging.action = name;


            this.dragging.eventIndex = eventIndex;
            this.dragging.actionIndex = actionIndex;
            this.dragging.dropTo.eventIndex = -1;
            this.dragging.dropTo.actionIndex = -1;
        },

        onDragOverToEvent(eventIndex) {
            this.dragging.dropTo.eventIndex = eventIndex;
            this.dragging.dropTo.actionIndex = 0;
            this.dragging.readyToDrop = !(this.dragging.eventIndex === eventIndex && this.dragging.actionIndex === 0);
        },

        onDragOverToAction(eventIndex, actionIndex, event) {
            this.dragging.dropTo.eventIndex = eventIndex;
            this.dragging.dropTo.actionIndex = actionIndex;

            const domActionContainer = event.target.closest('.behavior-action-container');
            if (domActionContainer) {
                const containerRect = domActionContainer.getBoundingClientRect();
                const midLine = containerRect.top + containerRect.height / 2;
                const offsetToMid = event.clientY - midLine;
                if (offsetToMid > 0) {
                    this.dragging.dropTo.actionIndex = actionIndex + 1;
                }
            }
            let readyToDrop = true;
            
            if (this.dragging.eventIndex === this.dragging.dropTo.eventIndex) {
                if (this.dragging.actionIndex === this.dragging.dropTo.actionIndex || this.dragging.actionIndex === this.dragging.dropTo.actionIndex - 1) {
                    readyToDrop = false;
                }
            }
            this.dragging.readyToDrop = readyToDrop;
        },

        onMouseUp() {
            if (this.dragging.action) {
                this.$nextTick(() => {
                    this.resetDragging();
                });
            }
        },

        onDragEnd() {
            if (this.dragging.eventIndex >= 0 && this.dragging.actionIndex >= 0 && this.dragging.dropTo.eventIndex >= 0 && this.dragging.dropTo.actionIndex >= 0) {
                this.moveAction(this.dragging.eventIndex, this.dragging.actionIndex, this.dragging.dropTo.eventIndex, this.dragging.dropTo.actionIndex);
            }
            this.resetDragging();
        },

        resetDragging() {
            this.dragging.action = null;
            this.dragging.eventIndex = -1;
            this.dragging.actionIndex = -1;
            this.dragging.readyToDrop = false;
            this.dragging.dropTo.eventIndex = -1;
            this.dragging.dropTo.actionIndex = -1;
        },

        moveAction(srcBehaviorIndex, srcActionIndex, dstBehaviorIndex, dstActionIndex) {
            if (srcBehaviorIndex === dstBehaviorIndex && srcActionIndex === dstActionIndex) {
                return;
            }
            const action = this.item.behavior.events[srcBehaviorIndex].actions.splice(srcActionIndex, 1)[0];

            if (srcBehaviorIndex === dstBehaviorIndex && dstActionIndex > srcActionIndex) {
                // since the item was removed from the same array, we need to adjust the new destination position in the array
                dstActionIndex -= 1;
            }
            this.item.behavior.events[dstBehaviorIndex].actions.splice(dstActionIndex, 0, action);

            this.emitChangeCommited();
        }
    },

    filters: {
        toPrettyEventName(event) {
            if (Events.standardEvents[event]) {
                return Events.standardEvents[event].name;
            } else {
                return event;
            }
        },

        toPrettyMethod(method, element) {
            if (Functions.main[method]) {
                return Functions.main[method].name;
            } else {
                return method;
            }
        },


        toPrettyPropertyName(propertyPath, element, selfItem, schemeContainer) {
            //TODO cache all item properties instead of fetching them over and over again
            if (propertyPath === 'opacity') {
                return 'Opacity';
            } else if (propertyPath.indexOf('shapeProps.') === 0) {
                const item = this.findElement(element);
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