import myMath from "../myMath";

const SchemioScriptMath = {
    PI                     : Math.PI,
    createLineEquation     : myMath.createLineEquation,
    distanceFromPointToLine: myMath.distanceFromPointToLine,
    linesIntersection      : myMath.linesIntersection,
    sideAgainstLine        : myMath.identifyPointSideAgainstLine,
    solveQuadratic         : myMath.solveQuadratic,
};

export default SchemioScriptMath;