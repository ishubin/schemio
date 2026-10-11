<template>
    <div class="editor-script-panel">
        <div class="editor-script-controls">
            <span class="btn btn-primary btn-small" @click="executeScript(script)" title="Run script"><i class="fa-solid fa-play"></i></span>
        </div>

        <div ref="scriptPane" class="editor-script-editor">
            <div class="editor-script-output">
                <div class="output-row" v-for="entry in outputHistory" :class="[entry.type]">
                    <i v-if="entry.type === 'command'" class="icon fa-solid fa-chevron-right"></i>
                    <i v-else class="icon fa-solid fa-chevron-left"></i>
                    <div class="message">{{ entry.value }}</div>
                </div>
            </div>

            <div class="editor-script-editor-wrapper">
                <ScriptEditor
                    :value="script"
                    :schemeContainer="schemeContainer"
                    :height="-1"
                    :functionCompletions="functionCompletions"
                    :consoleMode="true"
                    @changed="onScriptChange"
                    @execute="onScriptExecute"
                    />
            </div>
        </div>
    </div>
</template>


<script>
import { buildMainScopeFunctions, createItemByNameProvider } from '../scripting/main.js';
import { parseExpression } from '../templater/ast.js';
import { Scope } from '../templater/scope.js';
import { Vector } from '../templater/vector.js';
import UserEventBus from '../userevents/UserEventBus.js';
import EditorEventBus from './editor/EditorEventBus.js';
import ScriptEditor from './editor/ScriptEditor.vue';

const functionCompletions = [
];

export default {
    props: {
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object, required: true},
    },

    components: { ScriptEditor },

    beforeMount() {
        EditorEventBus.scriptLog.$on(this.editorId, this.onScriptLog);
    },

    beforeDestroy() {
        EditorEventBus.scriptLog.$off(this.editorId, this.onScriptLog);
    },

    data() {
        return {
            script: "",
            functionCompletions,
            outputHistory: []
        };
    },

    methods: {
        onScriptLog(type, message) {
            this.outputHistory.push({
                type: `log-${type}`,
                value: message
            });
        },

        onScriptExecute(script) {
            this.executeScript(script);
        },

        onScriptChange(script) {
            this.script = script;
        },

        executeScript(script) {
            this.outputHistory.push({
                type: 'command',
                value: script
            });

            const userEventBus = new UserEventBus(this.editorId);
            const scope = new Scope({
                ...buildMainScopeFunctions(this.schemeContainer, userEventBus)
            }, null, createItemByNameProvider(this.schemeContainer, userEventBus));

            const ast = parseExpression(script);
            try {
                const output = ast.evalNode(scope);
                if (typeof output === 'number' || typeof output === 'string') {
                    this.outputHistory.push({
                        type: 'output',
                        value: String(output)
                    });
                } else if (output instanceof Vector) {
                    this.outputHistory.push({
                        type: 'output',
                        value: `Vector(${output.x}, ${output.y})`
                    });
                }
            } catch(err) {
                this.outputHistory.push({
                    type: 'error',
                    value: err.message
                });
            }

            this.$nextTick(() => {
                const scriptPane = this.$refs.scriptPane;
                scriptPane.scrollTop = scriptPane.scrollHeight;
            });
        }
    }
}
</script>