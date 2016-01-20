/*
 *  receive.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-01-20
 *
 *  Demonstrate receiving
 *  Make sure to see README first
 */

var Transport = require('../AWSTransport').AWSTransport;

var transport = new Transport({
});
transport.updated({
    id: "MyThingID", 
    band: "meta", 
}, function(ud) {
    if (ud.value === undefined) {
        transport.get(ud, function(gd) {
            console.log("+", gd.id, gd.band, gd.value);
        });
    } else {
        console.log("+", ud.id, ud.band, ud.value);
    }
});