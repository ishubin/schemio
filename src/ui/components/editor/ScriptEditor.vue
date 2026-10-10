<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="script-editor-container" :class="{'script-editor-enlarged': enlarged}" :style="{height: enlarged ? '100%' : actualHeight}">
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
import {clouds} from 'thememirror';
import {autocompletion} from "@codemirror/autocomplete";
import {syntaxTree, indentUnit} from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { createCompletions, draculaTheme } from "./Scripts";
import { createSettingStorageFromLocalStorage } from "../../LimitedSettingsStorage";


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

const historyStorage = createSettingStorageFromLocalStorage('editor-script-history', 1);
const SCRIPT_HISTORY = 'scriptHistory';
const MAX_SCRIPT_HISTORY_SIZE = 100;

function getScriptHistory() {
    return historyStorage.get(SCRIPT_HISTORY, []);
}

function saveScriptHistory(history) {
    if (!Array.isArray(history)) {
        return;
    }
    const historyCopy = [].concat(history);

    if (historyCopy.length > MAX_SCRIPT_HISTORY_SIZE) {
        historyCopy.splice(0, historyCopy.length - MAX_SCRIPT_HISTORY_SIZE);
    }
    historyStorage.save(SCRIPT_HISTORY, historyCopy);
}

export default {
    props: {
        schemeContainer: {type: Object, required: true},
        previousScripts: {type: Array, default: () => []},
        /* Array of field descriptors (see FieldDescriptor in typedef.js) */
        scopeArgs: {type: Array, default: () => []},
        value: {type: String, default: ''},
        height: {type: Number, default: 400},
        stretchVertically: {type: Boolean, default: false},
        functionCompletions: {type: Array, default: () => []},
        consoleMode: {type: Boolean, default: false},
    },

    data() {
        return {
            enlarged: false,
            script: this.value,
            consoleHistory: getScriptHistory(),
            historyIndex: -1,
            currentCommand: '',
        };
    },

    created() {
        const editorTheme = new Compartment();
        let themeId = document.body.getAttribute('data-theme');
        let theme = themeId === 'dark' ? draculaTheme : clouds;

        this.editorState = EditorState.create({
            doc: this.script,
            extensions: [
                EditorState.tabSize.of(4),
                indentUnit.of('\t'),
                this.createConsoleKeymap(),
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
                        createCompletions(this.schemeContainer, this.previousScripts, this.scopeArgs, this.functionCompletions)
                    ]
                }),
            ]
        });
        this.editor = null;

        this.themeObserver = new MutationObserver(() => {
            const newThemeId = document.body.getAttribute('data-theme');
            const theme = newThemeId === 'dark' ? draculaTheme : clouds;
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
        createConsoleKeymap() {
            if (!this.consoleMode) {
                return keymap.of([]);
            }
            return keymap.of([ {
                key: "Enter",
                run: (view) => {
                    const content = view.state.doc.toString();
                    if (content.trim()) {
                        this.$emit('execute', content);
                        this.consoleHistory.push(content);
                        this.historyIndex = -1;
                        this.currentCommand = '';
                    }
                    view.dispatch({
                        changes: {from: 0, to: view.state.doc.length, insert: ''}
                    });
                    return true;
                }
            }, {
                key: "Mod-Enter",
                run: (view) => {
                    const cursorPos = view.state.selection.main.from;
                    view.dispatch({
                        changes: {from: cursorPos, to: cursorPos, insert: '\n'}
                    });
                    return true;
                }
            }, {
                key: "ArrowUp",
                run: (view) => {
                    const lineNum = view.state.doc.lineAt(view.state.selection.main.from).number;
                    if (lineNum === 1 && this.consoleHistory.length > 0) {
                        if (this.historyIndex < 0) {
                            this.currentCommand = view.state.doc.toString();
                            this.historyIndex = this.consoleHistory.length - 1;
                        } else if (this.historyIndex > 0) {
                            this.historyIndex--;
                        }
                        view.dispatch({
                            changes: {
                                from: 0,
                                to: view.state.doc.length,
                                insert: this.consoleHistory[this.historyIndex]
                            }
                        });
                        return true;
                    }
                    return false;
                }
            }, {
                key: "ArrowDown",
                run: (view) => {
                    const lineNum = view.state.doc.lineAt(view.state.selection.main.from).number;
                    const totalLines = view.state.doc.lines;
                    if (lineNum === totalLines) {
                        if (this.historyIndex >= 0) {
                            if (this.historyIndex < this.consoleHistory.length - 1) {
                                this.historyIndex++;
                                view.dispatch({
                                    changes: {
                                        from: 0,
                                        to: view.state.doc.length,
                                        insert: this.consoleHistory[this.historyIndex]
                                    }
                                });
                            } else {
                                this.historyIndex = -1;
                                view.dispatch({
                                    changes: {
                                        from: 0,
                                        to: view.state.doc.length,
                                        insert: this.currentCommand
                                    }
                                });
                            }
                            return true;
                        }
                    }
                    return false;
                }
            }
            ]);
        }
    },

    watch: {
        value(value) {
            this.script = value;
        },

        consoleHistory(history) {
            saveScriptHistory(history);
        }
    },

    computed: {
        actualHeight() {
            if (this.stretchVertically) {
                return '100%';
            }
            return `${this.autoHeight}px`;
        }
    }
}
</script>