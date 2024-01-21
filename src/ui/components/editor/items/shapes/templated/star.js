export default {
    name: "Star",

    shapeConfig: {
        id: "basic_star",
        shapeType: "templated-path",
        init: ["R = max(min(width, height) / 2, 0.0001)"],
        menuItems: [{
            group: "Basic Shapes",
            name: "Star",
            size: { w: 80, h: 80 },
            previewArea: { x: 0, y: 0, w: 130, h: 130, r: 0 },
            iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMsIDMpIj48cGF0aCBkPSJNIDEzIDAgTCAxNS40OSA3IEwgMjIuMTkgMy44MSBMIDE5LjAxIDEwLjUyIEwgMjYgMTMgTCAxOS4wMSAxNS40OCBMIDIyLjE5IDIyLjE5IEwgMTUuNDkgMTkuMDEgTCAxMyAyNiBMIDEwLjUyIDE5LjAxIEwgMy44MSAyMi4xOSBMIDYuOTkgMTUuNDggTCAwIDEzIEwgNi45OSAxMC41MiBMIDMuODEgMy44MSBMIDEwLjUyIDYuOTkgTCAxMyAwICBaICIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjMTExMTExIiBzdHJva2Utd2lkdGg9IjJweCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvZz48L3N2Zz4="
        }],
        pins: [{
            id: "c",
            x: {"$-expr": "width/2"},
            y: {"$-expr": "height/2"}
        },{
            "$-for": {start: 0, until: {"$-expr": "args.spikes*2"}, it: "idx"},
            id: {"$-expr": "`p${idx}`"},
            x: {"$-expr": "width/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * cos(PI()*(2*idx/(args.spikes*2)-0.5))*width/(2*R)"},
            y: {"$-expr": "height/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * sin(PI()*(2*idx/(args.spikes*2)-0.5))*height/(2*R)"},
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
                x: {"$-expr": "width/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * cos(PI()*(2*idx/(args.spikes*2)-0.5))*width/(2*R)"},
                y: {"$-expr": "height/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * sin(PI()*(2*idx/(args.spikes*2)-0.5))*height/(2*R)"},
                t: "L"
            }]
        }],
        outlines: [{
            type: "path",
            closed: "true",
            points: [{
                "$-for": {start: 0, until: {"$-expr": "args.spikes * 2"}, it: "idx"},
                x: {"$-expr": "width/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * cos(PI()*(2*idx/(args.spikes*2)-0.5))*width/(2*R)"},
                y: {"$-expr": "height/2 + ifcond(idx%2 == 0, R, R*args.spikeHeight) * sin(PI()*(2*idx/(args.spikes*2)-0.5))*height/(2*R)"},
                t: "L"
            }]
        }],
        controlPoints: [{
            id: "spikeHeight",
            min: 0, max: 1,
            start: {
                x: {"$-expr": "width/2"},
                y: {"$-expr": "height/2"}
            },
            end: {
                x: {"$-expr": "width/2"},
                y: {"$-expr": "0"}
            },
            updates: "spikeHeight"
        }],
        textSlots: [{
            name: "body",
            area: { x: 0, y: 0, w: {"$-expr": "width"}, h: {"$-expr": "height"} }
        }]
    }
};