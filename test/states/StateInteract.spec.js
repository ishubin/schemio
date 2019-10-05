import StateInteract from '../../src/ui/components/editor/states/StateInteract.js';
import expect from 'expect';

const EventBus = {};
describe('StateInteract', () => {

    it('should handle mousein and mouseout events correctly', () => {
        const stateInteract = new StateInteract({}, EventBus);
        const invokations = [];
        stateInteract.emit = (element, eventName) => {
            invokations.push({element, eventName});
        };


        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents(null);

        expect(invokations).toStrictEqual([
            { element: {id: 'a'}, eventName: 'mousein'},
            { element: {id: 'a'}, eventName: 'mouseout'}
        ]);
    });

    it('should handle mousein and mouseout events when moving from one object to another', () => {
        const stateInteract = new StateInteract({}, EventBus);
        const invokations = [];
        stateInteract.emit = (element, eventName) => {
            invokations.push({element, eventName});
        };


        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'b'}});
        stateInteract.handleItemHoverEvents({item: {id: 'b'}});
        stateInteract.handleItemHoverEvents({item: {id: 'b'}});

        expect(invokations).toStrictEqual([
            { element: {id: 'a'}, eventName: 'mousein'},
            { element: {id: 'a'}, eventName: 'mouseout'},
            { element: {id: 'b'}, eventName: 'mousein'}
        ]);
    });
})