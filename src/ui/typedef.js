/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * A point on svg path, contains coords + distance on the path that was can be used to calculate this point again
 * @typedef {Object} SVGPathPoint
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 * @property {number} distance - distance on the SVG path
 */

/**
 * @typedef {Object} Point
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 */

/**
 * @typedef {Object} Area
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 * @property {number} w - width
 * @property {number} h - height
 */

/**
 * @typedef {Object} ItemArea
 * @property {number} x - x coordinate
 * @property {number} y - y coordinate
 * @property {number} w - width
 * @property {number} h - height
 * @property {number} r - rotation in degrees
 * @property {number} px - pivot point on x axis (relatively to area width)
 * @property {number} py - pivot point on y axis (relatively to area width)
 * @property {number} sx - scale x axis
 * @property {number} sy - scale y axis
 */

/**
 * @typedef {Object} Line - line object that represents line equation in form of ax + by + c = 0
 * @property {Number} a
 * @property {Number} b
 * @property {Number} c
 */


/**
 * A context that is used to determine what kind of operations were done to an item
 * @typedef {Object} ItemModificationContext
 * @property {String} id - unique context it. It is used so that Path shape is able to remember initial curve point and store it in its cache temporarily.
 * @property {Boolean} moved - specifies whether item was moved
 * @property {Boolean} rotated - specifies whether item was rotated
 * @property {Boolean} resized - specifies whether item was resized
 * @property {Boolean} controlPoint - specifies whether items control point was moved
 */

/**
 * A reference to a connector point
 * @typedef {Object} ConnectorPointRef
 * @property {String} itemId - id of connector item
 * @property {Number} pointIdx - index of the point in the connector
 */

/**
 * A connector point with world x and y and reference to a point in connector points array
 * @typedef {Object} ConnectorPointProjection
 * @property {Number} x - world x
 * @property {Number} y - world y
 * @property {String} itemId - id of connector item
 * @property {Number} pointIdx - index of the point in the connector
 * @property {Point} projection - projected point on edit box
 */

/**
 * A connector attachments for source and destination points
 * @typedef {Object} ConnectorAttachments
 * @property {String} sourceItem - element selector for another item for attachment on first point
 * @property {Number} sourceItemPosition - distance on path on source item
 * @property {String} destinationItem - element selector for another item for attachment of last point
 * @property {Number} destinationItemPosition - distance on path on destination item
 * @property {Point} sourceProjection - projection of the world source point to edit box area
 * @property {Point} destinationProjection - projection of the world destination point to edit box area
 */

/**
 * @typedef {Object} EditBox
 * @property {String} id - unique id of edit box
 * @property {Array} items - array of items that are selected for this edit box
 * @property {Set} itemIds - ids of items that are included in the edit box
 * @property {ItemArea}  area  - area of edit box
 * @property {Object} itemData  - map of item ids to custom data that is used by edit box (e.g. items originalArea, originalCurvePoints)
 * @property {Object} itemProjections - map of item ids to item projections
 * @property {Array<ConnectorPointProjection>} connectorPoints
 * @property {Map<String,ConnectorAttachments} connectorOriginalAttachments - stores original attachment data of connectors.
 * @property {Map<String,Object} cache - used for temporary storage of various objects (for now this is used for reattaching connectors to the same spot)
 * This is used for reattaching and detaching the connector during edit box movements
 */

/**
 * @typedef {Object} Shape
 * @property {Function} getTextSlots
 * @property {Function} getPins
 */


/**
 * @typedef {Object} ItemBehavior
 * @property {Array} events
 */

/**
 * @typedef {Object} Item
 * @property {String} id
 * @property {String} name
 * @property {String} description
 * @property {Area}   area
 * @property {String} shape
 * @property {String} blendMode
 * @property {Object} shapeProps
 * @property {Number} opacity
 * @property {Array}  links
 * @property {Object} textSlots
 * @property {ItemBehavior} behavior
 */

 /**
  * @typedef {Object} ScreenTransform
  * @property {Number} x - offset on X axis
  * @property {Number} y - offset on Y axis
  * @property {Number} scale - scale of the zoom where 1.0 is normal zoom.
  */


/**
 * @interface SchemeContainer
 */
/**
 * @function
 * @name SchemeContainer#addItem
 * @param {Item} item
 */


 /**
  * @typedef {Object} ItemSnapper
  * @property {Number} value - world value to which it should snap
  * @property {String} snapperType - type of a snapper (e.g. "horizontal", "vertical")
  * @property {Item} item - item to which it snaps value
  */


 /** 
  * Interface for snapping points on X and Y axis. Used for snapping to grid
  * @interface Snapper
  */
 /**
  * @function
  * @name Snapper#snapPoints
  * @param {Number} x - value on X axis which should be snapped
  */

/**
 * @typedef {Object} ItemClosestPoint
 * @property {Number} x - value on x axis
 * @property {Number} y - value on y axis
 * @property {Number} distanceOnPath - distance on the item path from its beginning to the closest point on that path
 * @property {String} itemId - id of item
 * @property {Number} nx - normal x, may be undefined if the pin does not have normal
 * @property {Number} ny - normal y, may be undefined if the pin does not have normal
 */


/**
 * @typedef {Object} SnappingPoints
 * @property {Array} vertical - array of points for vertical snapping
 * @property {Array} horizontal - array of points for horizontal snapping
 */

/**
 * @typedef {Object} Offset
 * @property {Number} dx
 * @property {Number} dy
 */

