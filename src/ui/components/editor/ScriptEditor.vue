<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="script-editor-container" :class="{'script-editor-enlarged': enlarged}">
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
import { parseExpression } from "../../templater/ast";
import { ASTAssign, ASTFunctionDeclaration, ASTLocalVariable, ASTMultiExpression, ASTVarRef } from "../../templater/nodes";
import { ASTStructNode } from "../../templater/struct";


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
    local for while if else func struct this
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


function extractCompletionsFromScript(script) {
    if (!script) {
        return [];
    }
    const completions = [];
    const visitNode = (node) => {
        if (node instanceof ASTAssign) {
            if (node.a instanceof ASTVarRef) {
                completions.push({
                    label: node.a.varName, type: (node.b instanceof ASTFunctionDeclaration) ? 'function' : 'variable'
                });
            }
        } else if (node instanceof ASTLocalVariable) {
            completions.push({
                label: node.varName, type: 'variable'
            });
        } else if (node instanceof ASTStructNode) {
            completions.push({
                label: node.name, type: 'function', detail: 'struct'
            })
        }
    };
    try {
        const ast = parseExpression(script);
        if (ast instanceof ASTMultiExpression) {
            ast.nodes.forEach(visitNode);
        } else {
            visitNode(ast);
        }
    } catch(err) {
    }
    return completions;
}

/**
 * @param {Object} schemeContainer
 * @param {Array<String>} previousScripts
 */
function createCompletions(schemeContainer, previousScripts) {
    let completions = keywords.concat(functions);

    previousScripts.forEach(script => {
        completions = completions.concat(extractCompletionsFromScript(script));
    });

    const itemNames = schemeContainer.getItemNames();
    const externalReferenceCompletions = itemNames.map(name => {
        const completion = {label: name, type: 'object', detail: 'object'};
        if (!name.match(/^[0-9a-zA-Z_]+$/)) {
            completion.apply = `"${name}"`;
        }
        return completion;
    });

    const externalReferenceCompletionsWithPrefix = itemNames.map(name => {
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