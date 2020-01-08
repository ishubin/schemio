import SetFunction from './SetFunction';
import HideFunction from './HideFunction';
import ShowFunction from './ShowFunction';
import ParticleEffectFunction from './connectors/ParticleEffectFunction';

export default {
    item: {
        hide: HideFunction,
        show: ShowFunction,
        set: SetFunction,
    },
    connector: {
        set: SetFunction,
        particleEffect: ParticleEffectFunction
    },
    scheme: {
    }
};
