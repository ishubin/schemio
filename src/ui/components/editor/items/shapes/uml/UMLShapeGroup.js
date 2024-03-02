export default {
  "group": "UML",
  "shapes": [
    {
      "name": "User",
      "shapeConfig": {
        "shapeType": "templated",
        "pins": [

        ],
        "textSlots": [
          {
            "name": "body",
            "area": {
              "x": {
                "$-expr": "width * 0"
              },
              "y": {
                "$-expr": "height * 0"
              },
              "w": {
                "$-expr": "width * 1"
              },
              "h": {
                "$-expr": "height * 1"
              },
              "r": 0
            }
          }
        ],
        "primitives": [
          {
            "type": "ellipse",
            "area": {
              "x": {
                "$-expr": "width * 0.5 - height * 0.4/2"
              },
              "y": 0,
              "w": {
                "$-expr": "height*0.4"
              },
              "h": {
                "$-expr": "height*0.4"
              }
            },
            "strokeColor": {
              "$-expr": "args.strokeColor"
            },
            "strokeSize": {
              "$-expr": "1*args.strokeSize"
            },
            "strokePattern": {
              "$-expr": "args.strokePattern"
            },
            "fill": {
              "$-expr": "args.fill"
            }
          },
          {
            "type": "path",
            "transformType": "relative",
            "paths": [
              {
                "points": [
                  {
                    "t": "L",
                    "x": 0,
                    "y": 100
                  },
                  {
                    "t": "B",
                    "x": 50,
                    "y": 40,
                    "x1": -50,
                    "y1": 0,
                    "x2": 50,
                    "y2": 0
                  },
                  {
                    "t": "L",
                    "x": 100,
                    "y": 100
                  }
                ],
                "closed": true
              }
            ],
            "strokeColor": {
              "$-expr": "args.strokeColor"
            },
            "strokeSize": {
              "$-expr": "1*args.strokeSize"
            },
            "strokePattern": {
              "$-expr": "args.strokePattern"
            },
            "fill": {
              "$-expr": "args.fill"
            }
          }
        ],
        "outlines": [
          {
            "type": "ellipse",
            "area": {
              "x": {
                "$-expr": "width * 0.5 - height * 0.4/2"
              },
              "y": 0,
              "w": {
                "$-expr": "height*0.4"
              },
              "h": {
                "$-expr": "height*0.4"
              }
            }
          },
          {
            "type": "path",
            "transformType": "relative",
            "paths": [
              {
                "points": [
                  {
                    "t": "L",
                    "x": 0,
                    "y": 100
                  },
                  {
                    "t": "B",
                    "x": 50,
                    "y": 40,
                    "x1": -50,
                    "y1": 0,
                    "x2": 50,
                    "y2": 0
                  },
                  {
                    "t": "L",
                    "x": 100,
                    "y": 100
                  }
                ],
                "closed": true
              }
            ]
          }
        ],
        "includeStandardArgs": true,
        "id": "uml_user",
        "menuItems": [
          {
            "group": "UML",
            "name": "User",
            "iconUrl": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMsIDMpIj48cGF0aCBkPSJNIDcuOCA1LjIgQSA1LjIgNS4yIDAgMSAxIDE4LjIgNS4yICBBIDUuMiA1LjIgMCAxIDEgNy44IDUuMiBaIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMxMTExMTEiIHN0cm9rZS13aWR0aD0iMnB4IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTSAwIDI2IFEgMCAxMC40IDEzIDEwLjQgUSAyNiAxMC40IDI2IDI2IEwgMCAyNiAgWiAiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzExMTExMSIgc3Ryb2tlLXdpZHRoPSIycHgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L2c+PC9zdmc+",
            "size": {
              "w": 80,
              "h": 80
            },
            "previewArea": {
              "x": 0,
              "y": 0,
              "w": 150,
              "h": 150,
              "r": 0
            },
            "item": {
              "textSlots": {
                "body": {
                  "valign": "bottom",
                  "paddingBottom": 10
                }
              }
            }
          }
        ]
      }
    }
  ],
  "preview": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSItMTAgLTEwIDEyMCAxMjAiIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSIxMzBweCIgaGVpZ2h0PSIxMzBweCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwgMCkiPjxwYXRoIGQ9Ik0gMjQgMTYgQSAxNiAxNiAwIDEgMSA1NiAxNiAgQSAxNiAxNiAwIDEgMSAyNCAxNiBaIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMxMTExMTEiIHN0cm9rZS13aWR0aD0iMnB4IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTSAwIDgwIFEgMCAzMiA0MCAzMiBRIDgwIDMyIDgwIDgwIEwgMCA4MCAgWiAiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzExMTExMSIgc3Ryb2tlLXdpZHRoPSIycHgiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L2c+PC9zdmc+"
};