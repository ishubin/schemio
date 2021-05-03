export default {
  "shapeConfig": {
    "shapeType": "standard-curves",
    "scale": 100,

    menuItems: [{
        group: 'Electronic',
        name: 'Speaker',
        iconUrl: '/assets/images/items/uml-object.svg',
        item: { },
    }],

    "pins": [
      {
        "x": 13,
        "y": 25
      },
      {
        "x": 0,
        "y": 56.25
      },
      {
        "x": 13,
        "y": 83.33
      },
      {
        "x": 100,
        "y": 56.25
      }
    ],
    "textSlots": [
      {
        "name": "body",
        "area": {
          "x": -225,
          "y": -8.33,
          "w": 75,
          "h": 41.67
        }
      }
    ],
    "curves": [
      {
        "points": [
          {
            "t": "L",
            "x": -250,
            "y": -8.33
          },
          {
            "t": "L",
            "x": -175,
            "y": -41.67
          },
          {
            "t": "L",
            "x": -175,
            "y": 58.33
          },
          {
            "t": "L",
            "x": -250,
            "y": 33.33
          }
        ],
        "closed": false
      },
      {
        "points": [
          {
            "t": "L",
            "x": -250,
            "y": -41.67
          },
          {
            "t": "L",
            "x": -225,
            "y": -41.67
          },
          {
            "t": "L",
            "x": -225,
            "y": 16.67
          },
          {
            "t": "L",
            "x": -250,
            "y": 16.67
          }
        ],
        "closed": true
      }
    ],
    "outlineCurve": {
      "points": [
        {
          "t": "L",
          "x": -250,
          "y": -16.67
        },
        {
          "t": "L",
          "x": -225,
          "y": -16.67
        },
        {
          "t": "L",
          "x": -225,
          "y": -8.33
        },
        {
          "t": "L",
          "x": -150,
          "y": -41.67
        },
        {
          "t": "L",
          "x": -150,
          "y": 58.33
        },
        {
          "t": "L",
          "x": -225,
          "y": 33.33
        },
        {
          "t": "B",
          "x": -225,
          "y": 41.67,
          "x1": 0.87,
          "y1": 0.33,
          "x2": -0.87,
          "y2": -0.33
        },
        {
          "t": "L",
          "x": -250,
          "y": 41.67
        }
      ],
      "closed": true
    }
  }
}
