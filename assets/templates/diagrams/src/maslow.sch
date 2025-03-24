levelHeight = max(1, (height - gap * (levels - 1)) / max(1, levels))
levelItems = List()


local c1 = decodeColor(color1)
local c2 = decodeColor(color2)
local c3 = decodeColor(color3)

for (local i = 0; i < levels; i++) {
    local t = max(0, min(1, (levelHeight * (i+1) + gap * i) / max(1, height)))
    local levelWidth = max(1, t * width)
    local previousWidth = max(0, min(width, width * max(0, (levelHeight * i + gap * i) / max(1, height))))

    local c = c1
    if (colorStyle == 'gradient 2') {
        local k = i / max(1, (levels - 1))
        c = c1.gradient(c2, k)
    } else if (colorStyle == 'gradient 3') {
        local k = i / max(1, (levels - 1))
        if (k < 0.5) {
            c = c1.gradient(c2, k * 2)
        } else {
            c = c2.gradient(c3, (k - 0.5) * 2)
        }
    }

    local item = Item(
        `level-${i}`,
        `Level ${i+1}`,
        'trapezoid',
        width/2 - levelWidth/2,
        (levelHeight + gap)*i,
        levelWidth,
        levelHeight
    )
    item.shapeProps = Map(
        'topRatio', (previousWidth / levelWidth) * 100,
        'fill', Fill.solid(c.encode()),
        'strokeSize', strokeSize,
        'strokeColor', strokeColor,
    )
    item.textSlots = Map(
        'body', Map(
            'text', `<p><b>Level ${i+1}</b></p>`,
        )
    )

    if (colorStyle == 'custom') {
        item.args.set('templateIgnoredProps', List('shapeProps.fill', 'shapeProps.strokeColor', 'shapeProps.strokeSize', 'shapeProps.strokePattern'))
    }

    levelItems.add(item)
}
