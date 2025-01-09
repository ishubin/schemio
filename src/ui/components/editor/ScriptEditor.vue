<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="script-editor-container">
        <div ref="scriptEditor" class="codemirror-container">
        </div>
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

const keywords = `
    local for while if else func struct
`.split(/\s+/).filter(name => name).map(name => {return {
    label: name, type: 'keyword'
}});

const functions = `
  acos
  asin
  atan
  ceil
  cos
  debugItem
  duplicate
  findChildItemByName
  findChildItemsByTag
  findItemById
  findItemByName
  findParent
  floor
  getAngle
  getEventArg
  getEventName
  getHeight
  getId
  getName
  getOpacity
  getPos
  getPosX
  getPosY
  getScaleX
  getScaleY
  getSelfOpacity
  getShape
  getTags
  getValue
  getVar
  getWidth
  getWorldPos
  hide
  ifcond
  isVisible
  List
  localPoint
  log
  log10
  log2
  logn
  Map
  matchWorld
  min
  mount
  mountChild
  mountRoot
  parseFloat
  parseInt
  PI
  pow
  remove
  removeChildItemsByTag
  rgba
  rnd
  round
  sendEvent
  setAngle
  setHeight
  setOpacity
  setPos
  setPosX
  setPosY
  setScaleX
  setScaleY
  setSelfOpacity
  setText
  setTextColor
  setTextSize
  setValue
  setVar
  setWidth
  setWorldPos
  show
  sin
  sqrt
  tag
  tan
  uid
  worldPoint
`.split(/\s+/).filter(name => name).map(name => {return {
    label: name, type: 'function', detail: ''
}});

const completions = keywords.concat(functions);

function createCompletions(externalReferenceProvider) {
    const externalReferenceCompletions = externalReferenceProvider().map(name => {
        const completion = {label: name, type: 'object', detail: 'object'};
        if (!name.match(/^[0-9a-zA-Z_]+$/)) {
            completion.apply = `"${name}"`;
        }
        return completion;
    });

    const externalReferenceCompletionsWithPrefix = externalReferenceProvider().map(name => {
        const completion = {label: '@' + name, type: 'object', detail: 'object'};
        if (!name.match(/^[0-9a-zA-Z_]+$/)) {
            completion.apply = `@"${name}"`;
        }
        return completion;
    });

    return (context) => {
        const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
        if (!nodeBefore) {
            return null;
        }
        const before = context.matchBefore(/(\w+|@)/);
        if (!before) {
            return null;
        }
        if (!context.explicit && !before) return null;

        if (nodeBefore.name === 'ExternalObjectReference') {
            if (before && before.text === '@') {
                return {
                    from: before ? before.from : context.pos,
                    options: externalReferenceCompletionsWithPrefix,
                    validFor: /^(@\w*)?$/
                };
            }
            return {
                from: before ? before.from : context.pos,
                options: externalReferenceCompletions,
                validFor: /^(@\w*)?$/
            };
        } else if (nodeBefore.name === 'VariableName') {
            return {
                from: before ? before.from : context.pos,
                options: completions,
                validFor: /^\w*$/
            };
        }

        return null;
    };
}


export default {
    props: {
        // Function the returns the list of item names in the scene
        // so that they could be presented in the autocompletion
        externalReferenceProvider: {type: Function, required: true},
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
                    "&": {height: "300px"},
                    ".cm-scroller": {overflow: "auto"},
                }),
                autocompletion({override: [ createCompletions(this.externalReferenceProvider) ]})
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