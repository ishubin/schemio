<template>
    <div>
        <div class="behavior-role" v-for="(role, roleId) in item.behavior" :key="roleId">
            <div class="behavior-trigger">
                <span class="behavior-trigger-on">on</span>
                
                <dropdown :options="originatorOptions" @selected="role.on.originator = arguments[0]">
                    <span class="behavior-trigger-originator">{{role.on.originator | toOriginatorPrettyName(itemMap) }}</span>
                </dropdown>

                <span class="behavior-trigger-event">{{role.on.event}}</span>
            </div>

            <div class="behavior-action-container">
                <div class="behavior-action-separator">
                    <i class="fas fa-angle-down"></i>
                </div>

                <div v-for="(action, actionId) in role.do" :key="actionId">
                    <div class="behavior-action">
                        <span class="behavior-action-item">{{action.item || toOriginatorPrettyName(itemMap)}}</span>
                        <span class="behavior-action-method">{{action.method}}</span>
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
            originatorOptions: items //Later going to extend it with 'Global'
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
        }
    }
}
</script>
