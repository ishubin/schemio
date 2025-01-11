<template>
    <div class="script-function-editor">
        <div class="label">
            Runs a script using SchemioScript language <a class="link" target="_blank" href="https://github.com/ishubin/schemio/blob/master/docs/Scripting.md">(documentation)</a>
        </div>

        <ul class="script-options">
            <li class="script-option" v-for="(option, optionIdx) in scriptTypeOptions"
                :class="{selected: optionIdx === selectedOptionIdx}"
                @click="selectScriptOption(optionIdx)"
            >
                <i class="icon" :class="option.icon"></i>
                <span class="name">{{ option.name }}</span>
                <Tooltip>{{ option.description }}</Tooltip>
            </li>
        </ul>

        <div v-if="selectedOptionIdx > 0" class="script-parameters">
            <div v-if="selectedOptionIdx === 1" class="script-parameter">
                <span>Duration</span>
                <NumberTextfield :value="args.animationDuration" @changed="emitArgChange('animationDuration', arguments[0])"/>
            </div>
            <div v-if="selectedOptionIdx === 1" class="script-parameter">
                <span>Transition</span>
                <select :value="args.transition" @input="emitArgChange('transition', arguments[0].target.value)">
                    <option v-for="transition in knownTransitions" :value="transition">{{ transition }}</option>
                </select>
            </div>
            <div class="script-parameter">
                <input id="chk-script-animation-in-background" type="checkbox" :checked="args.inBackground"
                    @input="emitArgChange('inBackground', arguments[0].target.checked)"/>
                <label for="chk-script-animation-in-background">In background</label>
                <Tooltip>Play animation in background without blocking invocation of other actions</Tooltip>
            </div>
        </div>

        <ul class="tabs tabs-file">
            <li v-for="(tab, tabIdx) in tabs" v-if="!tab.disabled">
                <span class="tab" @click="selectScriptTab(tabIdx)" :class="{active: tabIdx === selectedTabIdx}">
                    <i class="fa-solid fa-code"></i>
                    {{ tab.name }}
                    <Tooltip v-if="tab.description">{{ tab.description }}</Tooltip>
                </span>
            </li>
        </ul>
        <div class="tabs-body">
            <ScriptEditor key="script-tab-0" v-if="selectedTabIdx === 0"
                :value="args.initScript"
                :schemeContainer="schemeContainer"
                :previousScripts="[schemeContainer.scheme.scripts.main.source]"
                @changed="emitArgChange('initScript', arguments[0])"
            />
            <ScriptEditor key="script-tab-1" v-if="selectedTabIdx === 1"
                :value="args.script"
                :schemeContainer="schemeContainer"
                :previousScripts="[schemeContainer.scheme.scripts.main.source, args.initScript]"
                @changed="emitArgChange('script', arguments[0])"
            />
            <ScriptEditor key="script-tab-2" v-if="selectedTabIdx === 2"
                :value="args.endScript"
                :schemeContainer="schemeContainer"
                :previousScripts="[schemeContainer.scheme.scripts.main.source, args.initScript]"
                @changed="emitArgChange('endScript', arguments[0])"
            />
        </div>
    </div>
</template>

<script>
import ScriptEditor from '../../ScriptEditor.vue';
import Tooltip from '../../../Tooltip.vue';
import NumberTextfield from '../../../NumberTextfield.vue';

export default {
    props: {
        editorId: {type: String},
        args    : {type: Object},
        schemeContainer: { type: Object },
    },

    components: { ScriptEditor, Tooltip, NumberTextfield, Tooltip },

    data() {
        const selectedOptionIdx = this.detectScriptOptionIdx();
        return {
            knownTransitions: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'],
            tabs: [{
                name: 'Init',
                disabled: selectedOptionIdx === 0,
                description: 'Run only once before the animation starts. You can use it to set up some variables. '
                            + 'Any variables defined in this script will be accessible in the Main script',
            }, {
                name: 'Main',
                disabled: false,
                description: '',
            }, {
                name: 'On Finish',
                disabled: selectedOptionIdx === 0,
                description: 'Runs at the end of animation',
            }],

            selectedTabIdx: 1,

            scriptTypeOptions: [{
                name: 'One time',
                icon: 'fa-solid fa-person-running',
                description: 'Runs script only once'
            }, {
                name: 'Animation',
                icon: 'fa-solid fa-play',
                description: 'Script is called multiple times for the duration of the animation. '
                            + 'It has access to "t" variable (start from 0, ends at 1) '
                            + 'which represents the relative animation time'
            }, {
                name: 'Infinite Loop',
                icon: 'fa-solid fa-infinity',
                description: 'Script is executed forever until stopped from the script itself or until '
                            + 'the "Stop all animations" item function is called. '
                            + 'The script has access to "deltaTime" variable which represents time in seconds '
                            + 'between frames'
            }],

            selectedOptionIdx,
        };
    },

    methods: {
        selectScriptTab(tabIdx) {
            this.selectedTabIdx = tabIdx;
            this.$forceUpdate();
        },

        emitArgChange(argName, argValue) {
            this.$emit('argument-changed', argName, argValue);
        },

        detectScriptOptionIdx() {
            if (!this.args.animated) {
                return 0;
            }

            if (this.args.animationType === 'infinite-loop') {
                return 2;
            }

            return 1;
        },

        selectScriptOption(optionIdx) {
            this.selectedOptionIdx = optionIdx;
            if (optionIdx === 0) {
                this.emitArgChange('animated', false);
                this.tabs[0].disabled = true;
                this.tabs[2].disabled = true;
                this.selectedTabIdx = 1;
            } else if (optionIdx === 1) {
                this.tabs[0].disabled = false;
                this.tabs[2].disabled = false;
                this.emitArgChange('animated', true);
                this.emitArgChange('animationType', 'animation');
            } else if (optionIdx === 2) {
                this.tabs[0].disabled = false;
                this.tabs[2].disabled = false;
                this.emitArgChange('animated', true);
                this.emitArgChange('animationType', 'infinite-loop');
            }
        }
    }
};
</script>