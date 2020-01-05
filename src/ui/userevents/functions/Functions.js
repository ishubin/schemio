import SetFunction from './SetFunction';
import HideFunction from './HideFunction';
import ShowFunction from './ShowFunction';
import PlayEffectPulseFunction from './connectors/PlayEffectPulseFunction';

export default {
    item: {
        hide: HideFunction,
        show: ShowFunction,
        set: SetFunction,
    },
    connector: {
        set: SetFunction,
        playEffectPulse: PlayEffectPulseFunction
    },
    scheme: {
    }
};
