import SetFunction from './SetFunction';
import HideFunction from './HideFunction';
import ShowFunction from './ShowFunction';
import ZoomToItFunction from './ZoomToItFunction';
import ParticleEffectFunction from './connectors/ParticleEffectFunction';
import CrawlEffectFunction from './connectors/CrawlEffectFunction';

export default {
    item: {
        hide: HideFunction,
        show: ShowFunction,
        set: SetFunction,
        zoomToIt: ZoomToItFunction
    },
    connector: {
        set: SetFunction,
        particleEffect: ParticleEffectFunction,
        crawlEffect: CrawlEffectFunction
    },
    scheme: {
    }
};
