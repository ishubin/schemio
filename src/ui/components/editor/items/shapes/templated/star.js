export default {
    name: "Star",

    shapeConfig: {
        id: "ts_star",
        shapeType: "templated-path",
        init: ["R = max(min(width, height) / 2, 0.0001)"],
        menuItems: [{
            group: "Basic",
            name: "Star",
            size: {
                w: 56.5,
                h: 80
            },
            previewArea: {
                x: 0,
                y: 0,
                w: 105.9,
                h: 150,
                r: 0
            }
        }],
        pins: [{
            id: "c",
            x: {"$-expr": "width/2"},
            y: {"$-expr": "height/2"}
        },{
            "$-for": {start: 0, until: {"$-expr": "args.spikes*2"}, it: "idx"},
            id: {"$-expr": "`p${idx}`"},
            x: {"$-expr": "width/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * cos(2*PI()*idx/(args.spikes*2))*width/(2*R)"},
            y: {"$-expr": "height/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * sin(2*PI()*idx/(args.spikes*2))*height/(2*R)"},
            nx: {"$-expr": "cos(2*PI()*idx/(args.spikes))"},
            ny: {"$-expr": "sin(2*PI()*idx/(args.spikes))"}
        }],
        args: {
            spikes: {type: "number", value: 8, min: 3, max: 100, name: "Spikes"},
            spikeHeight: {type: "number", value: 0.5, min: 0, max: 1, name: "Spike height"}
        },
        paths: [{
            fill: {"$-expr": "args.fill"},
            strokeColor: {"$-expr": "args.strokeColor"},
            strokeSize: {"$-expr": "args.strokeSize"},
            closed: true,
            type: "path",
            points: [{
                "$-for": {start: 0, until: {"$-expr": "args.spikes * 2"}, it: "idx"},
                x: {"$-expr": "width/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * cos(2*PI()*idx/(args.spikes*2))*width/(2*R)"},
                y: {"$-expr": "height/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * sin(2*PI()*idx/(args.spikes*2))*height/(2*R)"},
                t: "L"
            }]
        }],
        "$-comment:outlines": "Outlines will contain array of paths",
        outlines: [{
            type: "path",
            closed: "true",
            points: [{
                "$-for": {start: 0, until: {"$-expr": "args.spikes * 2"}, it: "idx"},
                x: {"$-expr": "width/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * cos(2*PI()*idx/(args.spikes*2))*width/(2*R)"},
                y: {"$-expr": "height/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * sin(2*PI()*idx/(args.spikes*2))*height/(2*R)"},
                t: "L"
            }]
        }],
        controlPoints: [{
            min: 0, max: 1,
            start: {
                x: {"$-expr": "width/2"},
                y: {"$-expr": "height/2"}
            },
            end: {
                x: {"$-expr": "width/2"},
                y: {"$-expr": "0"}
            },
            updates: "spikesHeight"
        }],
        textSlots: [{
            name: "body",
            area: { x: 0, y: 0, w: {"$-expr": "width"}, h: {"$-expr": "height"} }
        }]
    }
};