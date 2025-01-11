<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="script-editor-container" :class="{'script-editor-enlarged': enlarged}" :style="{height: enlarged ? '100%' : `${height}px`}">
        <div ref="scriptEditor" class="codemirror-container">
        </div>
        <span class="text-editor-enlarge" @click="enlarged = !enlarged">
            <i v-if="enlarged" class="fa-solid fa-compress"></i>
            <i v-else class="fas fa-expand"></i>
        </span>
    </div>
</template>

<script>
import {basicSetup} from "codemirror";
import {EditorState, Compartment} from "@codemirror/state";
import {EditorView, keymap} from "@codemirror/view";
import {SchemioScript } from "codemirror-lang-schemioscript";
import {defaultKeymap, indentWithTab} from "@codemirror/commands";
import {dracula, clouds} from 'thememirror';
import {autocompletion} from "@codemirror/autocomplete";
import {syntaxTree, indentUnit} from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { createCompletions } from "./Scripts";


function basicLinter(view) {
    let diagnostics = [];
    syntaxTree(view.state).cursor().iterate(node => {
        if (node.type.isError) {
            diagnostics.push({
                from: node.from,
                to: node.to,
                severity: "error",
                message: null
            });
        }
    })
    return diagnostics;
}



export default {
    props: {
        schemeContainer: {type: Object, required: true},
        previousScripts: {type: Array, default: []},
        value: {type: String, default: ''},
        height: {type: Number, default: 400}
    },

    data() {
        return {
            enlarged: false,
            script: this.value,
        };
    },

    created() {
        const editorTheme = new Compartment();
        let themeId = document.body.getAttribute('data-theme');
        let theme = themeId === 'dark' ? dracula : clouds;
        this.editorState = EditorState.create({
            doc: this.script,
            extensions: [
                EditorState.tabSize.of(4),
                indentUnit.of('\t'),
                keymap.of(defaultKeymap),
                keymap.of(indentWithTab),
                basicSetup,
                SchemioScript(),
                linter(basicLinter),
                editorTheme.of(theme),
                EditorView.updateListener.of((v)=> {
                    if(v.docChanged) {
                        this.$emit('changed', this.editor.state.doc.toString())
                    }
                }),
                EditorView.theme({
                    "&": {height: "100%"},
                    ".cm-scroller": {overflow: "auto"},
                }),
                autocompletion({
                    override: [
                        createCompletions(this.schemeContainer, this.previousScripts)
                    ]
                })
            ]
        });
        this.editor = null;

        this.themeObserver = new MutationObserver(() => {
            const newThemeId = document.body.getAttribute('data-theme');
            const theme = newThemeId === 'dark' ? dracula : clouds;
            if (this.editor) {
                this.editor.dispatch({
                    effects: editorTheme.reconfigure(theme)
                });
            }
        });
        this.themeObserver.observe(document.body, {
            attributeFilter: ['data-theme'],
            attributeOldValue: true,
            subtree: false,
            childList: false,
        });
    },

    beforeDestroy() {
        this.themeObserver.disconnect();
    },

    mounted() {
        this.editor = new EditorView({
            state: this.editorState,
            parent: this.$refs.scriptEditor,
        });
        this.editor.setTabFocusMode(false);
    },

    methods: {
    },

    watch: {
        value(value) {
            this.script = value;
        }
    }
}
</script>