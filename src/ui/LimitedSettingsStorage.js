import forEach from 'lodash/forEach';
import { hasUISettingsConsent } from './privacy';

export default class LimitedSettingsStorage {

    /**
     * 
     * @param {Storage} localStorage 
     * @param {String} name 
     * @param {Number} limit Amount of objects to be stored in settings storage
     */
    constructor(localStorage, name, limit) {
        this.storage = localStorage;
        this.name = name;
        this.limit = limit;
        this.items = {};
        this.amountOfElements = 0;
        this.revision = 0;

        this.loadFromSettingsStorage();
    }

    _saveItem(itemName, obj) {
        this.storage.setItem(itemName, JSON.stringify(obj));
    }

    _getItem(name, defaultValue) {
        const encodedJson = this.storage.getItem(name);
        if (encodedJson) {
            return JSON.parse(encodedJson);
        } else {
            return defaultValue;
        }
    }

    loadFromSettingsStorage() {
        const that = this._getItem(`LSS-${this.name}`);
        if (that && that.items && that.amountOfElements && that.revision) {
            this.items = that.items;
            this.amountOfElements = that.amountOfElements;
            this.revision = that.revision;
        }
    }

    saveToSettingsStorage() {
        this._saveItem(`LSS-${this.name}`, {
            items: this.items,
            amountOfElements: this.amountOfElements,
            revision: this.revision
        });
    }

    save(id, value) {
        if (this.items.hasOwnProperty(id)) {
            this.makeMostRecent(this.items[id]);
            this.items[id].v = value;
            this.saveToSettingsStorage();
            return;
        } else if (this.amountOfElements >= this.limit) {
            this.evict();
        }

        this.items[id] = {
            r: this.getNewRevision(),
            v: value
        };
        this.amountOfElements += 1;
        this.saveToSettingsStorage();
    }

    get(id, defualtValue) {
        const item = this.items[id];
        if (item) {
            return item.v;
        } 
        return defualtValue;
    }

    makeMostRecent(item) {
        item.r = this.getNewRevision();
    }

    evict() {LimitedSett
        forEach(this.items, (item, key) => {
            if (!oldestKey || oldestRevision > item.r) {
                oldestKey = key;
                oldestRevision = item.r;
            }
        });

        if (oldestKey) {
            delete this.items[oldestKey];
            this.amountOfElements -= 1;
        }
    }

    getElementsCount() {
        return this.amountOfElements;
    }

    getNewRevision() {
        this.revision += 1;
        return this.revision;
    }
}


const schemioLocalStorage = {
    getItem(key) {
        if (hasUISettingsConsent()) {
            return window.localStorage.getItem(key);
        }
        return null;
    },

    setItem(key, value) {
        if (hasUISettingsConsent()) {
            window.localStorage.setItem(key, value);
        }
    }
}

export function createSettingStorageFromLocalStorage(name, limit) {
    return new LimitedSettingsStorage(schemioLocalStorage, name, limit);
}
