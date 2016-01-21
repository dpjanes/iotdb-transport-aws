/*
 *  about.js
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
transport.about({
    id: "MyThingID", 
}, function(ud) {
    console.log("+", ud.id, ud.bands);
});
