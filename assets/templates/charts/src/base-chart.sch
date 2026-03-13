struct Path {
    points: List()
    closed: false
    pos: 'relative'
}

struct Point {
    x: 0
    y: 0
    t: 'L'
}

struct SmoothPoint {
    x: 0
    y: 0
    x1: 0
    y1: 0
    x2: 0
    y2: 0
    t: 'B'
}
struct Point {
    x: 0
    y: 0
    t: 'L'
}

struct SmoothPoint {
    x: 0
    y: 0
    x1: 0
    y1: 0
    x2: 0
    y2: 0
    t: 'B'
}

struct LegendLabel {
    index: 0
    name: ""
    color: "#ff00ffff"
    x: 0
    y: 0
    w: 1
    h: 1
}

struct Legend {
    w: 0
    h: 0
    labels: List()
}

struct AxisLabel {
    text: ""
    x: 0
    y: 0
    w: 100
    h: 50
    halign: 'center'
}

struct AxisLine {
    position: 0
    labelText: ""
}

struct Axis {
    lines: List()
    min: 0
    max: 100
    step: 10
    labels: List()
}

func calculateNiceStep(roughStep) {
    // Find a "nice" step size (1, 2, 5, 10, 20, 50, 100, etc.)
    local magnitude = 10 ^ floor(log10(roughStep))
    local normalized = roughStep / magnitude

    local niceStep = 1
    if (normalized < 1.5) {
        niceStep = magnitude
    } else if (normalized < 3.5) {
        niceStep = 2 * magnitude
    } else if (normalized < 7.5) {
        niceStep = 5 * magnitude
    } else {
        niceStep = 10 * magnitude
    }
    niceStep
}

func generateYAxis(softMin, softMax, numTicks, font, fontSize) {
    numTicks = max(2, numTicks)
    // Calculate a nice step size
    local range = softMax - softMin
    local roughStep = range / (numTicks - 1)

    local niceStep = calculateNiceStep(roughStep)

    // Find nice min and max
    local niceMin = floor(softMin / niceStep) * niceStep
    local niceMax = ceil(softMax / niceStep) * niceStep

    local range = abs(niceMax - niceMin)

    // Generate grid lines
    local lines = List()
    for (local value = niceMin; value <= niceMax; value += niceStep) {
        // Normalize position to 0-100% range (0 = bottom, 100% = top)
        local position = 100 - 100 * (value - niceMin) / max(1, (niceMax - niceMin))

        lines.add(AxisLine(position, formatLabel(value, range)))
    }

    Axis(lines, niceMin, niceMax, niceStep, generateYAxisLabels(lines, font, fontSize))
}

func generateYAxisLabels(lines, font, fontSize) {
    local labels = List()
    lines.forEach((line) => {
        local size = calculateTextSize(line.labelText, font, fontSize)
        size.w *= 1.1
        size.h *= 2.2

        labels.add(AxisLabel(line.labelText, 0, line.position,  size.w, size.h, 'center'))
    })
    labels
}

local xAxisMinSpacing = 40


func generateXAxis(numPoints, plotOffset, plotWidth, plotHeight, font, fontSize, lineProvider) {
    local lines = List()
    if (numPoints < 2) {
        local line = lineProvider(0, 0)
        if (line) {
            lines.add(line)
        }
        line = lineProvider(1, 100)
        if (line) {
            lines.add(line)
        }
    } else {
        local pixelsPerPoint = plotWidth / max(1, numPoints - 1);
        local roughStep = ceil(xAxisMinSpacing / pixelsPerPoint);
        local step = max(1, calculateNiceStep(roughStep))

        for (local i = 0; i < numPoints; i += step) {
            local pct = (i / (numPoints - 1)) * 100
            local pos = round(pct * 100) / 100
            local line = lineProvider(i, pos)
            if (line) {
                lines.add(line)
            }
        }
    }

    Axis(lines, 0, 100, 100 / max(1, lines.size), generateXAxisLabels(lines, plotOffset, plotWidth, plotHeight, font, fontSize))
}

