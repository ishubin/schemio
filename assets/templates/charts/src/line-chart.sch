struct Point {
    x: 0
    y: 0
}

func parseGraphPoints(encodedPoints) {
    local w = width - 20
    local h = height - 20

    local dy = yMax - yMin

    local dx = w * xStep / max(0.000001, xMax - xMin)
    if (abs(h/dy) > 100000 || abs(dx) > 10000) {
        return List()
    }

    encodedPoints.split(',').map((p, idx) => {
        local value = parseFloat(p.trim())
        Point(dx * idx, (yMax - value) * h / dy)
    })
}