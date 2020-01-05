export default {
    name: 'Play Pulse Effect',
    args: [
        {name: 'Pulse Size',        type: 'number', value: 10},
        {name: 'Color',             type: 'color',  value: 'rgba(255,0,0,1.0)'},
        {name: 'Amount',            type: 'number', value: 1},
        {name: 'Speed (sec)',       type: 'number', value: 1},
        {name: 'Offset time (sec)', type: 'number', value: 0.5},
    ],

    execute(connector, args) {
        console.log('Function called with args', arguments);
        if (connector) {
            // item.visible = true;
        }
    }
};