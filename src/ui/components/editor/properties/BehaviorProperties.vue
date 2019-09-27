<template>
    <div>
        <span class="btn btn-primary" @click="addRole()">Add behavior event</span>

        <div class="behavior-role" v-for="(role, roleId) in behaviorEvents" :key="role.id">
            <div class="behavior-trigger">
                <span class="behavior-trigger-on">on</span>
                <span class="behavior-trigger-remove-icon" @click="removeRole(roleId)"><i class="fas fa-times"></i></span>

                <div class="behavior-trigger-originator-event">
                    <dropdown :options="originatorOptions" @selected="selectOriginator(roleId, arguments[0])">
                        <span class="behavior-trigger-originator">{{role.on.originator | toOriginatorPrettyName(itemMap) }}</span>
                    </dropdown>

                    <dropdown :options="role.eventOptions" @selected="selectTriggerEvent(roleId, arguments[0])">
                        <span class="behavior-trigger-event">{{role.on.event | toPrettyEventName}}</span>
                    </dropdown>
                </div>
            </div>

            <div class="behavior-action-container">
                <div class="behavior-action-separator">
                    <i class="fas fa-angle-down"></i>
                </div>

                <div v-for="(action, actionId) in role.do" :key="`${role.id}-${actionId}`">
                    <div class="behavior-action">
                        <span class="behavior-action-remove-icon" @click="removeRoleAction(roleId, actionId)"><i class="fas fa-times"></i></span>

                        <dropdown :options="originatorOptions" @selected="selectRoleActionItem(roleId, actionId, arguments[0])">
                            <span class="behavior-action-item">{{action.item | toOriginatorPrettyName(itemMap) }}</span>
                        </dropdown>

                        <dropdown :options="supportedFunctions" @selected="selectRoleActionMethod(roleId, actionId, arguments[0])">
                            <span class="behavior-action-method">{{action.method | toPrettyMethod(methodMap) }}</span>
                        </dropdown>

                        <span class="behavior-action-bracket">(</span>

                        <behavior-argument v-for="(arg, argId) in action.args" :key="`${roleId}-${actionId}-${argId}`" :argument="arg" @change="onArgumentChange(roleId, actionId, argId, arguments[0])"></behavior-argument>

                        <span class="behavior-action-bracket">)</span>
                    </div>
                    <div class="behavior-action-separator">
                        <i class="fas fa-angle-down"></i>
                    </div>
                </div>

                <div class="behavior-action-add-button" @click="addActionToRole(roleId)">
                    Click to add action
                </div>
            </div>
        </div>
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

const supportedFunctions = _.mapValues(Functions, (func, funcId) => {return {id: funcId, name: func.name}});

const supportedProperties = {
    opacity: {id: 'opacity', name: 'Opacity', _type: 'text'}
};

const standardItemEvents = _.chain(Events.standardEvents).values().sortBy(event => event.name).value();

