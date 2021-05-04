export default {
  "shapeConfig": {
    id: 'el-speaker',
    "shapeType": "standard-curves",
    "scale": 100,

    menuItems: [{
      group: 'Electronic',
      name: 'Speaker',
      iconUrl: '/assets/images/items/uml-package.svg',
    }],
    "pins": [
      {
        "x": 10,
        "y": 25
      },
      {
        "x": 0,
        "y": 50
      },
      {
        "x": 80,
        "y": 50
      },
      {
        "x": 10,
        "y": 75
      }
    ],
    "textSlots": [
      {
        "name": "Text",
        "area": {
          "x": 20,
          "y": 25,
          "w": 60,
          "h": 50
        }
      }
    ],
    "curves": [
      {
        "points": [
          {
            "t": "L",
            "x": 20,
            "y": 41.67
          },
          {
            "t": "L",
            "x": 80,
            "y": 0
          },
          {
            "t": "L",
            "x": 80,
            "y": 100
          },
          {
            "t": "L",
            "x": 20,
            "y": 58.33
          }
        ],
        "closed": false
      },
      {
        "points": [
          {
            "t": "L",
            "x": 0,
            "y": 25
          },
          {
            "t": "L",
            "x": 20,
            "y": 25
          },
          {
            "t": "L",
            "x": 20,
            "y": 75
          },
          {
            "t": "L",
            "x": 0,
            "y": 75
          }
        ],
        "closed": true
      }
    ],
    "outlineCurve": {
      "points": [],
      "closed": true,
      "useFill": false,
      "useStroke": false,
      "strokeFill": false
    }
  }
}
