/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { forEach } from "./collections";

function strhash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash  = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

function currentTimeToString() {
    const date = new Date();
    return date.toLocaleTimeString() + '.' + date.getMilliseconds()
}


const LogConfig = {
    loggers: {},
    filterRegex: null,

    registerLogger(name) {
        const hue = Math.abs(strhash(name)) % 360;
        let enabled = false;
        // checking if it was already configured or loaded from local storage
        if (this.loggers.hasOwnProperty(name)) {
            enabled = this.loggers[name].enabled;
        }

        this.loggers[name] = {
            enabled: enabled,
            background: `hsl(${hue}, 75%, 35%)`
        }
    },

    showLoggers() {
        console.log(
            '%cSchemio Log Config!',
            'color: white; display: inline-block; padding: 5px 10px; background: #00aaff; font-family: Helvetica; font-size: 20px; font-weight: bold'
        );
        forEach(this.loggers, (settings, name) => {
            console.log(name);
        });
    },

    enable(name) {
        if (!this.loggers[name]) {
            console.error('Unknown logger: ' + name);
        }
        this.loggers[name].enabled = true;
        saveConfigToLocalStorage();
    },

    disable(name) {
        if (!this.loggers[name]) {
            console.error('Unknown logger: ' + name);
        }
        this.loggers[name].enabled = false;
        saveConfigToLocalStorage();
    },

    filter(filterRegex) {
        if (filterRegex) {
            this.filterRegex =  new RegExp(filterRegex);
        } else {
            this.filterRegex = null;
        }
        saveConfigToLocalStorage();
    }
};


function passesFilter(filterRegex, args) {
    if (filterRegex) {
        let fullArgsText = '';
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (typeof arg === 'string') {
                fullArgsText = fullArgsText + ' ' + arg;
            }
        }
        return filterRegex.test(fullArgsText);
    }
    return true;
}

class Logger {
    constructor(name) {
        this.name = name;
        this.timers = {};
        LogConfig.registerLogger(name);
    }

    info(...args) {
        const settings = LogConfig.loggers[this.name];
        if (settings && settings.enabled) {
            if (passesFilter(LogConfig.filterRegex, args)) {
                const time = currentTimeToString();
                console.log.apply(console,  [`${time} %c${this.name}`, `display: inline-block; font-weight: bold; background: ${settings.background}; text-shadow: 0 0 4px rgba(0, 0, 0, 0.5); padding: 2px 5px; border-radius: 2px; color: white`, ...args]);
            }
        }
    }

    time(timerName) {
        this.timers[timerName] = performance.now();
    }

    timeEnd(timerName) {
        const settings = LogConfig.loggers[this.name];
        if (!settings || !settings.enabled) {
            return;
        }
        if (this.timers[timerName]) {
            if (passesFilter(LogConfig.filterRegex, `${this.name} ${timerName}`)) {
                const timeTaken = performance.now() - this.timers[timerName];
                const time = currentTimeToString();
                console.log.apply(console,  [
                    `${time} %c${this.name}%c Timer: %c${timerName}%c took ${timeTaken} ms`,
                    `display: inline-block; font-weight: bold; background: ${settings.background}; text-shadow: 0 0 4px rgba(0, 0, 0, 0.5); padding: 2px 5px; border-radius: 2px; color: white`,
                    '',
                    `display: inline-block; font-weight: bold; background: hsl(142, 45%, 30%); padding: 2px 5px; border-radius: 2px; color: white`,
                    ''
                ]);
            }
        } else {
            console.error(`Could not measure time in ${this.name}. Missing timer ${timerName} initialisation`);
        }
    }

    // used by event bus
    infoEvent(eventName, args) {
        const settings = LogConfig.loggers[this.name];
        if (settings && settings.enabled) {
            if (passesFilter(LogConfig.filterRegex, args)) {
                const hue = Math.abs(strhash(eventName)) % 360;

                const time = currentTimeToString();
                console.log.apply(console,  [
                    `${time} %c${this.name} %c${eventName}`,
                    `display: inline-block; font-weight: bold; background: ${settings.background}; text-shadow: 0 0 4px rgba(0, 0, 0, 0.5) padding: 2px 5px; padding: 2px 5px; border-radius: 2px; color: white; margin-right: 10px`,
                    `display: inline-block; font-weight: bold; background: hsl(${hue}, 70%, 30%); padding: 2px 5px; border-radius: 2px; color: white;`,
                    ...args
                ]);
            }
        }
    }
};


const Debugger = {
    objects: [],

    register(typeName, obj) {
        this.objects.push({
            type: typeName, obj: obj
        });
    }
}

const SCHEMIO_LOG_CONFIG = 'SchemioLogConfig';
function loadConfigFromLocalStorage() {
    if (!window || !window.localStorage) {
        return;
    }
    const configText = window.localStorage.getItem(SCHEMIO_LOG_CONFIG);
    if (!configText) {
        return;
    }
    try {
        const config = JSON.parse(configText);
        if (!config.loggers) {
            return;
        }
        forEach(config.loggers, (settings, name) => {
            LogConfig.loggers[name] = {
                enabled: settings.enabled || false
            };
        });
    } catch (e) {
    }
}

function saveConfigToLocalStorage() {
    if (typeof window !== 'undefined' || !window.localStorage) {
        return;
    }
    window.localStorage.setItem(SCHEMIO_LOG_CONFIG, JSON.stringify(LogConfig));
}

loadConfigFromLocalStorage();

let debuggerInitiationCallback = null;
if (typeof window !== 'undefined') {
    window.SchemioDebugger = Debugger;

    window.SchemioLogConfig = () => {
        if (debuggerInitiationCallback) {
            debuggerInitiationCallback();
        }
    };
}


function registerDebuggerInitiation(callback) {
    debuggerInitiationCallback = callback;
}

const logEntries = [];

const MobileDebugger = {
    log(...args) {
        this.write('info', args);
    },

    error(...args) {
        this.write('error', args);
    },

    write(level, ...args) {
        if (logEntries.length > 1000) {
            logEntries.shift();
        }

        let text = '';
        args.forEach((arg, i) => {
            const prefix = i === 0 ? '': ' ';
            text += prefix + arg;
        });
        logEntries.push({ level, text });
    },

    getLogEntries() {
        return logEntries;
    }
};

export {LogConfig, Logger, MobileDebugger, Debugger, registerDebuggerInitiation};