export default {
    props: ['item', 'schemeContainer'],

    components: {BehaviorArgument, Dropdown},

    data() {
        const items = _.chain(this.schemeContainer.getItems())
            .map(item => {return {id: item.id, name: item.name || 'Unnamed'}})
            .sortBy(item => item.name)
            .value();

        return {
            itemMap: this.createItemMap(),
            items: items,
            originatorOptions: [{id: 'self', name: 'Self'}].concat(items),
            supportedFunctions: _.chain(supportedFunctions).values().sortBy(func => func.name).value(),
            methodMap: supportedFunctions,
            behaviorEvents: this.convertItemBehavior(this.item.behavior)
        };
    },

    methods: {
        convertItemBehavior(behavior) {
            return _.map(behavior, this.convertItemBehaviorEvent);
        },

        convertItemBehaviorEvent(itemBehaviorEvent) {
            let eventOptions = standardItemEvents;
            

            const originatorItem = this.findItem(itemBehaviorEvent.on.originator);
            if (originatorItem) {
                const shape = Shape.find(originatorItem.shape);
                if (shape) {
                    eventOptions = standardItemEvents.concat(_.chain(shape.getEvents(originatorItem)).map(event => {return {id: event.name, name: event.name}}).value());
                }
            }

            return {
                id:             shortid.generate(),
                on:             this.convertItemBehaviorEventOnStatement(itemBehaviorEvent.on),
                eventOptions:   eventOptions,
                do:             _.map(itemBehaviorEvent.do, this.convertItemBehaviorAction)
            };
        },

        convertItemBehaviorEventOnStatement(itemOnStatement) {
            return {
                originator: itemOnStatement.originator,
                event:      itemOnStatement.event,
                args:       itemOnStatement.args
            };
        },

        convertItemBehaviorAction(itemAction) {
            const action = {
                item: itemAction.item,
                method: itemAction.method,
                args: this.convertMethodArguments(itemAction)
            };
            return action;
        },

        convertMethodArguments(itemAction) {
            if (itemAction.method === 'set') {
                return this.convertMethodArgumentsForSet(itemAction);
            } else {
                //TODO fix it later once we have more methods that take arguments
                return []; // since other methods do not take arguments. 
            }
        },

        convertMethodArgumentsForSet(itemAction) {
            const firstArg = {
                options: _.chain(supportedProperties).valuesIn().sortBy(arg => arg.id).value(),
                value: itemAction.args? itemAction.args[0]: 'opacity',
                type: 'choice'
            };

            const secondArg = {
                value: (itemAction.args && itemAction.args.length > 1)? itemAction.args[1] : '',
                type: 'text'
            };

            _.forEach(this.findShapeArgsForItem(itemAction.item), (shapeArg, shapeArgName) => {
                const propertyPath = `shapeProps.${shapeArgName}`;
                if (firstArg.value === propertyPath) {
                    firstArg.displayValue = `Shape :: ${shapeArg.name}` ;
                    secondArg.type = shapeArg.type;
                    if (secondArg.value === null || secondArg.value === undefined || secondArg.value === '') {
                        secondArg.value = shapeArg.value;
                        secondArg.options = shapeArg.options;
                    }
                }
                firstArg.options.push({
                    id: propertyPath,
                    name: `Shape :: ${shapeArg.name}`,
                    _type: shapeArg.type
                });
            });

            if (!firstArg.displayValue) {
                firstArg.displayValue = firstArg.value
            }

            return [firstArg, secondArg];
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

        selectOriginator(roleIndex, originator) {
            let itemId = originator;
            if (originator === this.item.id) {
                itemId = 'self';
            }

            this.item.behavior[roleIndex].on.originator = itemId;
            this.behaviorEvents[roleIndex] = this.convertItemBehaviorEvent(this.item.behavior[roleIndex]);
            this.$forceUpdate();
        },

        selectTriggerEvent(roleIndex, event) {
            this.item.behavior[roleIndex].on.event = event;
            this.behaviorEvents[roleIndex].on = this.convertItemBehaviorEventOnStatement(this.item.behavior[roleIndex].on);
            this.$forceUpdate();
        },

        selectRoleActionItem(roleIndex, actionIndex, itemId) {
            this.item.behavior[roleIndex].do[actionIndex].item = itemId;
            this.behaviorEvents[roleIndex].do[actionIndex] = this.convertItemBehaviorAction(this.item.behavior[roleIndex].do[actionIndex]);
            this.$forceUpdate();
        },

        selectRoleActionMethod(roleIndex, actionIndex, method) {
            this.item.behavior[roleIndex].do[actionIndex].method = method;
            this.behaviorEvents[roleIndex].do[actionIndex] = this.convertItemBehaviorAction(this.item.behavior[roleIndex].do[actionIndex]);
            this.$forceUpdate();
        },

        onArgumentChange(roleIndex, actionIndex, argumentIndex, argumentValue) {
            const itemAction = this.item.behavior[roleIndex].do[actionIndex];
            const convertedAction = this.behaviorEvents[roleIndex].do[actionIndex];
            itemAction.args[argumentIndex] = argumentValue;

            if (itemAction.method === 'set' && argumentIndex === 0) {
                // do it only in case the property name was changed for the "set" method, so that we re-render control for the 2-nd argument
                const item = this.findItem(itemAction.item);
                if (item) {
                    const propertyValue = utils.getObjectProperty(item, argumentValue);
                    if (propertyValue !== undefined && propertyValue !== null) {
                        itemAction.args[1] = propertyValue;
                    }
                }

                this.behaviorEvents[roleIndex].do[actionIndex] = this.convertItemBehaviorAction(this.item.behavior[roleIndex].do[actionIndex]);
                this.$forceUpdate();
            }
        },

        addActionToRole(roleIndex) {
            const action = {
                item: 'self',
                method: 'show',
                args: []
            }; 
            this.item.behavior[roleIndex].do.push(action);
            this.behaviorEvents[roleIndex].do.push(this.convertItemBehaviorAction(action));
            this.$forceUpdate();
        },

        removeRoleAction(roleIndex, actionIndex) {
            this.item.behavior[roleIndex].do.splice(actionIndex, 1);
            this.behaviorEvents[roleIndex].do.splice(actionIndex, 1);
            this.$forceUpdate();
        },

        removeRole(roleIndex) {
            this.item.behavior.splice(roleIndex, 1);
            this.behaviorEvents.splice(roleIndex, 1);
            this.$forceUpdate();
        },

        addRole() {
            if (!this.item.behavior) {
                this.item.behavior = [];
            }
            const newEvent = {
                on: {
                    originator: 'self',
                    event: 'mousein',
                    args: []
                },
                do: []
            };
            this.item.behavior.push(newEvent);
            this.behaviorEvents.push(this.convertItemBehaviorEvent(newEvent));
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