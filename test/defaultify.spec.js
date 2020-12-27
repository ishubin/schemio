import { defaultifyObject, enrichObjectWithDefaults } from '../src/defaultify.js';
import expect from 'expect';

describe('defaultifyObject', () => {
    it('should remove simple fields', () => {
        const obj           = { name: 'Rect', shape: 'rect', color: 'red' };
        const defaultObject = { name: '', color: 'red', background: 'blue' };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed field color as it matches in the defaultObject
        expect(result).toStrictEqual({ name: 'Rect', shape: 'rect' });
    });


    it('should remove nested fields', () => {
        const obj = {
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none',
                color: 'blue'
            }
        };
        const defaultObject = {
            fill: {
                type: 'color',
                color: 'blue'
            }
        };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed color in "fill" as it matches in the defaultObject
        expect(result).toStrictEqual({
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none'
            }
        });
    });
    

    it('should remove entire complex object if it completely matches', () => {
        const obj = {
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none',
                color: 'blue'
            },
            someField: {
                someNestedField: {
                    a: 'blah',
                    b: 23
                },
                c: false
            }
        };
        const defaultObject = {
            fill: {
                type: 'color',
            },
            someField: {
                someNestedField: {
                    a: 'blah',
                    b: 23
                },
                c: false
            }
        };

        const result = defaultifyObject(obj, defaultObject);

        // it should have removed "someField" as it completely matches
        expect(result).toStrictEqual({
            name: 'Rect', shape: 'rect',
            fill: {
                type: 'none',
                color: 'blue'
            }
        });
    });



    it('should also defaultify arrays', () => {
        const obj = {
            name: 'Scheme',
            tags: [],
            items: [{
                name: 'rect 1',
                shape: 'rect',
                color: 'red'
            }, {
                name: 'label',
                shape: 'none',
                color: 'blue'
            }]
        };
        const defaultObject = {
            name: '',
            items: [{
                name: '',
                shape: 'none',
                color: 'blue'
            }]
        };

        const result = defaultifyObject(obj, defaultObject);

        expect(result).toStrictEqual({
            name: 'Scheme',
            tags: [],
            items: [{
                name: 'rect 1',
                shape: 'rect',
                color: 'red'
            }, {
                name: 'label',
            }]
        });
    });


    it('should defaultify arrays and remove them in case they are empty', () => {
        const obj = {
            items: [ {
                name: 'item 1',
                behavior: {
                    events: [ {
                        on: 'mouseover'
                    }]
                }
            }, {
                name: 'item 2',
                behavior: {
                    events: []
                }
            } ]
        }

        const defaultObject = {
            name: '',
            items: [{
                name: '',
                shape: 'none',
                color: 'blue',
                behavior: {
                    events: [ {
                        // empty object for the sake of test
                    } ]
                }
            }]
        };

        const result = defaultifyObject(obj, defaultObject);

        expect(result).toStrictEqual({
            items: [ {
                name: 'item 1',
                behavior: {
                    events: [ {
                        on: 'mouseover'
                    }]
                }
            }, {
                name: 'item 2'
            } ]
        });
    });


    it('should allow to specify asterisk defaultifiers to match any fields in the object', () => {
        const obj = {
            name: 'Scheme',
            tags: [],
            items: [{
                name: 'label',
                textSlots: {
                    head: {
                        color: 'black',
                        text: 'hi',
                        fontSize: 30
                    },
                    body: {
                        color: 'red',
                        text: 'Hello',
                        fontSize: 20
                    }
                }
            }]
        };
        const defaultObject = {
            name: '',
            items: [{
                name: '',
                shape: 'none',
                color: 'blue',
                textSlots: {
                    '*': {
                        color: 'black',
                        text: '',
                        fontSize: 20
                    }
                }
            }]
        };

        const result = defaultifyObject(obj, defaultObject);

        expect(result).toStrictEqual({
            name: 'Scheme',
            tags: [],
            items: [{
                name: 'label',
                textSlots: {
                    head: {
                        text: 'hi',
                        fontSize: 30
                    },
                    body: {
                        color: 'red',
                        text: 'Hello'
                    }
                }
            }]
        });
    });
});


describe('enrichObjectWithDefaults', () => {
    it('should add default simple fields', () => {
        const obj = {
            name: 'icon'
        };
        
        const defaultObj = {
            name: '',
            color: 'red',
            visible: true
        };

        enrichObjectWithDefaults(obj, defaultObj);

        expect(obj).toStrictEqual({
            name: 'icon',
            color: 'red',
            visible: true
        });
    });


    it('should add default nested fields', () => {
        const obj = {
            name: 'icon',
            shapeProps: {
                color: 'red'
            }
        };
        
        const defaultObj = {
            name: '',
            shapeProps: {
                color: 'blue',
                fill: 'green',
                strokeSize: 1
            }
        };

        enrichObjectWithDefaults(obj, defaultObj);

        expect(obj).toStrictEqual({
            name: 'icon',
            shapeProps: {
                color: 'red',
                fill: 'green',
                strokeSize: 1
            }
        });
    });

    it('should add default nested fields even when they are explicitly set to null in object', () => {
        const obj = {
            name: 'icon',
            shapeProps: null
        };
        
        const defaultObj = {
            name: '',
            shapeProps: {
                color: 'blue',
                fill: 'green',
                strokeSize: 1
            }
        };

        enrichObjectWithDefaults(obj, defaultObj);

        expect(obj).toStrictEqual({
            name: 'icon',
            shapeProps: {
                color: 'blue',
                fill: 'green',
                strokeSize: 1
            }
        });
    });


    it('should add defaults to arrays', () => {
        const obj = {
            name: 'Hello',
            items: [ {
                name: 'icon'
            }, {
                name: 'rect',
                shapeProps: {
                    color: 'red'
                }
            } ]
        };
        
        const defaultObj = {
            name: '',
            items: [{
                name: '',
                shapeProps: {
                    color: 'blue',
                    fill: 'green',
                    strokeSize: 1
                }
            }]
        };

        enrichObjectWithDefaults(obj, defaultObj);

        expect(obj).toStrictEqual({
            name: 'Hello',
            items: [{
                name: 'icon',
                shapeProps: {
                    color: 'blue',
                    fill: 'green',
                    strokeSize: 1
                }
            }, {
                name: 'rect',
                shapeProps: {
                    color: 'red',
                    fill: 'green',
                    strokeSize: 1
                }
            }]
        });
    });

    it('should use asterisk to apply defaults to all fields in object', () => {
        const obj = {
            name: 'icon',
            textSlots: {
                header: {
                    text: 'Hello'
                },
                body: {
                    text: 'World',
                    color: 'black'
                }
            }
        };

        const defaultObj = {
            name: 'icon',
            textSlots: {
                '*': {
                    text: '',
                    color: 'black',
                    fontSize: 16
                }
            }
        };

        enrichObjectWithDefaults(obj, defaultObj);

        expect(obj).toStrictEqual({
            name: 'icon',
            textSlots: {
                header: {
                    text: 'Hello',
                    color: 'black',
                    fontSize: 16
                },
                body: {
                    text: 'World',
                    color: 'black',
                    fontSize: 16
                }
            }
        });
    });
});