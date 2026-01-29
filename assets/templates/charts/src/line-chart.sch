plotWidth = max(1, width - 20)
plotHeight = max(1, height - 20)
dy = yMax - yMin
dx = plotWidth * xStep / max(0.000001, xMax - xMin)


struct Point {
    x: 0
    y: 0
}

func parseDatasetPoints(encodedPoints) {
    if (abs(plotHeight / dy) > 100000 || abs(dx) > 10000) {
        return List()
    }

    encodedPoints.split(',').map((p, idx) => {
        local value = parseFloat(p.trim())
        Point(dx * idx, (yMax - value) * plotHeight / dy)
    })
}