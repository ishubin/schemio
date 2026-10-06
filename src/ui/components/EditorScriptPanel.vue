<template>
    <div class="editor-script-panel">
        <div class="editor-script-controls">
            <span class="btn btn-primary btn-small" @click="executeScript">Run</span>
        </div>

        <div class="editor-script-editor">
            <div class="editor-script-editor-wrapper">
                <ScriptEditor
                    :value="script"
                    :schemeContainer="schemeContainer"
                    :stretchVertically="true"
                    @changed="onScriptChange"
                    />
            </div>
        </div>
    </div>
</template>


<script>
import { buildMainScopeFunctions } from '../scripting/main.js';
import { parseExpression } from '../templater/ast.js';
import { Scope } from '../templater/scope.js';
import UserEventBus from '../userevents/UserEventBus.js';
import ScriptEditor from './editor/ScriptEditor.vue';

export default {
    props: {
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object, required: true},
    },

    components: { ScriptEditor },

    data() {
        return {
            script: "",
        };
    },

    methods: {
        onScriptChange(script) {
            this.script = script;
        },

        executeScript() {
            const scope = new Scope({
                ...buildMainScopeFunctions(this.schemeContainer, new UserEventBus(this.editorId))
            });

            const ast = parseExpression(this.script);
            ast.evalNode(scope);
        }
    }
}
</script>