import forEach from 'lodash/forEach';
import filter from 'lodash/filter';
import map from 'lodash/map';
import myMath from '../../../../myMath';
import { Logger } from '../../../../logger';

const logger = new Logger('SmartShapeClassifier');

function createLineAnalysis(p1, p2, bbox) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    let isVertical = false;
    let isHorizontal = false;
    let isFull = false;
    if (bbox.w > 1) {
        if (Math.abs(dx / bbox.w) < 0.1 || Math.abs(dx) < 30) {
            isVertical = true;
            if (bbox.h > 1 && Math.abs(dy / bbox.h) >= 0.7) {
                isFull = true;
            }
        }
    }

    if (bbox.h > 1) {
        if (Math.abs(dy / bbox.h) < 0.1 || Math.abs(dy) < 30) {
            isHorizontal = true;
            if (bbox.w > 1 && Math.abs(dx / bbox.w) >= 0.7) {
                isFull = true;
            }
        }
    }

    if (!isVertical && !isHorizontal) {
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared > 1) {
            const length = Math.sqrt(lengthSquared);
            const averageSize = (bbox.w + bbox.h) / 2;
            if (averageSize > 1) {
                isFull = length / averageSize > 0.7;
            }
        }
    }

    return {
        isVertical,
        isHorizontal,
        isFull,
        p1, p2
    };
}

function analyzeSingleCurve(points, bbox) {

    const angles = [];

    const simpleLinePoints = [points[0]];
    
    for (let i = 1; i < points.length - 1; i++) {
        const prevPoint = points[i - 1];
        const point = points[i];
        const nextPoint = points[i + 1];
        const Ax = prevPoint.x - point.x;
        const Ay = prevPoint.y - point.y;
        const Bx = nextPoint.x - point.x;
        const By = nextPoint.y - point.y;
        
        const angle = myMath.angleBetweenVectors(Ax, Ay, Bx, By) * 180 / Math.PI;
        if (Math.abs(angle) > 30) {
            simpleLinePoints.push(point);
        }
        angles.push(angle);
    }


    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const averageCurveSize = (bbox.w + bbox.h ) / 2;
    const proximityMax = averageCurveSize / 7;

    const dSquared = (firstPoint.x - lastPoint.x)*(firstPoint.x - lastPoint.x) + (firstPoint.y - lastPoint.y)*(firstPoint.y - lastPoint.y);
    let isJoined = dSquared < proximityMax*proximityMax && points.length > 2;

    // checking whether the starting and end points are located too far away from each other
    // we do it by checking whether the distance is at least greater than 50 % of bbox width or height
    let endsFarAway = false;
    if (dSquared > 0.1) {
        const d = Math.sqrt(dSquared);
        if ((bbox.w > 1 &&  d / bbox.w >= 0.5 )
            || (bbox.h > 1 &&  d / bbox.h >= 0.5 )) {
            endsFarAway = true;
        }
    }
    
    if (isJoined) {
        // treat it like it can merge its points and add another angle
        const prevPoint = points[points.length - 2];
        const point = {
            x: (firstPoint.x + lastPoint.x) / 2,
            y: (firstPoint.y + lastPoint.y) / 2
        }
        const nextPoint = points[1];
        const Ax = prevPoint.x - point.x;
        const Ay = prevPoint.y - point.y;
        const Bx = nextPoint.x - point.x;
        const By = nextPoint.y - point.y;
        angles.push(myMath.angleBetweenVectors(Ax, Ay, Bx, By) * 180 / Math.PI);

        simpleLinePoints.push(lastPoint);
    }


    const simpleLines = [];
    
    let verticalFullLines = 0;
    let horizontalFullLines = 0;
    let totalFullLines = 0;
    let isStraightLine = false;
    if (simpleLinePoints.length > 1) {
        for (let i = 1; i < simpleLinePoints.length; i++) {
            const line = createLineAnalysis(simpleLinePoints[i-1], simpleLinePoints[i], bbox);

            if (line.isFull) {
                totalFullLines += 1;
            }

            if (line.isFull && line.isHorizontal) {
                horizontalFullLines += 1;
            }
            if (line.isFull && line.isVertical) {
                verticalFullLines += 1;
            }
            simpleLines.push(line);
        }
    } else {
        // check if maybe this is actually just a straight line
        // if we sum all small angles then the end result should not be too big
        let angleSum = 0;
        forEach(angles, angle => {
            angleSum += angle;
        });
        if (Math.abs(angleSum)  < 50) {
            isStraightLine = true;
            const lineInfo = createLineAnalysis(points[0], points[points.length - 1], bbox);
            if (lineInfo.isFull){
                totalFullLines += 1;
                if (lineInfo.isHorizontal) {
                    horizontalFullLines += 1;
                }
                if (lineInfo.isVertical) {
                    verticalFullLines += 1;
                }
            }
        }
    }

    return {
        endsFarAway,
        isJoined,
        isStraightLine,
        angles,
        simpleLines,
        verticalFullLines,
        horizontalFullLines,
        totalFullLines,
    };
}


