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
 * @property {Array<Item>} items - array of items that are selected for this edit box
 * @property {Set} itemIds - ids of items that are included in the edit box
 * @property {ItemArea}  area  - area of edit box
 * @property {Object} itemData  - map of item ids to custom data that is used by edit box (e.g. items originalArea, originalCurvePoints)
 * @property {Object} itemProjections - map of item ids to item projections
 * @property {String|undefined} templateRef - a reference to a template that was used to generate templated items
 * @property {Item|undefined} templateItemRoot - the root of templated item on scene
 * @property {Array<ConnectorPointProjection>} connectorPoints
 * @property {Map<String,ConnectorAttachments} connectorOriginalAttachments - stores original attachment data of connectors.
 * @property {Map<String,Object} cache - used for temporary storage of various objects (for now this is used for reattaching connectors to the same spot)
 * This is used for reattaching and detaching the connector during edit box movements
 */


/**
 * @typedef {Object} TextSlot
 * @property {String} name
 * @property {Area} area
 */

/**
 * @typedef {Object} ShapePin
 * @property {String} id
 * @property {Number} x
 * @property {Number} y
 * @property {Number|undefined} nx - x part of pin normal
 * @property {Number|undefined} ny - y part of pin normal
 */

/**
 * @typedef {Object} ShapeMenuItem
 * @property {String} group
 * @property {String} name
 * @property {String|undefined} description
 * @property {String} iconUrl
 * @property {Object} item
 * @property {Area} previewArea
 * @property {Object} size
 */


/**
 * @typedef {Object} Shape
 * @property {function(Item): Array<TextSlot>} getTextSlots
 * @property {function(Item): Array<ShapePin>} getPins
 * @property {function(Item): Array<ShapeSVGPrimitive>} computePrimitives
 * @property {function(Item): String} computePath
 * @property {function(Item): String} computeOutline
 * @property {Array<ShapeMenuItem>} menuItems
 */

/**
 * @typedef {Object} ShapeConfig
 * @property {Shape} shapeConfig
 */

/**
 * @typedef {Object} ItemBehavior
 * @property {Array} events
 */

/**
 * Various information about the item that is needed all over the place in various editor components
 * This structure is created in SchemeContainer during items reindex
 * @typedef {Object} ItemMeta
 * @property {String|undefined} parentId
 * @property {Array<String>} ancestorIds
 * @property {String|undefined} ancestorDraggableId - id of ancestor item that is draggable. This is used to allow dragging of parent items by their children
 * @property {Array<Array<Number>} transformMatrix
 * @property {Number} revision - used for registering update of the item so that some editor components could be reloaded
 * @property {Boolean} componentRoot - true if the current item is the root of the component
 * @property {Boolean} componentLoadFailed - true if loading of component has failed
 * @property {Boolean} isInHUD - true if item is located in HUD
 * @property {Boolean} calculatedVisibility - true if it is visibile, false if item is either has visible set to false or is placed in the item that is hidden
 * @property {Number} collapseBitMask
 * @property {Boolean} collapsed
 * @property {Boolean} templated
 * @property {String|undefined} templateRef
 * @property {String|undefined} templateRootId
 */

/**
 * @typedef {Object} ItemArgs
 * @property {Object|undefined} customVars - used by Script function for storing script variables in item
 * @property {String|undefined} templateRef - reference to template that was used to generate this item.
 *                                            Also works as an indicator that this item is a template root
 * @property {String|undefined} templatedId - id that was created from the template. It is used to track the items after they were generated from template
 * @property {Object|undefined} templateArgs - args that were used for generating the templated item
 */


/**
 * @typedef {Object} Item
 * @property {String} id
 * @property {String} name
 * @property {ItemArgs} args
 * @property {ItemMeta} meta
 * @property {String} description
 * @property {ItemArea} area
 * @property {String} shape
 * @property {String} blendMode
 * @property {Object} shapeProps
 * @property {Number} opacity
 * @property {Array}  links
 * @property {Object} textSlots
 * @property {ItemBehavior} behavior
 * @property {Array<Item>} childItems
 * @property {Array<Item>} _childItems - child items that were mounted as part of dynamic component. These items are not shown as editable int the editor
 */


 /**
  * @typedef {Object} ScreenTransform
  * @property {Number} x - offset on X axis
  * @property {Number} y - offset on Y axis
  * @property {Number} scale - scale of the zoom where 1.0 is normal zoom.
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
 * @property {String} pinId - id of items attachment pin.
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

/**
 * @typedef {Object} GradientPoint
 * @property {}
 */

/**
 * @typedef {Object} Gradient
 * @property {Array<GradientPoint} colors - array of gradient points
 * @property {String} type - gradient type. Can be "linear" or "radial"
 * @property {Number} direction - specifies the rotation degrees of liner gradient vector. Used only for "linear" type.
 */

