<template>
    <div class="editor-script-panel">
        <div ref="scriptPane" class="editor-script-editor">
            <div class="editor-script-filler"></div>
            <div class="editor-script-output">
                <div class="output-row" v-for="entry in schemeContainer.outputHistory" :class="[entry.type]">
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
                    :autoFocus="true"
                    @changed="onScriptChange"
                    @execute="executeScript"
                    />
            </div>
        </div>
    </div>
</template>


<script>
import ScriptEditor from './editor/ScriptEditor.vue';
import { executeEditorScript } from './editor/scripting/editorScript.js';

const functionCompletions = [
];

export default {
    props: {
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object, required: true},
    },

    components: { ScriptEditor },

    beforeMount() {
    },

    beforeDestroy() {
    },

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

        executeScript(script) {
            executeEditorScript(this.editorId, this.schemeContainer, script);
            this.$nextTick(() => {
                const scriptPane = this.$refs.scriptPane;
                scriptPane.scrollTop = scriptPane.scrollHeight;
            });
        }
    }
}
</script>