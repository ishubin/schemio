import Animation from './Animation';

export default class ValueAnimation extends Animation {
    constructor(settings) {
        super();
        this.updateCallback = null;
        this.durationMillis = 1000;
        this.elapsedTime = 0;
        this.initCallback = null;
        this.destroyCallback = null;
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

        this.updateCallback(1 - (t-1)*(t-1));
        return true;
    }

}