function getBbox(points) {
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    forEach(points, (point, i) => {
        if (minX > point.x) {
            minX = point.x;
        }
        if (minY > point.y) {
            minY = point.y;
        }
        if (maxX < point.x) {
            maxX = point.x;
        }
        if (maxY < point.y) {
            maxY = point.y;
        }
    });

    return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
    }
}

function analyzeCurve(points, bbox) {
    let currentCurvePoints = [];
    const curves = []
    curves.push(currentCurvePoints);

    forEach(points, (point, i) => {
        if (point.break) {
            currentCurvePoints = [];
            curves.push(currentCurvePoints);
        }
        currentCurvePoints.push(point);
    });
    
    return map(curves, curvePoints => analyzeSingleCurve(curvePoints, bbox));
}


function isSameOrientation(angles) {
    let sign = 0;
    let sameOrientation = true;

    forEach(angles, angle => {
        if (angle > 0) {
            if (sign === 0) {
                sign = 1;
            } else if (sign !== 1) {
                sameOrientation = false;
            }
        } else {
            if (sign === 0) {
                sign = -1;
            } else if (sign !== -1){
                sameOrientation = false;
            }
        }
    });
    return sameOrientation;
}

class WeightedScore {
    constructor() {
        this.items = [];
    }

    add(weight, value) {
        this.items.push({
            weight, value
        });
        return this;
    }

    getScore() {
        let totalWeight = 0;
        let totalValue = 0;
        forEach(this.items, item => {
            totalWeight += item.weight;
            totalValue += item.weight * item.value;
        });
        
        if (totalWeight > 0) {
            return totalValue / totalWeight;
        }
        return 0;
    }
}


/*
rect classification:
- has 4 90 degree angles in the same orientation
- 5th largest angle should be less than 30 degrees
- should have first and last point close to each other
- has 2 vertical lines
- has 2 horizontal lines
*/

function checkRect(points, curvesInfo) {
    
    let angleScore = 0;
    const bigAngles = filter(curvesInfo[0].angles, angle => Math.abs(angle) > 40);
    if (bigAngles.length < 5) {
        if (isSameOrientation(bigAngles)) {
            forEach(bigAngles, angle => {
                angleScore += Math.abs(angle) / 90;
            });
            angleScore = angleScore / 4;
        }
    }

    return {
        score: new WeightedScore()
            .add(2, angleScore)
            .add(2, curvesInfo[0].isJoined ? 1: -0.4)
            .add(1, curvesInfo[0].horizontalFullLines == 2 ? 1: 0)
            .add(1, curvesInfo[0].verticalFullLines == 2 ? 1: 0)
            .getScore(),
        shape: 'rect'
    };
}


/*
ellipse classification:
- majority of angles are of the same orientation
- majority of angles are 5 < 35 degrees
- majority of points are away from the center
- has no simple lines
*/

function checkEllipse(points, curvesInfo) {
    let angleScore = 0;
    if (curvesInfo.length === 1 && curvesInfo[0].angles.length > 6) {
        let leftAngles = 0;
        let rightAngles = 0;
        let largeAngles = 0;
        forEach(curvesInfo[0].angles, angle => {
            if (angle < 0) {
                leftAngles++;
            } else {
                rightAngles++;
            }

            if (Math.abs(angle) > 50) {
                largeAngles++;
            }
        });

        // checking that majority of angles are in the same direction
        const min = Math.min(leftAngles, rightAngles);
        const max = Math.max(leftAngles, rightAngles);
        if ((max - min) / (leftAngles + rightAngles) > 0.7) {
            angleScore = (leftAngles + rightAngles - largeAngles) / (leftAngles + rightAngles);
        }
    }

    return {
        score: new WeightedScore()
            .add(2, angleScore)
            .add(1, curvesInfo[0].isJoined ? 1: -0.4)
            .add(1, curvesInfo[0].horizontalFullLines == 0 ? 0.5: -0.2)
            .add(1, curvesInfo[0].verticalFullLines == 0 ? 0.5: -0.2)
            .getScore(),
        shape: 'ellipse'
    };
}

/*
diamond classification:
- has 4 90 degree angles in the same orientation
- 5th largest angle should be less than 30 degrees
- should have first and last point close to each other
- has 2 diagonal lines in one direction
- has 2 diagonal lines in another direction
*/

