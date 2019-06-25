import SetFunction from '../../src/ui/userevents/functions/SetFunction.js';
import expect from 'expect';

describe('SetFunction', () => {
    // it('should not fail if item is null', () => {
    //     SetFunction.execute(null, ['opacity', 1.0]);
    // });

    // it('should not do anything if field is empty', () => {
    //     const item = { opacity: 0.5 };
    //     SetFunction.execute(item, ['', 1.0]);
    //     SetFunction.execute(item, ['.something', 1.0]);
    //     expect(item).toStrictEqual({opacity: 0.5});
    // });

    // it('should mutate existing property', () => {
    //     const item = { opacity: 0.5 };
    //     SetFunction.execute(item, ['opacity', 1.0]);
    //     expect(item).toStrictEqual({opacity: 1.0});
    // });

    // it('should add property', () => {
    //     const item = { opacity: 0.5 };
    //     SetFunction.execute(item, ['name', 'Blah']);
    //     expect(item).toStrictEqual({
    //         opacity: 0.5,
    //         name: 'Blah'
    //     });
    // });

    // it('should mutate existing nested property', () => {
    //     const item = {
    //         opacity: 0.5,
    //         shapeProps: {
    //             strokeSize: 1,
    //             someOtherField: {
    //                 someValue: 123
    //             }
    //         }
    //     };
    //     SetFunction.execute(item, ['shapeProps.someOtherField.someValue', 123]);
    //     expect(item).toStrictEqual({
    //         opacity: 0.5,
    //         shapeProps: {
    //             strokeSize: 1,
    //             someOtherField: {
    //                 someValue: 123
    //             }
    //         }
    //     });
    // });

    // it('should extend parent fields for nested property', () => {
    //     const item = {
    //         opacity: 0.5
    //     };
    //     SetFunction.execute(item, ['shapeProps.someOtherField.someValue', 123]);
    //     expect(item).toStrictEqual({
    //         opacity: 0.5,
    //         shapeProps: {
    //             someOtherField: {
    //                 someValue: 123
    //             }
    //         }
    //     });
    // });

    it('should not change nested property if it is an object', () => {
        const item = {
            opacity: 0.5,
            shapeProps: {
                someOtherField: {
                    someValue: 123
                }
            }
        };
        SetFunction.execute(item, ['shapeProps.someOtherField', 123]);
        expect(item).toStrictEqual({
            opacity: 0.5,
            shapeProps: {
                someOtherField: {
                    someValue: 123
                }
            }
        });
    });
});