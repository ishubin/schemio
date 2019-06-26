<template>
    <div>
        <div class="behavior-role" v-for="(role, roleId) in item.behavior" :key="roleId">
            <div class="behavior-trigger">
                <span class="behavior-trigger-on">on</span>
                <span class="behavior-trigger-originator">{{role.on.originator | toOriginatorPrettyName }}</span>
                <span class="behavior-trigger-event">{{role.on.event}}</span>
            </div>

            <div class="behavior-action-separator">
                <i class="fas fa-angle-down"></i>
            </div>

            <div v-for="(action, actionId) in role.do" :key="actionId">
                <div class="behavior-action">
                    <span class="behavior-action-item">{{action.item || toOriginatorPrettyName}}</span>
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
</template>

<script>
import _ from 'lodash';

export default {
    props: ['item', 'schemeContainer'],

    mounted() {
        this.roles = this.convertRoles(this.item.behavior);
    },

    data() {
        return {
            roles: [],
            itemMap: this.createItemMap()
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
        toOriginatorPrettyName(originator) {
            if (originator === 'self') {
                return 'Self';
            } else if (originator) {
                if (this.itemMap[originator]) {
                    const name = this.itemMap[originator].name || 'Unnamed';
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
