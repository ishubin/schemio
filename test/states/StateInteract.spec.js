import StateInteract from '../../src/ui/components/editor/states/StateInteract.js';
import expect from 'expect';


describe('StateInteract', () => {

    it('should handle mousein and mouseout events correctly', () => {
        const stateInteract = new StateInteract({});
        const invokations = [];
        stateInteract.emit = (originator, eventName) => {
            invokations.push({originator, eventName});
        };


        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents(null);

        expect(invokations).toStrictEqual([
            { originator: {id: 'a'}, eventName: 'mousein'},
            { originator: {id: 'a'}, eventName: 'mouseout'}
        ]);
    });

    it('should handle mousein and mouseout events when moving from one object to another', () => {
        const stateInteract = new StateInteract({});
        const invokations = [];
        stateInteract.emit = (originator, eventName) => {
            invokations.push({originator, eventName});
        };


        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'a'}});
        stateInteract.handleItemHoverEvents({item: {id: 'b'}});
        stateInteract.handleItemHoverEvents({item: {id: 'b'}});
        stateInteract.handleItemHoverEvents({item: {id: 'b'}});

        expect(invokations).toStrictEqual([
            { originator: {id: 'a'}, eventName: 'mousein'},
            { originator: {id: 'a'}, eventName: 'mouseout'},
            { originator: {id: 'b'}, eventName: 'mousein'}
        ]);
    });
})