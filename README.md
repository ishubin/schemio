Schemio
--------------------

Schemio is a web based service for creating and viewing schemes online. It lets you design any scheme you want, link items to other schemes and provide description for each item. The basic idea behind Schemio is to provide visual and structured documentation so anyone can get a good understanding of a project.




```js
"behavior": [ {
    "on": {
    "entity": {
        "item": "self"
    },
    "event": "Frame-1",
    "args": [ ]
    },
    "do": [ {
        "entity": {
            "item": "some-id232313",
            "connector": "connection-id-wer32423423"
        },
        "method": "show",
        "args": [ ]
    }, {
        "item": { 
            // this means that the method should be invoked on the page itself
        }
    } ]
}]
```

License
---------
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
