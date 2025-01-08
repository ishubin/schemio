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
import { oneDark } from '@codemirror/theme-one-dark';
import {autocompletion} from "@codemirror/autocomplete";
import {syntaxTree} from "@codemirror/language";


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

function myCompletions(context) {
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

    } else if (nodeBefore.name === 'VariableName') {
        return {
            from: before ? before.from : context.pos,
            options: completions,
            validFor: /^\w*$/
        };
    }

    // ExternalObjectReference
    // VariableName

    // if (nodeBefore) {
    //     console.log('nodeBefore', nodeBefore.name, nodeBefore);
    // }
    // console.log('before', before);

    return null;
}


export default {
    props: {
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
        let theme = themeId === 'dark' ? oneDark : [];
        this.editorState = EditorState.create({
            doc: this.script,
            extensions: [
                keymap.of(defaultKeymap),
                keymap.of(indentWithTab),
                basicSetup,
                SchemioScript(),
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
                autocompletion({override: [myCompletions]})
            ]
        });
        this.editor = null;

        this.themeObserver = new MutationObserver(() => {
            const newThemeId = document.body.getAttribute('data-theme');
            const theme = newThemeId === 'dark' ? oneDark : [];
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