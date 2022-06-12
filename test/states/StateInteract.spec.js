import StateInteract from '../../src/ui/components/editor/states/StateInteract.js';
import expect from 'expect';

const EventBus = {};
const schemeContainer = {
    findItemById(id) {
        return {id};
    }
};
describe('StateInteract', () => {

    it('should handle mousein and mouseout events correctly', () => {
        const stateInteract = new StateInteract({}, EventBus);
        stateInteract.setSchemeContainer(schemeContainer);
        const invokations = [];
        stateInteract.emit = (element, eventName) => {
            invokations.push({element, eventName});
        };


        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({type: 'void'});

        expect(invokations).toStrictEqual([
            { element: {id: 'a'}, eventName: 'mousein'},
            { element: {id: 'a'}, eventName: 'mouseout'}
        ]);
    });

    it('should handle mousein and mouseout events when moving from one object to another', () => {
        const stateInteract = new StateInteract({}, EventBus);
        stateInteract.setSchemeContainer(schemeContainer);
        const invokations = [];
        stateInteract.emit = (element, eventName) => {
            invokations.push({element, eventName});
        };


        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'b'}});
        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'b'}});
        stateInteract.handleItemHoverEvents({type: 'item', item: {id: 'b'}});

        expect(invokations).toStrictEqual([
            { element: {id: 'a'}, eventName: 'mousein'},
            { element: {id: 'a'}, eventName: 'mouseout'},
            { element: {id: 'b'}, eventName: 'mousein'}
        ]);
    });
})