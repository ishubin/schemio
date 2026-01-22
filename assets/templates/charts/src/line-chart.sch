struct Point {
    x: 0
    y: 0
}

func parseGraphPoints(encodedPoints) {
    local w = width - 20
    local h = height - 20

    local dy = yMax - yMin
    if (abs(dy) < 0.000001) {
        dy = 0.000001
    }

    encodedPoints.split(',').map((p, idx) => {
        local value = parseFloat(p.trim())
        Point(xStep * idx, (value - yMin) * h / dy)
    })
}