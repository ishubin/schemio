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
                    <div class="behavior-action">
                        <dropdown :options="originatorOptions" @selected="selectRoleActionItem(roleId, actionId, arguments[0])">
                            <span class="behavior-action-item">{{action.item | toOriginatorPrettyName(itemMap) }}</span>
                        </dropdown>

                        <dropdown :options="supportedFunctions" @selected="selectRoleActionMethod(roleId, actionId, arguments[0])">
                            <span class="behavior-action-method">{{action.method | toPrettyMethod(methodMap) }}</span>
                        </dropdown>

                        <span class="behavior-action-bracket">(</span>
                        <span v-for="(arg, argId) in action.args" :key="argId">
                            <span class="behavior-action-argument">{{arg}}</span> <span class="behavior-action-bracket">,</span>
                        </span>
                        <span class="behavior-action-add-argument"><i class="fas fa-plus"></i></span> 
                        <span class="behavior-action-bracket">)</span>
                    </div>
                    <div class="behavior-action-separator">
                        <i class="fas fa-angle-down"></i>
                    </div>
                </div>

                <div class="behavior-action-add-button">
                    Click to add action
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import _ from 'lodash';
import Dropdown from '../../Dropdown.vue';

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
        name: 'Set Property'
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
    components: {Dropdown},

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
            methodMap: supportedFunctions
        };
    },

    methods: {
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
            this.item.behavior[roleIndex].do[actionIndex].method = method;
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
        }
    }
}
</script>
