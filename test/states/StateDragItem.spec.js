import StateDragItem from '../../src/ui/components/editor/states/StateDragItem.js';
import expect from 'expect';

import sinon from 'sinon';
import { AssertionError } from 'assert';

const whateverEventBus = {};


describe('StateDragItem', () => {

    it('mousedown event on deselected item should select the item', () => {
        //preparation
        const schemeContainer = {
            isItemSelected: sinon.fake.returns(false),
            selectItem: sinon.fake(),
            deselectAllConnectors: sinon.fake()
        };
        const state = new StateDragItem({
            schemeContainer: schemeContainer
        }, whateverEventBus);

        const object = {
            item: {
                id: 'test-item-01',
                area: {x: 0, y:0, w: 100, h: 50},
                meta: {}
            }
        };
        const mouseEvent = {button: 1};
        
        //execution
        state.mouseDown(0, 0, 0, 0, object, mouseEvent);

        //validation
        expect(schemeContainer.selectItem.calledOnce).toBe(true);
        
    });

    it('mousedown event on selected item should not try to re-select it', () => {
        //preparation
        const schemeContainer = {
            isItemSelected: sinon.fake.returns(true),
            selectItem: sinon.fake(),
            deselectAllConnectors: sinon.fake()
        };
        const state = new StateDragItem({
            schemeContainer: schemeContainer
        }, whateverEventBus);

        const object = {
            item: {
                id: 'test-item-01',
                area: {x: 0, y:0, w: 100, h: 50},
                meta: {}
            }
        };
        const mouseEvent = {button: 1};
        
        //execution
        state.mouseDown(0, 0, 0, 0, object, mouseEvent);

        //validation
        expect(schemeContainer.selectItem.getCalls().length).toBe(0);
        
    });
});
