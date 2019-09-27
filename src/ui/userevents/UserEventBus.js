import _ from 'lodash';

export default class UserEventBus {
    constructor() {
        this.itemEventSubscribers = {};
    }

    subscribeItemEvent(itemId, eventName, args, callback) {
        if (!this.itemEventSubscribers.hasOwnProperty(itemId)) {
            this.itemEventSubscribers[itemId] = {};
        }

        if (!this.itemEventSubscribers[itemId].hasOwnProperty(eventName)) {
            this.itemEventSubscribers[itemId][eventName] = [];
        }

        this.itemEventSubscribers[itemId][eventName].push({args, callback});
    }


    /**
     * Emits event that originated for a specific item
     * @param {string} itemId 
     * @param {string} eventName 
     * @param {Array} args arguments of the event
     */
    emitItemEvent(itemId, eventName, args) {
        if (args === undefined) {
            args = [];
        }

        const itemSubs = this.itemEventSubscribers[itemId];
        if (itemSubs && itemSubs[eventName]) {
            _.forEach(itemSubs[eventName], subscriber => {
                
                if (this.matchesArgs(args, subscriber.args)) {
                    subscriber.callback.apply(null, args);
                }
            })
        }
    }

    clear() {
        this.itemEventSubscribers = {}
    }


    matchesArgs(eventArgs, subscriberArgs) {
        for (let i = 0; i < subscriberArgs.length; i++) {
            if (subscriberArgs[i]) {
                if (i < eventArgs.length) {
                    if (!this.argumentMatches(subscriberArgs[i], eventArgs[i])) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 
     * @param {string} argPattern 
     * @param {string} realValue 
     */
    argumentMatches(argPattern, realValue) {
        if (!argPattern) {
            //when it is empty we don't care
            return true;
        }

        if (argPattern.charAt(0) === '=')  {
            return argPattern.substr(1) == realValue;
        } else {
            return argPattern == realValue;
        }
    }
};
