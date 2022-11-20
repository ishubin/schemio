import SetFunction from '../../src/ui/userevents/functions/SetFunction.js';
import expect from 'expect';

const stubResultCallback = () => {};
const stubSchemeContainer = {editorId: 1};
describe('SetFunction', () => {
    it('should not fail if item is null', () => {
        SetFunction.execute(null, ['opacity', 1.0], stubSchemeContainer, null, stubResultCallback);
    });

    it('should not do anything if field is empty', () => {
        const item = { opacity: 0.5 };
        SetFunction.execute(item, {field: '', value: 1.0}, stubSchemeContainer, null, stubResultCallback);
        SetFunction.execute(item, {field: '.something', value: 1.0}, stubSchemeContainer, null, stubResultCallback);
        expect(item).toStrictEqual({opacity: 0.5});
    });

    it('should mutate existing property', () => {
        const item = { opacity: 0.5 };
        SetFunction.execute(item, {field: 'opacity', value: 1.0}, stubSchemeContainer, null, stubResultCallback);
        expect(item).toStrictEqual({opacity: 1.0});
    });

    it('should add property', () => {
        const item = { opacity: 0.5 };
        SetFunction.execute(item, {field: 'name', value: 'Blah'}, stubSchemeContainer, null, stubResultCallback);
        expect(item).toStrictEqual({
            opacity: 0.5,
            name: 'Blah'
        });
    });

    it('should mutate existing nested property', () => {
        const item = {
            opacity: 0.5,
            shapeProps: {
                strokeSize: 1,
                someOtherField: {
                    someValue: 123
                }
            }
        };
        SetFunction.execute(item, {field: 'shapeProps.someOtherField.someValue', value: 123}, stubSchemeContainer, null, stubResultCallback);
        expect(item).toStrictEqual({
            opacity: 0.5,
            shapeProps: {
                strokeSize: 1,
                someOtherField: {
                    someValue: 123
                }
            }
        });
    });

    it('should extend parent fields for nested property', () => {
        const item = {
            opacity: 0.5
        };
        SetFunction.execute(item, {field: 'shapeProps.someOtherField.someValue', value: 123}, stubSchemeContainer, null, stubResultCallback);
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