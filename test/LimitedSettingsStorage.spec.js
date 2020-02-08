import expect from 'expect';
import LimitedSettingsStorage from '../src/ui/LimitedSettingsStorage';

const storageStub = {
    getItem(){},
    setItem(){}
};

describe('LimitedSettingsStorage', () => {
    it('should store multiple objects', () => {
        const storage = new LimitedSettingsStorage(storageStub, "my-settings", 10);

        storage.save('element1', {name: 'Element 1'});
        storage.save('element2', 'element 2');
        storage.save('element3', 43);

        expect(storage.get('element1')).toStrictEqual({name: 'Element 1'});
        expect(storage.get('element2')).toStrictEqual('element 2');
        expect(storage.get('element3')).toStrictEqual(43);
        expect(storage.get('element435')).toBeUndefined();
    });


    it('should overwrite oldest elements when it goes above the limit', () => {
        const storage = new LimitedSettingsStorage(storageStub, "my-settings", 3);

        storage.save('element1', 'element 1');
        storage.save('element2', 'element 2');
        storage.save('element3', 'element 3');
        storage.save('element4', 'element 4');

        expect(storage.get('element1')).toBeUndefined();
        expect(storage.get('element2')).toStrictEqual('element 2');
        expect(storage.get('element3')).toStrictEqual('element 3');
        expect(storage.get('element4')).toStrictEqual('element 4');
    })


    it('should reorder elements when saving them and put them in front', () => {
        const storage = new LimitedSettingsStorage(storageStub, "my-settings", 3);

        storage.save('element1', 'element 1');
        storage.save('element2', 'element 2');
        storage.save('element3', 'element 3');
        storage.save('element1', 'element 1 updated');
        storage.save('element4', 'element 4');

        expect(storage.get('element1')).toStrictEqual('element 1 updated');
        expect(storage.get('element2')).toBeUndefined(); // should not exist as it was a least recently updated item
        expect(storage.get('element3')).toStrictEqual('element 3');
        expect(storage.get('element4')).toStrictEqual('element 4');
    })

    it('should blah', () => {
        const storage = new LimitedSettingsStorage(storageStub, "my-settings", 3);

        storage.save('element1', 'element 1');
        storage.save('element1', 'element 1');
        storage.save('element1', 'element 1');
        storage.save('element1', 'element 1');

        expect(storage.getElementsCount()).toStrictEqual(1);
    })
});

