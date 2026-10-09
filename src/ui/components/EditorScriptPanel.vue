<template>
    <div class="editor-script-panel">
        <div class="editor-script-controls">
            <span class="btn btn-primary btn-small" @click="executeScript" title="Run script"><i class="fa-solid fa-play"></i></span>
        </div>

        <div class="editor-script-editor">
            <div class="editor-script-editor-wrapper">
                <ScriptEditor
                    :value="script"
                    :schemeContainer="schemeContainer"
                    :stretchVertically="true"
                    :functionCompletions="functionCompletions"
                    @changed="onScriptChange"
                    />
            </div>
        </div>
    </div>
</template>


<script>
import { buildMainScopeFunctions, createItemByNameProvider } from '../scripting/main.js';
import { parseExpression } from '../templater/ast.js';
import { Scope } from '../templater/scope.js';
import UserEventBus from '../userevents/UserEventBus.js';
import ScriptEditor from './editor/ScriptEditor.vue';

const functionCompletions = [
];

export default {
    props: {
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object, required: true},
    },

    components: { ScriptEditor },

    data() {
        return {
            script: "",
            functionCompletions,
        };
    },

    methods: {
        onScriptChange(script) {
            this.script = script;
        },

        executeScript() {
            const userEventBus = new UserEventBus(this.editorId);
            const scope = new Scope({
                ...buildMainScopeFunctions(this.schemeContainer, userEventBus)
            }, null, createItemByNameProvider(this.schemeContainer, userEventBus));

            const ast = parseExpression(this.script);
            ast.evalNode(scope);
        }
    }
}
</script>