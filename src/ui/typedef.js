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
 * @property {String} id - unique context it. It is used so that Curve shape is able to remember initial curve point and store it in its cache temporarily.
 * @property {Boolean} moved - specifies whether item was moved
 * @property {Boolean} rotated - specifies whether item was rotated
 * @property {Boolean} resized - specifies whether item was resized
 */


/**
 * @typedef {Object} MultiItemEditBox
 * @property {String} id - unique id of edit box
 * @property {Array} items - array of items that are selected for this edit box
 * @property {Area}  area  - area of edit box
 * @property {Object} itemData  - map of item ids to custom data that is used by edit box (e.g. items originalArea, originalCurvePoints)
 * @property {Object} itemProjections - map of item ids to item projections
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