function checkDiamond(points, curvesInfo) {
    
    let angleScore = 0;
    const bigAngles = filter(curvesInfo[0].angles, angle => Math.abs(angle) > 40);
    const angleSameOrientation = isSameOrientation(bigAngles);
    if (bigAngles.length < 5) {
        if (angleSameOrientation) {
            forEach(bigAngles, angle => {
                angleScore += Math.abs(angle) / 90;
            });
            angleScore = angleScore / 4;
        }
    }

    return {
        score: new WeightedScore()
            .add(2, angleScore)
            .add(2, curvesInfo[0].isJoined ? 1: -0.5)
            .add(2, bigAngles.length === 4 ? 1: -0.5)
            .add(1, angleSameOrientation? 1: -0.5)
            .add(2, curvesInfo[0].totalFullLines == 4 ? 1: -0.5)
            .add(1, curvesInfo[0].horizontalFullLines == 0 ? 1: -1)
            .add(1, curvesInfo[0].verticalFullLines == 0 ? 1: -1)
            .getScore(),
        shape: 'basic_diamond'
    };
}

function checkObject(points, curvesInfo) {
    let score = 0;
    if (curvesInfo.length === 2) {
        // checking that the first curve is a rect
        let rectScore = checkRect(points, [curvesInfo[0]]).score;

        // checking that the second curve is a horizontal line

        if (curvesInfo[1].isStraightLine && curvesInfo[1].horizontalFullLines === 1) {
            // if the rect was perfectly drawn then we just need to increase its score to make sure the uml_object will be selected
            score = rectScore * 1.1;
        }
    }

    return {
        score,
        shape: 'uml_object'
    }
}

const shapeClassifiers = [
    checkRect,
    checkEllipse,
    checkDiamond,
    checkObject,
];


/**
 * Tries to bring curve to 200x200 area
 * 
 * @param {*} points 
 * @param {*} bbox 
 * @returns 
 */
function normalizePoints(points, bbox) {
    const targetWidth = 200;
    const targetHeight = 200;
    if (bbox.w > 10 && bbox.h > 10) {
        const Rw = targetWidth / bbox.w;
        const Rh = targetHeight / bbox.h;

        const newPoints = [];
        forEach(points, point => {
            newPoints.push({
                x: (point.x - bbox.x) * Rw,
                y: (point.y - bbox.y) * Rh,
                break: point.break
            });
        });

        return {
            points: newPoints,
            bbox: {
                x: 0,
                y: 0,
                w: targetWidth,
                h: targetHeight,
            }
        };
    }

    return {
        points,
        bbox
    };
}


const _triangleSequences = [
    '1022', '2011', '222', '111', '011', '022'
];
const _arrowSequences = [
    '102', '201', '001', '002'
];

function analyzeConnectorCap(points, idxStart, idxEnd) {
    // first it walks over the points of the cap and encodes angles between the edges in those points
    // arrow and triangle have a distinct angle sequence, so it checks the sequence of sharp angles with direction
    const smallAngleThreshold = 14;
    let angles = '';
    for (let i = Math.max(1, idxStart); i < idxEnd ; i++) {
        const prevPoint = points[i - 1];
        const point = points[i];
        const nextPoint = points[i + 1];
        const Ax = prevPoint.x - point.x;
        const Ay = prevPoint.y - point.y;
        const Bx = nextPoint.x - point.x;
        const By = nextPoint.y - point.y;
        
        const angle = myMath.angleBetweenVectors(Ax, Ay, Bx, By) * 180 / Math.PI;
        if (angle <= -smallAngleThreshold) {
            angles += '1'
        } else if (angle >= smallAngleThreshold) {
            angles += '2';
        } else {
            angles += '0';
        }
    }


    for (let i = 0; i < _triangleSequences.length; i++) {
        if (angles.indexOf(_triangleSequences[i]) >= 0) {
            return 'triangle';
        }
    }
    
    for (let i = 0; i < _arrowSequences.length; i++) {
        if (angles.indexOf(_arrowSequences[i]) >= 0) {
            return 'arrow';
        }
    }
    return 'empty';
}

/**
 * This function analyzes points at the end of the connector and it tries to identify whether user has drawn an arrow or a triangle
 * It does it by calculating moving bounding box from end to the beginning and checks whether it grows slow or fast
 * @param {*} points 
 * @returns 
 */
