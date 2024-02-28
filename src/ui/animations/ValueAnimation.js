/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import Animation from './Animation';

export const Interpolations = {
    LINEAR     : 'linear',
    STEP       : 'step',
    SMOOTH     : 'smooth',        // ease in and out
    EASE_IN    : 'ease-in',
    EASE_OUT   : 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
    BOUNCE     : 'bounce',

    values() {
        return [this.LINEAR, this.STEP, this.SMOOTH, this.EASE_IN, this.EASE_OUT, this.EASE_IN_OUT, this.BOUNCE];
    }
};


/**
 * This fuction converts t according to movement type. This is needed in order to get smooth animation or any other effect.
 * @param {Float} t - time of animation in ratio to animation length (from 0.0 to 1.0)
 * @param {String} type - type of animation (e.g. "linear", "ease-in" etc.)
 */
export function convertTime(t, type) {
    if (type === Interpolations.SMOOTH) {
        return Math.sin(t*Math.PI/2.0);
    } else if (type === Interpolations.EASE_IN) {
        return t*t;
    } else if (type === Interpolations.EASE_OUT) {
        return 1 - (t-1)*(t-1);
    } else if (type === Interpolations.EASE_IN_OUT) {
        return 0.5 - Math.cos(t * Math.PI) / 2;
    } else if (type === 'bounce') {
        return 1 - Math.pow(3, -10 * t) * Math.cos(10 * Math.PI *t);
    }
    return t;
}

export default class ValueAnimation extends Animation {
    /**
     * @param {ValueAnimationSettings} settings
     */
    constructor(settings) {
        super();
        this.updateCallback = null;
        this.durationMillis = 1000;
        this.elapsedTime = 0;
        this.initCallback = null;
        this.destroyCallback = null;
        this.animationType = 'ease-out';
        if (settings) {
            if (settings.durationMillis) {
                this.durationMillis = settings.durationMillis;
            }
            if (settings.update) {
                this.updateCallback = settings.update;
            }
            if (settings.init) {
                this.initCallback = settings.init;
            }
            if (settings.destroy) {
                this.destroyCallback = settings.destroy;
            }
            if (settings.animationType) {
                this.animationType = settings.animationType;
            }
        }
    }

    init() {
        if (!this.updateCallback) {
            return false;
        }
        if (this.initCallback) {
            this.initCallback();
        }
        return true;
    }

    play(dt) {
        this.elapsedTime += dt;
        if (this.elapsedTime >= this.durationMillis) {
            try {
                this.updateCallback(1.0);
            } catch(err) {
                console.error(err);
            }
            return false;
        }

        const t = this.elapsedTime / this.durationMillis;

        try {
            this.updateCallback(convertTime(t, this.animationType));
        } catch(err) {
            console.error(err);
            return false;
        }
        return true;
    }

    destroy() {
        if (this.destroyCallback) {
            this.destroyCallback();
        }
    }

}