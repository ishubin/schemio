<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="context-menu" oncontextmenu="return false;" :style="{'max-height': `${maxHeight}px`}">
        <ul ref="rootContextMenu" :style="{'top': `${y}px`, 'left': `${x}px`, 'max-height': `${maxHeight}px`, 'overflow': 'auto'}">
            <li v-for="(option, optionIndex) in options"
                @click="onOptionSelected(option)"
                @mouseover="onOptionMouseOver(option, $event)"
                class="context-menu-option"
                >
                <span class="context-menu-suboptions-icon">
                    <i v-if="option.subOptions" class="fas fa-caret-right"/>
                </span>

                <i v-if="option.iconClass" :class="option.iconClass"/>
                <span class="context-menu-option-name">{{option.name}}</span>
            </li>
        </ul>

        <ul v-if="subOptionMenu.shown" ref="subOptionMenu"
            :style="{'top': `${subOptionMenu.y}px`, 'left': `${subOptionMenu.x}px`, 'max-height': `${maxHeight}px`, 'overflow': 'auto'}">
            <li v-for="subOption in subOptionMenu.options" @click="onOptionSelected(subOption)">
                <i v-if="subOption.iconClass" :class="subOption.iconClass"/>
                <span class="context-menu-option-name">{{subOption.name}}</span>
            </li>
        </ul>
    </div>
</template>

<script>
import shortid from 'shortid';
import utils from '../../utils';

export default {
    props: ['mouseX', 'mouseY', 'options'],

    mounted() {
        document.body.addEventListener('mousedown', this.onDocumentClick);
        document.body.addEventListener('touchmove', this.onDocumentClick);
        document.body.addEventListener('touchstart', this.onDocumentClick);

        const rect = this.$refs.rootContextMenu.getBoundingClientRect();
        const overlapX = rect.right - window.innerWidth;
        const overlapY = rect.bottom - window.innerHeight;

        this.menuWidth = rect.width;
        this.menuHeight = rect.height;

        if (overlapX > 0) {
            this.x -= overlapX;
        }
        if (overlapY > 0) {
            this.y -= overlapY;
        }
    },

    beforeDestroy() {
        document.body.removeEventListener('mousedown', this.onDocumentClick);
        document.body.removeEventListener('touchmove', this.onDocumentClick);
        document.body.removeEventListener('touchstart', this.onDocumentClick);
    },

    data() {
        return {
            domId: shortid.generate(),
            x: this.mouseX,
            y: this.mouseY,
            menuWidth: 100,
            menuHeight: 100,
            maxHeight: window.innerHeight - 30,
            mountTime: new Date().getTime(),

            subOptionMenu: {
                shown: false,
                x: 0,
                y: 0,
                options: []
            }
        }
    },

    methods: {
        onOptionMouseOver(option, event) {
            if (option.subOptions) {
                const li = event.target.closest('li.context-menu-option');
                if (!li) {
                    return;
                }
                const liRect = li.getBoundingClientRect();
                this.subOptionMenu.x = liRect.right;
                this.subOptionMenu.y = liRect.top;
                this.subOptionMenu.options = option.subOptions;
                this.subOptionMenu.shown = true;
                this.$nextTick(() => {
                    if (!this.$refs.subOptionMenu) {
                        return;
                    }
                    const rect = this.$refs.subOptionMenu.getBoundingClientRect();
                    if (rect.bottom > window.innerHeight) {
                        this.subOptionMenu.y = window.innerHeight - rect.height;
                    }
                    if (rect.right > window.innerWidth) {
                        this.subOptionMenu.x = window.innerWidth - rect.width;
                    }
                });
            }
        },

        onDocumentClick(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.classList.contains('context-menu'))) {
                if (new Date().getTime() - this.mountTime > 500) {
                    setTimeout(() => {
                        this.$emit('close');
                    }, 100);
                }
            }
        },

        onOptionSelected(option) {
            if (!option.subOptions) {
                this.$emit('selected', option);
                this.$emit('close');
            }
        },

        subOptionsStyle(parentIndex, subOptions) {
            const style = {
                left: `${this.menuWidth - 4}px`,
                'min-width': `${this.menuWidth}px`
            };

            // calculcating approximate single option height
            // so that we can estimate the total height of the sub options menu
            const optionHeight = this.menuHeight / this.options.length;

            const subOptionsHeight = subOptions.length * optionHeight;
            const subOptionsX = this.x + this.menuWidth;
            const subOptionsY = parentIndex * optionHeight + this.y;
            
            const overlapX = subOptionsX + this.menuWidth - window.innerWidth;
            const overlapY = subOptionsY + subOptionsHeight - window.innerHeight;
            if (overlapY > 0) {
                style['top'] = `${-overlapY}px`;
            }

            if (overlapX > 0) {
                style['left'] = `${-this.menuWidth + 4}px`;
            }

            return style;
        }
    }

}
</script>