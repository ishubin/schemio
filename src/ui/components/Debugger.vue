<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <modal title="Debugger" @close="$emit('close')">
        This is Schemio Debugger
        <p>
            <input type="text" class="textfield" v-model="filter" placeholder="Filter (regex)"/>
        </p>
        <div style="max-heigh: 500px; overflow: auto;">
            <table>
                <thead>
                    <tr>
                        <th>
                            Logger
                        </th>
                        <th>
                            <input type="checkbox" :checked="allLoggersEnabled" @input="toggleAllLoggers($event.target.checked)"/>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="logger in loggers">
                        <td>{{logger.name}}</td>
                        <td>
                            <input type="checkbox" :checked="logger.enabled" @input="toggleLogger(logger.name, $event.target.checked)"/>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </modal>
</template>

<script>
import {forEach} from '../collections';
import { LogConfig } from '../logger';
import Modal from './Modal.vue';

export default {
    components: {Modal},

    data() {
        const loggers = [];
        let allLoggersEnabled = true;
        forEach(LogConfig.loggers, (settings, name) => {
            if (!settings.enabled) {
                allLoggersEnabled = false;
            }

            loggers.push({
                name: name,
                enabled: settings.enabled,
                color: settings.background
            });
        });
        return {
            loggers,
            allLoggersEnabled,
            filter: LogConfig.filterRegex || ''
        };
    },
    methods: {
        toggleLogger(name, enabled) {
            if (enabled) {
                LogConfig.enable(name);
            } else {
                LogConfig.disable(name);
            }
        },
        toggleAllLoggers(enabled) {
            forEach(this.loggers, logger => {
                logger.enabled = enabled;
                this.toggleLogger(logger.name, enabled);
            });
        }
    },
    watch: {
        filter(newFilter) {
            LogConfig.filter(newFilter);
        }
    }
}
</script>