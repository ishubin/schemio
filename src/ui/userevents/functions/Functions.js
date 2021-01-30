import SetFunction from './SetFunction';
import HideFunction from './HideFunction';
import ShowFunction from './ShowFunction';
import SendEventFunction from './SendEventFunction';
import ZoomToItFunction from './ZoomToItFunction';
import CrawlEffectFunction from './CrawlEffectFunction';
import StopAllAnimationsFunction from './StopAllAnimationsFunction';
import ItemParticleEffectFunction from './ItemParticleEffectFunction';
import BlinkEffectFunction from './BlinkEffectFunction';
import ItemMoveFunction from './ItemMoveFunction';
import WaitFunction from './WaitFunction';
import ToggleFunction from './ToggleFunction';
import UntoggleFunction from './UntoggleFunction';

export default {
    main: {
        hide:               HideFunction,
        show:               ShowFunction,
        set:                SetFunction,
        zoomToIt:           ZoomToItFunction,
        particleEffect:     ItemParticleEffectFunction,
        crawlEffect:        CrawlEffectFunction,
        blinkEffect:        BlinkEffectFunction,
        move:               ItemMoveFunction,
        stopAllAnimations:  StopAllAnimationsFunction,
        sendEvent:          SendEventFunction,
        wait:               WaitFunction,
        toggle:             ToggleFunction,
        untoggle:           UntoggleFunction
    },
    scheme: {
    }
};