function analyzeConnectorDestinationCap(points) {
    if (points.length < 3) {
        return null;
    }
    
    const movingBox = {
        x: points[points.length - 1].x,
        y: points[points.length - 1].y,
        w: 0,
        h: 0
    };

    let capStartIdx = -1;

    const firstPoint = points[0];

    let furthestPoint = null;
    let furthestDistance = 0;

    for (let i = points.length - 1; i > 0; i--) {
        const point = points[i];
        if (movingBox.x > point.x) {
            const oldX = movingBox.x;
            movingBox.x = point.x;
            movingBox.w = oldX + movingBox.w - point.x;
        } else if (movingBox.x + movingBox.w < point.x) {
            movingBox.w = point.x - movingBox.x;
        }
        if (movingBox.y > point.y) {
            const oldY = movingBox.y;
            movingBox.y = point.y;
            movingBox.h = oldY + movingBox.h - point.y;
        } else if (movingBox.y + movingBox.h < point.y) {
            movingBox.h = point.y - movingBox.y;
        }
        
        //TODO use zoom scale here, users could draw this when zoom out or zoomed in
        // also this is probably not going to work very well with small connectors
        if (movingBox.w + movingBox.h > 200) {
            break;
        } else {
            capStartIdx = i;
            if (!furthestPoint) {
                furthestPoint = point;
                furthestDistance = (point.x - firstPoint.x) *(point.x - firstPoint.x) + (point.y - firstPoint.y) *(point.y - firstPoint.y);
            } else {
                const d = (point.x - firstPoint.x) *(point.x - firstPoint.x) + (point.y - firstPoint.y) *(point.y - firstPoint.y);
                if (d > furthestDistance) {
                    furthestDistance = d;
                    furthestPoint = point;
                }
            }
        }
    }

    if (capStartIdx > 0 && capStartIdx < points.length - 1) {
        const connectorCap = analyzeConnectorCap(points, capStartIdx, points.length - 1);


        return {
            capStartIndex: capStartIdx,
            replacementPoint: furthestPoint,
            capType: connectorCap
        }
    }
    return null;
}

function convertPointsToConnector(points, bbox) {
    const connectorPoints = [];
    let capPoints = null;
    
    for(let i = 0; i < points.length; i++) {
        if (points[i].break) {
            capPoints = [];
            for (let j = i; j < points.length; j++) {
                capPoints.push({
                    x: points[j].x - bbox.x,
                    y: points[j].y - bbox.y
                });
            }
            break;
        }

        connectorPoints.push({
            x: points[i].x - bbox.x,
            y: points[i].y - bbox.y,
        });
    }

    let destinationCap = 'empty';

    if (!capPoints) {
        const capInfo = analyzeConnectorDestinationCap(connectorPoints);
        if (capInfo) {
            destinationCap = capInfo.capType;
            // removing all points
            connectorPoints.splice(capInfo.capStartIndex, connectorPoints.length - capInfo.capStartIndex);
            connectorPoints.push(capInfo.replacementPoint);
        }
    }


    if (connectorPoints.length > 1 && capPoints && capPoints.length > 1) {
        const lastPoint = connectorPoints[connectorPoints.length - 1];
        const capBbox = getBbox(capPoints);

        if (capBbox.w > 2 && capBbox.h > 2) {
            let capIsClosed = false;

            if (capPoints.length > 2) {
                if (myMath.distanceBetweenPoints(capPoints[0].x, capPoints[0].y, capPoints[capPoints.length - 1].x, capPoints[capPoints.length - 1].y) < 20) {
                    capIsClosed = true;
                }
            }

            if (myMath.isPointInArea(lastPoint.x, lastPoint.y, capBbox)) {
                destinationCap = capIsClosed ? 'triangle' : 'arrow';
            } else {
                for(let i = 0; i < capPoints.length; i++) {
                    const d = myMath.distanceBetweenPoints(lastPoint.x, lastPoint.y, capPoints[i].x, capPoints[i].y);
                    if (d < 30) {
                        destinationCap = capIsClosed ? 'triangle' : 'arrow';
                        break;
                    }
                }
            }
        }
    }

    return {
        shape: 'connector',
        shapeProps: {
            points: connectorPoints,
            destinationCap
        },
        score: 1.0
    };
}


export function identifyShape(points) {
    let maxScore = 0;
    let bestResult = null;
    
    const bbox = getBbox(points);
    const normalized = normalizePoints(points, bbox);

    const curvesInfo = analyzeCurve(normalized.points, normalized.bbox);
    logger.info('Curve analysis', curvesInfo);
    
    if (curvesInfo[0].endsFarAway) {
        logger.info('Ends are too far away, looks like we have a connector');
        return convertPointsToConnector(points, bbox);

    } else {
        forEach(shapeClassifiers, shapeClassifier => {
            const result = shapeClassifier(normalized.points, curvesInfo);
            logger.info('Shape Classification', result.shape, result.score);
            if (result.score > maxScore) {
                bestResult = result;
                maxScore = result.score;
            }
        });
    }
    return bestResult;
}