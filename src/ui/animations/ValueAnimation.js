import Animation from './Animation';



function convertTime(t, type) {
    if (type === 'smooth') {
        return Math.sin(t*Math.PI/2.0);
    } else if (type === 'ease-in') {
        return t*t;
    } else if (type === 'ease-out') {
        return 1 - (t-1)*(t-1);
    } else if (type === 'ease-in-out') {
        return 0.5 - Math.cos(t * Math.PI) / 2;
    } else if (type === 'bounce') {
        return 1 - Math.pow(3, -10 * t) * Math.cos(10 * Math.PI *t);
    }
    return t;
}

export default class ValueAnimation extends Animation {
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
            this.updateCallback(1.0);
            return false;
        }

        const t = this.elapsedTime / this.durationMillis;

        this.updateCallback(convertTime(t));
        return true;
    }

    destroy() {
        if (this.destroyCallback) {
            this.destroyCallback();
        }
    }

}