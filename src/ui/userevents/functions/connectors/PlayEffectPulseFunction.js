import shortid from 'shortid';
import EventBus from '../../../components/editor/EventBus.js';

function toNumber(value, defaultValue) {
    if (isNaN(value)) {
        return defaultValue;
    }
    return value;
}

export default {
    name: 'Play Pulse Effect',
    args: [
        {name: 'Pulse Size',        type: 'number', value: 10},
        {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        {name: 'Duration (sec)',    type: 'number', value: 1},
        {name: 'Repeat',            type: 'number', value: 1},
        {name: 'Offset time (sec)', type: 'number', value: 0.5},
    ],

    execute(connector, [pulseSize, color, duration, repeatCount, offsetTime]) {
        if (connector) {
            if (!connector.meta) {
                connector.meta = {};
            }
            if (!connector.meta.animations) {
                connector.meta.animations = {};
            }

            connector.meta.animations['effect-pulse'] = {
                id: shortid.generate(),
                size: toNumber(pulseSize, 10),
                duration: `${toNumber(duration, 1)}s`,
                color: color,
                repeatCount: repeatCount
            };
            EventBus.emitConnectorChanged(connector.id);
        }
    }
};