import UserEventBus from '../../src/ui/userevents/UserEventBus.js';
import expect from 'expect';

function withMessage(message, callback) {
    try {
        callback();
    } catch(e) {
        throw new Error(message + ': ' + e);
    }
}

describe('UserEventBus', () => {
    it('should register and clear events', () => {
        const eventBus = new UserEventBus();

        expect(eventBus.itemEventSubscribers).toStrictEqual({});

        eventBus.subscribeItemEvent('abc', 'mousein', [], () => {});
        eventBus.subscribeItemEvent('abc', 'mousein', ['blah'], () => {});
        eventBus.subscribeItemEvent('abc', 'mouseout', [], () => {});

        expect(eventBus.itemEventSubscribers.abc.mousein.length).toBe(2);
        expect(eventBus.itemEventSubscribers.abc.mousein[0].args).toStrictEqual([]);
        expect(eventBus.itemEventSubscribers.abc.mousein[1].args).toStrictEqual(['blah']);

        expect(eventBus.itemEventSubscribers.abc.mouseout.length).toBe(1);
        expect(eventBus.itemEventSubscribers.abc.mouseout[0].args).toStrictEqual([]);
        
        eventBus.clear();

        expect(eventBus.itemEventSubscribers).toStrictEqual({});
    });


    it('should invoke subscribed callback for a simple event', () => {
        const eventBus = new UserEventBus();
        
        let callbackInvokeCounter = 0; // this one should increment in the end
        let inactiveInvokeCounter = 0; // this one should stay unchanged

        eventBus.subscribeItemEvent('abc', 'mousein', [], () => {
            callbackInvokeCounter += 1;
        });
        eventBus.subscribeItemEvent('ab', 'mousein', [], () => {
            inactiveInvokeCounter += 1;
        });

        eventBus.emitItemEvent('qwe', 'mousein');
        expect(callbackInvokeCounter).toBe(0);

        eventBus.emitItemEvent('abc', 'mouseout');
        expect(callbackInvokeCounter).toBe(0);

        eventBus.emitItemEvent('abc', 'mousein');
        expect(callbackInvokeCounter).toBe(1);

        eventBus.emitItemEvent('abc', 'mousein');
        expect(callbackInvokeCounter).toBe(2);
        expect(inactiveInvokeCounter).toBe(0); // We did not emit events registered for this subscriber so it should stay at 0
    });


    it('should invoke subscribed callback only if it matches arguments with strict equal', () => {
        const eventBus = new UserEventBus();
        let callbackInvokeCounter = 0;

        // We only subscribe by matching 2nd and 4th argument. Here we are going to test how it matches integers and strings
        eventBus.subscribeItemEvent('abc', 'custom-event', ['', '=23', '', '=Hello'], () => { callbackInvokeCounter += 1 });

        eventBus.emitItemEvent('abc', 'custom-event', ['Blah', 23, 'Hello', '', 'Hello']);
        withMessage('should not be invoked', () => { expect(callbackInvokeCounter).toBe(0) });

        eventBus.emitItemEvent('abc', 'custom-event', ['Blah', 23, '', 'hello', '']);
        withMessage('should not be invoked', () => { expect(callbackInvokeCounter).toBe(0) });

        eventBus.emitItemEvent('abc', 'custom-event', ['Blah', 23, '', 'Hello', '']);
        withMessage('should be invoked as it matches all args', () => { expect(callbackInvokeCounter).toBe(1) });

        eventBus.emitItemEvent('abc', 'custom-event', ['Blah', 22, '', 'Hello', '']);
        withMessage('should not be invoked as 2nd argument is not 23', () => { expect(callbackInvokeCounter).toBe(1) });

        eventBus.emitItemEvent('abc', 'custom-event', ['Blah', '23', '', 'Hello', '']);
        withMessage('should be invoked as 2nd argument is 23 even it is a string', () => { expect(callbackInvokeCounter).toBe(2) });
    });
});