/**
 * @typedef {Object} AdvancedColor
 * @property {String} type - can be "none", "solid", "image", "gradient"
 * @property {String} color - used for "solid" type
 * @property {String} image - path to image for "image" type
 * @property {Boolean} stretch - specified whether the image should be stretched to fit item area
 * @property {Area} imageBox - represents the cropping area of the image. Used only with "image" type
 * @property {Gradient} gradient - gradient struct for "gradient" type
 */

/**
 * A struct that represents a single path with its own fill and stroke
 * @typedef {Object} StandardCurvePath
 * @property {String} path - SVG path formatted string (e.g. "M 0 100 L 400 500")
 * @property {AdvancedColor} fill - fill of the path
 * @property {String} strokeColor
 * @property {Number} strokeSize
 * @property {String} strokePattern
 */


/**
 * @typedef {Object} SchemioPathPoint
 * @property {String} id
 * @property {String} t - type of point can be 'L' (line), 'B' (beizer) or 'A' (arc)
 * @property {Number} x
 * @property {Number} y
 * @property {Number} x1 - used only for beizer point types
 * @property {Number} y1 - used only for beizer point types
 * @property {Number} x2 - used only for beizer point types
 * @property {Number} y2 - used only for beizer point types
 * @property {Number} h - used only for arc point types
 */

/**
 * @typedef {Object} SchemioPath
 * @property {String} id
 * @property {Boolean} closed
 * @property {Array<SchemioPathPoint>} points
 */


/**
 * Represents raw uncompiled templated shape definition
 * @typedef {Object} TemplatedShapeConfig
 * @property {String} id
 * @property {String} shapeType
 * @property {String|Array<String>} init
 * @property {Array<Object>} menuItems
 * @property {Object} args
 * @property {Array<Object>} pins
 * @property {Array<Object>} paths
 * @property {Array<Object>} outlines
 * @property {Array<Object>} controlPoints
 * @property {Array<Object>} textSlots
 * @property {Boolean} includeStandardArgs
 */

/**
 * @typedef {Object} TemplatedShape
 * @property {TemplatedShapeConfig} shapeConfig
 */


/**
 * @typedef {Object} ShapePrimitive
 * @property {AdvancedColor} fill
 * @property {String} strokeColor
 * @property {Number} strokeSize
 * @property {String} strokePattern
 * @property {String} type - supported types are "path", "rect", "ellipse"
 * @property {Array<SchemioPath>|undefined} paths
 * @property {Area|undefined} area - area that is used for non-path primitives (e.g. ellipse, rect or text)
 * @property {String|undefined} transformType - can be one of the two: "absolute" or "relative". Only used for "path" or "text" types
 * @property {String|undefined} fontColor - color of a text primitive
 * @property {Number|undefined} fontSize - font size of a text primitive
 */

/**
 * Used to build svg out of the compiled shape primitive
 * @typedef {Object} ShapeSVGPrimitive
 * @property {AdvancedColor} fill
 * @property {String} strokeColor
 * @property {Number} strokeSize
 * @property {String} strokePattern
 * @property {String} type
 * @property {String|undefined} svgPath
 * @property {String|undefined} text
 * @property {Number} fontSize
 * @property {String} fontColor
 * @property {Area} area
 */

/**
 * @typedef {Object} ItemMenuEntry
 * @property {Item} item
 * @property {String} name
 * @property {Area|undefined} previewArea
 */


/**
 * @typedef {Object} ItemTemplateControl
 * @property {String} name
 * @property {String} type - for now only "button" is supported
 * @property {String} text
 * @property {Number} x
 * @property {Number} y
 * @property {Number} width
 * @property {Number} height
 * @property {Array<String>|String} click - SchemioScript expressions which will be invoked once the user clicks this template button in edit mode
 */

/**
 * Represents uncompiled template of an item
 * @typedef {Object} ItemTemplate
 * @property {String} name
 * @property {String} description
 * @property {Object} args
 * @property {Array<String>|String|undefined} init
 * @property {String} preview
 * @property {Item} item
 * @property {Array<ItemTemplateControl>|undefined} controls
 */

/**
 * @typedef {Object} CompiledItemTemplate
 * @property {String} templateRef
 * @property {ItemArea} defaultArea - the default area of the root of the templated item that will be used when templated item is dragged from ment into scene
 * @property {String|undefined} preview - dataURL embedded preview of templated item
 * @property {String} name
 * @property {String} description
 * @property {Object} args - contains template argument descriptors
 * @property {Object} defaultArgs - contains args object with default values
 * @property {function(Object, number, number, String, ...Object): Item} triggerEvent
 * @property {function(Object, number, number): Item} buildItem
 * @property {function(Object): Array<ItemTemplateControl>} buildControls
 * @property {function(): Object} getDefaultArgs - returns the object with default arg values
 */


/**
 * @callback TraverseItemCallback
 * @param {Item} item
 * @param {Item|undefined} parentItem
 * @param {Number} sortOrder - position index in the parent item array
 * @returns {Boolean} true if it should keeps traversing items
 */