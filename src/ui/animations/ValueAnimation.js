import Animation from './Animation';

export default class ValueAnimation extends Animation {
    constructor(settings) {
        super();
        this.updateCallback = null;
        this.durationMillis = 1000;
        this.elapsedTime = 0;
        if (settings) {
            if (settings.durationMillis) {
                this.durationMillis = settings.durationMillis;
            }
            if (settings.update) {
                this.updateCallback = settings.update;
            }
        }
    }

    init() {
        if (!this.updateCallback) {
            return false;
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

        // trying to make a smooth animation using sine function
        this.updateCallback(Math.sin(t * Math.PI / 2.0));
        return true;
    }

}