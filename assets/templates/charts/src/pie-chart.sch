struct Label {
    id: ""
    text: ""
    x: 0
    y: 0
    w: 0
    h: 0
    fontSize: 14
}

struct PieSlice {
    id: ""
    name: ""
    value: 0
    percent: 10
    color: "#ff00ff"
    angle: 0
    labels: List()
}

func createSlices(data, initialAngle) {
    local total = 0

    data.forEach((entry, idx) => {
        total += entry.value
    })

    if (total < 0.0000001) {
        total = 0.0000001
    }


    local slices = data.map((entry) => {
        local percent = entry.value * 100 / total
        PieSlice(
            entry.id,
            entry.name,
            entry.value,
            percent,
            entry.color,
            0
        )
    })

    slices.sort((a, b) => {
        b.percent - a.percent
    })

    local allPrevPercents = 0
    slices.forEach((slice) => {
        local percent = slice.percent
        slice.angle = initialAngle + 360 * allPrevPercents / 100

        allPrevPercents += percent
    })

    slices
}

struct Legend {
    x: 0
    y: 0
    w: 0
    h: 0
    entries: List()
}

struct LegendEntry {
    id: ""
    x: 0
    y: 0
    w: 0
    h: 0
    name: ""
    color: "#FF00FFFF"
}

func buildLegend(data) {
    local maxWidth = 0
    local maxHeight = 0
    local entries = data.map((entry) => {
        local size = calculateTextSize(entry.name, font, fontSize)
        local w = size.w * 1.3
        local h = size.h * 1.3
        maxWidth = max(maxWidth, w)
        maxHeight = max(maxHeight, h)
        LegendEntry(entry.id, 0, 0, w, h, entry.name, entry.color)
    })

    local legendWidth = min(width/2, maxWidth + 40)
    local legendHeight = min(height, (maxHeight + legendSpacing * 2) * data.size)

    entries.forEach((entry, idx) => {
        entry.y = (maxHeight + legendSpacing * 2) * idx
        entry.h = maxHeight + legendSpacing * 2
    })

    Legend(width - legendWidth - padding, height/2 - legendHeight/2, legendWidth, legendHeight, entries)
}


func buildSliceLabels(slices, chartX, chartY, chartWidth, chartHeight) {
    local labels = List()
    local r = min(chartWidth, chartHeight) / 2
    local lever = r * 0.8
    if (lever < 50) {
        lever = r * 0.5
    }
    slices.forEach((slice) => {
        local nicePercent = round(slice.percent)
        local labelText = `${nicePercent}%`
        local size = calculateTextSize(labelText, font, fontSize)
        local arcSize = 2 * PI() * lever * slice.percent / 100
        local avgLabelSize = (size.w + size.h) / 2
        if (arcSize > avgLabelSize) {
            local midAngle = (270 + slice.angle + (slice.percent / 2) * 360 / 100) * PI() / 180
            local cx = cos(midAngle) * lever
            local cy = sin(midAngle) * lever
            local w = size.w * 1.3
            local h = size.h * 1.3
            local x = cx - w/2 + chartX + chartWidth/2
            local y = cy - h/2 + chartY + chartHeight/2
            labels.add(Label(`slice-label-percent-${slice.id}`, labelText, x, y, w, h, fontSize))
        }
    })
    labels
}

local slices = createSlices(data, initialAngle)

local legend = buildLegend(data)

local chartWidth = max(1, width - legend.w - padding*3)
local chartHeight = max(1, height - padding*2)
local sliceLabels = buildSliceLabels(slices, padding, padding, chartWidth, chartHeight)