<template>
    <div>
        <div class="behavior-role" v-for="(role, roleId) in item.behavior" :key="roleId">
            <div class="behavior-trigger">
                <span class="behavior-trigger-on">on</span>

                <div class="behavior-trigger-originator-event">
                    <dropdown :options="originatorOptions" @selected="selectOriginator(roleId, arguments[0])">
                        <span class="behavior-trigger-originator">{{role.on.originator | toOriginatorPrettyName(itemMap) }}</span>
                    </dropdown>

                    <dropdown :options="itemEvents" @selected="selectTriggerEvent(roleId, arguments[0])">
                        <span class="behavior-trigger-event">{{role.on.event | toPrettyEventName}}</span>
                    </dropdown>
                </div>
            </div>

            <div class="behavior-action-container">
                <div class="behavior-action-separator">
                    <i class="fas fa-angle-down"></i>
                </div>

                <div v-for="(action, actionId) in role.do" :key="actionId">
                    <div class="behavior-action" v-if="action.method === 'set'">
                        <span class="behavior-action-remove-icon" @click="removeRoleAction(roleId, actionId)"><i class="fas fa-times"></i></span>

                        <dropdown :options="originatorOptions" @selected="selectRoleActionItem(roleId, actionId, arguments[0])">
                            <span class="behavior-action-item">{{action.item | toOriginatorPrettyName(itemMap) }}</span>
                        </dropdown>

                        <dropdown :options="supportedFunctions" @selected="selectRoleActionMethod(roleId, actionId, arguments[0])">
                            <span class="behavior-action-method">{{action.method | toPrettyMethod(methodMap) }}</span>
                        </dropdown>

                        <span class="behavior-action-bracket">(</span>

                        <dropdown :options="methodArgumentsMeta[roleId][actionId].args[0].options" @selected="selectSetProperty(roleId, actionId, arguments[0])">
                            <span class="behavior-action-argument">{{action.args[0] | toPrettySetPropertyName(methodArgumentsMeta[roleId][actionId].args[0].argMap) }}</span>
                        </dropdown>
                        <span class="behavior-action-bracket">,</span>


                        <color-picker v-if="methodArgumentsMeta[roleId][actionId].args[0].argMap[action.args[0]] && methodArgumentsMeta[roleId][actionId].args[0].argMap[action.args[0]].type === 'color'"
                            :color="action.args[1]" @input="action.args[1] = arguments[0]; $forceUpdate();"></color-picker>
                        <input v-else class="behavior-action-argument" v-model="action.args[1]"/>

                        <span class="behavior-action-bracket">)</span>
                    </div>
                    <div v-else  class="behavior-action">
                        <span class="behavior-action-remove-icon" @click="removeRoleAction(roleId, actionId)"><i class="fas fa-times"></i></span>

                        <dropdown :options="originatorOptions" @selected="selectRoleActionItem(roleId, actionId, arguments[0])">
                            <span class="behavior-action-item">{{action.item | toOriginatorPrettyName(itemMap) }}</span>
                        </dropdown>

                        <dropdown :options="supportedFunctions" @selected="selectRoleActionMethod(roleId, actionId, arguments[0])">
                            <span class="behavior-action-method">{{action.method | toPrettyMethod(methodMap) }}</span>
                        </dropdown>

                        <span class="behavior-action-bracket">()</span>
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
import Shape from '../items/shapes/Shape.js'
import Dropdown from '../../Dropdown.vue';
import ColorPicker from '../ColorPicker.vue';

const supportedEvents = {
    mousein: {
        id: 'mousein',
        name: 'Mouse In'
    },
    mouseout: {
        id: 'mouseout',
        name: 'Mouse Out'
    }
};

const supportedFunctions = {
    set: {
        id: 'set',
        name: 'Set'
    },
    hide: {
        id: 'hide',
        name: 'Hide'
    },
    show: {
        id: 'show',
        name: 'Show'
    }
}

