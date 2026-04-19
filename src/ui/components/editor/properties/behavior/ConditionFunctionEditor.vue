<template>
    <div class="condition-function-editor">
        <div class="label">
            Runs a script using SchemioScript language <a class="link" target="_blank" href="https://github.com/ishubin/schemio/blob/master/docs/Scripting.md">(documentation)</a>
            and evaluates the last executed operation as part of condition
        </div>
        <ScriptEditor
            :value="args.expression"
            :height="100"
            :schemeContainer="schemeContainer"
            :previousScripts="[schemeContainer.scheme.scripts.main.source]"
            @changed="emitArgChange('expression', $event)" />

        <table>
            <tr>
                <td>If true:</td>
                <td>
                    <Dropdown
                        :options="conditionBranchOptions"
                        :auto-focus-search="args.success !== 'send-event'"
                        :inline="true"
                        :borderless="false"
                        @selected="onSuccessSelected">
                        <i :class="toIcon(args.success)"/>
                        <span> {{ args.success | toPrettyName }} </span>
                    </Dropdown>
                    <input ref="sendEventInputSuccess" v-if="args.success === 'send-event'" type="text" :value="args.successEvent" class="condition-function-send-event"/>
                </td>
            </tr>
            <tr>
                <td>Else:</td>
                <td>
                    <Dropdown
                        :options="conditionBranchOptions"
                        :auto-focus-search="args.fail !== 'send-event'"
                        :inline="true"
                        :borderless="false"
                        @selected="onFailSelected">
                        <i :class="toIcon(args.fail)"/>
                        <span> {{ args.fail | toPrettyName }} </span>
                    </Dropdown>
                    <input ref="sendEventInputFail" v-if="args.fail === 'send-event'" type="text" :value="args.failEvent" class="condition-function-send-event"/>

                </td>
            </tr>
        </table>
    </div>
</template>

<script>
import ScriptEditor from '../../ScriptEditor.vue';
import Dropdown from '../../../Dropdown.vue';

const eventPrettyNames = {
    'pass': 'Pass',
    'skip-next': 'Skip next',
    'break-event': 'Break event',
    'send-event': 'Send event'
};

const eventIcons = {
    'pass': 'fa-solid fa-check',
    'skip-next': 'fa-solid fa-forward-step',
    'break-event': 'fa-solid fa-xmark',
    'send-event': 'fas fa-bell'
};

export default {
    props: {
        editorId: { type: String },
        args: { type: Object },
        schemeContainer: { type: Object },
    },

    components: { ScriptEditor, Dropdown },

    data() {
        return {
            conditionBranchOptions: [{
                id: 'pass',
                description: 'Proceeds to next action in the current event'
            }, {
                id: 'skip-next',
                description: 'Skips next action in the current event'
            }, {
                id: 'break-event',
                description: 'Stops execution of remaining actions for the current event'
            }, {
                id: 'send-event',
                description: 'Sends event to the same item',
            }].map(opt => {
                return {
                    ...opt,
                    name: eventPrettyNames[opt.id],
                    iconClass: eventIcons[opt.id]
                };
            })
        };
    },

    methods: {
        emitArgChange(name, value) {
            this.$emit('argument-changed', {name, value});
        },

        toIcon(optionId) {
            return eventIcons[optionId];
        },

        onSuccessSelected(option) {
            this.emitArgChange('success', option.id);
            if (option.id === 'send-event') {
                this.$nextTick(() => {
                    this.$refs.sendEventInputSuccess.focus();
                });
            }
        },

        onFailSelected(option) {
            this.emitArgChange('fail', option.id);
            if (option.id === 'send-event') {
                this.$nextTick(() => {
                    this.$refs.sendEventInputFail.focus();
                });
            }
        },
    },
    filters: {
        toPrettyName(id) {
            return eventPrettyNames[id];
        }
    }
};
</script>