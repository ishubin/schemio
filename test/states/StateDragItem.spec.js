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


    it('mouseup event on selected item should re-select it in case the mouse was not moved since last mouse down', () => {
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

        // just making sure that selectItem method was not called before mouseUp event
        expect(schemeContainer.selectItem.notCalled).toBe(true);

        state.mouseUp(0, 0, 0, 0, object, {});
        
        // validation
        expect(schemeContainer.selectItem.getCalls().length).toBe(1);
    });

    it('mouseup event on selected item should not re-select it in case the mouse was moved since last mouse down', () => {
        //preparation
        const schemeContainer = {
            isItemSelected: sinon.fake.returns(true),
            selectItem: sinon.fake(),
            deselectAllConnectors: sinon.fake(),
            selectedItems: []
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
        state.mouseMove(0, 0, 0, 0, object, {});
        state.mouseUp(1, 1, 1, 1, object, {});
        
        // validation
        expect(schemeContainer.selectItem.notCalled).toBe(true);
    });
});
