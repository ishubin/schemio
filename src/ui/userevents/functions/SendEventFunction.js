
export default {
    name: 'Show',
    args: {
        event: {name: 'Event', type: 'string', value: 'Unknown event...'},
    },

    execute(item, args, schemeContainer, userEventBus) {
        userEventBus.emitItemEvent(item.id, args.event, []);
    }
}