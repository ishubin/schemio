import SetFunction from './SetFunction';
import HideFunction from './HideFunction';
import ShowFunction from './ShowFunction';
import SendEventFunction from './SendEventFunction';
import ZoomToItFunction from './ZoomToItFunction';
import ParticleEffectFunction from './connectors/ParticleEffectFunction';
import CrawlEffectFunction from './connectors/CrawlEffectFunction';
import StopAllAnimationsFunction from './StopAllAnimationsFunction';
import ItemParticleEffectFunction from './ItemParticleEffectFunction';
import BlinkEffectFunction from './BlinkEffectFunction';
import ItemMoveFunction from '../ItemMoveFunction';

export default {
    item: {
        hide:               HideFunction,
        show:               ShowFunction,
        set:                SetFunction,
        zoomToIt:           ZoomToItFunction,
        particleEffect:     ItemParticleEffectFunction,
        blinkEffect:        BlinkEffectFunction,
        move:               ItemMoveFunction,
        stopAllAnimations:  StopAllAnimationsFunction,
        sendEvent:          SendEventFunction
    },
    connector: {
        set:                SetFunction,
        hide:               HideFunction,
        show:               ShowFunction,
        particleEffect:     ParticleEffectFunction,
        crawlEffect:        CrawlEffectFunction,
        stopAllAnimations:  StopAllAnimationsFunction,
        sendEvent:          SendEventFunction
    },
    scheme: {
    }
};