func generateXAxisLabels(lines, plotOffset, plotWidth, plotHeight, font, fontSize) {
    local labels = List()
    local maxHeight = 0
    lines.forEach((line, idx) => {
        local size = calculateTextSize(line.labelText, line.position * plotWidth / 100, plotHeight, font, fontSize)
        size.w *= 1.6
        size.h *= 2.2
        maxHeight = max(maxHeight, size.h)
        local x = if (idx == 0) {
            plotOffset + line.position * plotWidth / 100
        } else if (idx < lines.size - 1) {
            plotOffset + line.position * plotWidth / 100 - size.w / 2
        } else {
            plotOffset + plotWidth - size.w
        }
        local halign = if (idx == 0) {
            'left'
        } else if (idx == lines.size - 1) {
            'right'
        } else {
            'center'
        }
        labels.add(AxisLabel(line.labelText, x, plotHeight, size.w, size.h, halign))
    })

    labels.forEach((label) => { label.h = maxHeight })
    labels
}

func formatLabel(value, range) {
    // Handle zero
    if (value == 0) {
        return '0'
    }

    // For very small or very large numbers, use scientific notation
    local absValue = abs(value)
    if (absValue < 0.001 || absValue > 1000000) {
        return value.toExponential(2)
    }

    // Determine decimal places needed based on the range
    local decimalPlaces = 0
    if (range < 0.01) {
        decimalPlaces = 6
    } else if (range < 0.1) {
        decimalPlaces = 4
    } else if (range < 1) {
        decimalPlaces = 3
    } else if (range < 10) {
        decimalPlaces = 2
    } else if (range < 100) {
        decimalPlaces = 1
    }

    // Format and remove trailing zeros
    parseFloat(value.toFixed(decimalPlaces)).toString()
}


func buildLegend(datasets, legendWidth, legendTopMargin) {
    local maxTextHeight = -1
    local legendLabels = List()

    local freeSlotWidth = legendWidth
    local freeSlotY = 0
    local freeSlotX = 0

    if (datasets.size == 0) {
        return Legend()
    }

    local allLabels = datasets.map((dataset, idx) => {
        local size = calculateTextSize(dataset.name, font, fontSize)
        size.h *= 2.2
        size.w *= 1.5
        if (size.w > legendWidth) {
            size.w = legendWidth
        }
        LegendLabel(
            idx, dataset.name, dataset.color,
            0, 0, size.w, size.h
        )
    })

    for( ; allLabels.size > 0 ; ) {
        local label = allLabels.get(0)
        if (labelIconWidth + label.w <= freeSlotWidth) {
            label.x = freeSlotX
            label.y = freeSlotY + legendTopMargin

            legendLabels.add(label)
            allLabels.shift()

            if (maxTextHeight < label.h) {
                maxTextHeight = label.h
            }

            freeSlotX += labelIconWidth + label.w + labelsGap
            freeSlotWidth = legendWidth - freeSlotX
        } else {
            local idx = allLabels.findIndex((label) => { label.w + labelIconWidth <= freeSlotWidth })
            if (idx >= 0) {
                local label = allLabels.get(idx)
                label.x = freeSlotX
                label.y = freeSlotY + legendTopMargin

                legendLabels.add(label)
                allLabels.remove(idx)

                if (maxTextHeight < label.h) {
                    maxTextHeight = label.h
                }

                freeSlotX += label.w + labelIconWidth + labelsGap
                freeSlotWidth = legendWidth - freeSlotX
            } else {
                freeSlotX = 0
                if (maxTextHeight > 0) {
                    freeSlotY += maxTextHeight + 5
                }
                freeSlotWidth = legendWidth

                label.x = freeSlotX
                label.y = freeSlotY + legendTopMargin

                legendLabels.add(label)
                allLabels.shift()

                freeSlotX += labelIconWidth + label.w + labelsGap
                freeSlotWidth = legendWidth - freeSlotX
            }
        }
    }

    local legendHeight = min(height/2, legendTopMargin + freeSlotY + maxTextHeight + 5)

    Legend(legendWidth, legendHeight, legendLabels)
}