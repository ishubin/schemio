<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="script-editor-container">
        <textarea ref="textarea" class="script-editor"
            v-model="script"
            @input="$emit('changed', arguments[0].target.value)"
            @keydown="onTextareaKeydown"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
        ></textarea>
        <span class="text-editor-enlarge" @click="enlarged = true"><i class="fas fa-expand"></i></span>


        <div class="textarea-enlarged-container" v-if="enlarged">
            <div class="rich-text-editor-menubar">
                <span class="btn btn-secondary action-close" @click="enlarged = false">Close</span>
            </div>
            <div class="editor-frame">
                <textarea class="script-editor" v-model="script" @input="$emit('changed', arguments[0].target.value)"></textarea>
            </div>
        </div>
    </div>
</template>

<script>

/**
 *
 * @param {HTMLTextAreaElement} textarea
 */
function insertTabCharacter(textarea) {
    const {value, selectionEnd} = textarea;

    // Insert tab character
    textarea.value = `${value.substring(0, selectionEnd)}\t${value.substring(selectionEnd)}`;

    // Move cursor to new position
    textarea.selectionStart = textarea.selectionEnd = selectionEnd + 1;
}

/**
 *
 * @param {HTMLTextAreaElement} textarea
 */
function indentSelectedLines(textarea) {
    const { value, selectionStart, selectionEnd } = textarea;

    const linesBeforeCaret = value.substring(0, selectionStart).split('\n');
    const startLine = linesBeforeCaret.length - 1;
    const endLine = value.substring(0, selectionEnd).split('\n').length - 1;

    const newValue = value.split('\n').map((line, i) => (startLine <= i && i <= endLine) ? `\t${line}` : line).join('\n');

    textarea.value = newValue;

    const startLineText = linesBeforeCaret[startLine];
    textarea.selectionStart = startLineText && /\S/.test(startLineText) ? selectionStart + 1 : selectionStart;
    textarea.selectionEnd = selectionEnd + (endLine - startLine + 1);
};


function removeIndentation(textarea) {
    const { value, selectionStart, selectionEnd } = textarea;

    const linesBeforeCaret = value.substring(0, selectionStart).split('\n');
    const startLine = linesBeforeCaret.length - 1;
    const endLine = value.substring(0, selectionEnd).split('\n').length - 1;
    const newValue = value
        .split('\n')
        .map((line, i) => i >= startLine && i <= endLine && line.startsWith('\t') ? line.substring(1) : line)
        .join('\n');
    textarea.value = newValue;

    const startLineText = linesBeforeCaret[startLine];
    textarea.selectionStart = startLineText?.startsWith('\t')
                            ? selectionStart - 1
                            : selectionStart;
    textarea.selectionEnd = selectionEnd - (value.length - newValue.length);
}

/**
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {*} event
 */
function onTextareaKeydown(textarea, event) {
    if (event.key == 'Tab') {
        event.preventDefault();
        const {selectionStart, selectionEnd} = textarea;

        if (event.shiftKey) {
            removeIndentation(textarea);
        } else if (selectionStart === selectionEnd) {
            insertTabCharacter(textarea);
        } else {
            indentSelectedLines(textarea);
        }
    }
}

export default {
    props: {
        value: {type: String, default: ''}
    },

    data() {
        return {
            enlarged: false,
            script: this.value,
        };
    },

    methods: {
        onTextareaKeydown(event) {
            onTextareaKeydown(this.$refs.textarea, event);
        }
    },

    watch: {
        value(value) {
            this.script = value;
        }
    }
}
</script>