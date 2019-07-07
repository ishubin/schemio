/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import State from './State.js';
import EventBus from '../EventBus.js';
import shortid from 'shortid';

export default class StateConnecting extends State {
    constructor(editor) {
        super(editor);
        this.name = 'connecting';
        this.component = null;
        this.schemeContainer = editor.schemeContainer;
        this.sourceItem = null;
        this.hoveredItem = null;
        this.connector = null;
    }

    reset() {
        this.sourceItem = null;
        this.hoveredItem = null;
        this.connector = null;
    }
    
    cancel() {
        if (this.connector && !this.connector.itemId) {
            this.connector.reroutes.pop();
        }
        super.cancel();
    }

    mouseMove(x, y, mx, my, object, event) {
        if (object && object.item) {
            this.hoveredItem = object.item;
        } else {
            this.hoveredItem = null;
        }
        if (this.connector) {
            this.connector.reroutes[this.connector.reroutes.length - 1].x = x;
            this.connector.reroutes[this.connector.reroutes.length - 1].y = y;
            if (this.hoveredItem) {
                this.connector.itemId = this.hoveredItem.id;
                this.connector.reroutes[this.connector.reroutes.length - 1].disabled = true;
            } else {
                this.connector.itemId = null;
                this.connector.reroutes[this.connector.reroutes.length - 1].disabled = false;
            }
            this.schemeContainer.buildConnector(this.sourceItem, this.connector);
        }
    }

    mouseDown(x, y, mx, my, object, event) {
        if (object && object.item) {
            if (this.sourceItem) {
                this.connector.itemId = object.item.id;
                if (this.connector.reroutes.length > 0) {
                    this.connector.reroutes.pop();
                }
                this.schemeContainer.buildConnector(this.sourceItem, this.connector);
                this.reset();
                this.cancel();
            }
        } else {
            this.connector.reroutes[this.connector.reroutes.length - 1].x = x;
            this.connector.reroutes[this.connector.reroutes.length - 1].y = y;
            this.connector.reroutes.push({x, y});
            this.schemeContainer.buildConnector(this.sourceItem, this.connector);
        }
    }

    setSourceItem(item) {
        this.sourceItem = item;

        if (!this.sourceItem.connectors) {
            this.sourceItem.connectors = [];
        }
        this.connector = {
            id: shortid.generate(),
            reroutes: [{
                x: item.area.x, y: item.area.y
            }],
            style: {
                color: "#333",
                width: 1,
                pattern: "line",
                source: {
                    type: "empty",
                    size: 5
                },
                destination: {
                    type: "arrow",
                    size: 5
                },
                smooth: false
            }
        }
        this.schemeContainer.buildConnector(item, this.connector);
        this.sourceItem.connectors.push(this.connector);
    }
}