export default {
    props: ['item', 'schemeContainer'],
    components: {Dropdown, ColorPicker},

    mounted() {
        this.roles = this.convertRoles(this.item.behavior);
    },

    data() {
        const items = _.chain(this.schemeContainer.getItems())
            .map(item => {return {id: item.id, name: item.name || 'Unnamed'}})
            .sortBy(item => item.name)
            .value();

        return {
            roles: [],
            itemMap: this.createItemMap(),
            items: items,
            originatorOptions: [{id: 'self', name: 'Self'}].concat(items),
            itemEvents: _.chain(supportedEvents).values().sortBy(event => event.name).value(),
            supportedFunctions: _.chain(supportedFunctions).values().sortBy(func => func.name).value(),
            methodMap: supportedFunctions,

            methodArgumentsMeta: this.createMethodArgumentsMeta(this.item.behavior)
        };
    },

    methods: {

        refreshMethodArgumentsMeta() {
            this.methodArgumentsMeta = this.createMethodArgumentsMeta(this.item.behavior);
        },

        createMethodArgumentsMeta(behaviorRoles) {
            return _.map(behaviorRoles, role => {
                return _.map(role.do, action => {
                    return this.argumentsMetaForMethod(action.item, action.method, action.args);
                });
            });
        },

        argumentsMetaForMethod(itemId, method, args) {
            let metaArgs = [];

            if (method === 'set') {
                let item = this.item;
                if (itemId !== 'self') {
                    item = this.schemeContainer.findItemById(itemId);
                }

                const propsOptions = [
                    {id: 'opacity', name: 'Opacity'}
                ];

                const argMap = {
                    opacity: {type: 'number', defaultValue: 1.0, name: 'Opacity'}
                };

                if (item) {
                    const shape = Shape.find(item.shape);
                    if (shape) {
                        _.forEach(shape.args, (shapeArg, shapeArgName) => {
                            propsOptions.push({
                                id: `style.${shapeArgName}`, name: `Shape :: ${shapeArg.name}`, _type: shapeArg.type, _defaultValue: shapeArg.value
                            });
                            argMap[`style.${shapeArgName}`] = {
                                type: shapeArg.type,
                                name: `Shape :: ${shapeArg.name}`,
                                defaultValue: shapeArg.value
                            };
                        });
                    }
                }

                metaArgs = [{
                    options: propsOptions,
                    argMap
                }];
            }
            return {
                args: metaArgs
            }
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

        convertRoles(behaviorRoles) {
            return _.map(behaviorRoles, this.convertRole);
        },

        convertRole(itemRole) {
            const role = {
                on: {
                },
                do: []
            };
            return role;
        },

        selectOriginator(roleIndex, originator) {
            let itemId = originator;
            if (originator === this.item.id) {
                itemId = 'self';
            }

            this.item.behavior[roleIndex].on.originator = itemId;
        },

        selectTriggerEvent(roleIndex, event) {
            this.item.behavior[roleIndex].on.event = event;
        },

        selectRoleActionItem(roleIndex, actionIndex, itemId) {
            this.item.behavior[roleIndex].do[actionIndex].item = itemId;
        },

        selectRoleActionMethod(roleIndex, actionIndex, method) {
            if (method === 'set') {
                this.methodArgumentsMeta[roleIndex][actionIndex] = this.argumentsMetaForMethod(this.item.behavior[roleIndex].do[actionIndex].item, method);
            }
            this.item.behavior[roleIndex].do[actionIndex].method = method;
        },

        selectSetProperty(roleIndex, actionIndex, propertyName) {
            this.item.behavior[roleIndex].do[actionIndex].args[0] = propertyName;

            const argMap = this.methodArgumentsMeta[roleIndex][actionIndex].args[0].argMap;
            if (argMap) {
                if (argMap[propertyName]) {
                    this.item.behavior[roleIndex].do[actionIndex].args[1] = argMap[propertyName].defaultValue;
                }
            }

            this.$forceUpdate();
        },

        addActionToRole(roleIndex) {
            this.item.behavior[roleIndex].do.push({
                item: 'self',
                method: 'select method...',
                args: []
            });
            this.refreshMethodArgumentsMeta();
        },
        removeRoleAction(roleIndex, actionIndex) {
            this.item.behavior[roleIndex].do.splice(actionIndex, 1);
            this.refreshMethodArgumentsMeta();
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
                return 'Page'
            }
        },

        toPrettyEventName(event) {
            if (supportedEvents[event]) {
                return supportedEvents[event].name;
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
