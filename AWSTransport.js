/*
 *  AWSTransport.js
 *
 *  David Janes
 *  IOTDB.org
 *  2016-01-20
 *
 *  Copyright [2013-2016] [David P. Janes]
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

"use strict";

var iotdb = require('iotdb');
var iotdb_transport = require('iotdb-transport');
var _ = iotdb._;

var path = require('path');

var util = require('util');
var url = require('url');

var logger = iotdb.logger({
    name: 'iotdb-transport-aws',
    module: 'AWSTransport',
});

/* --- constructor --- */

/**
 *  Create a transport for AWS.
 */
var AWSTransport = function (initd, native) {
    var self = this;

    self.initd = _.defaults(
        initd,
        {
            channel: iotdb_transport.channel,
            unchannel: iotdb_transport.unchannel,
            encode: _encode,
            decode: _decode,
            pack: _pack,
            unpack: _unpack,
        },
        iotdb.keystore().get("/transports/AWSTransport/initd"),
        {
            prefix: ""
        }
    );
    
    self.native = native;
};

AWSTransport.prototype = new iotdb_transport.Transport;
AWSTransport.prototype._class = "AWSTransport";

/* --- methods --- */

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.list = function(paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_list(paramd, callback);

    callback({
        end: true,
    });
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.added = function(paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_added(paramd, callback);

    var channel = self.initd.channel(self.initd, paramd.id);
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.get = function(paramd, callback) {
    var self = this;

    self._validate_get(paramd, callback);

    var channel = self.initd.channel(self.initd, paramd.id, paramd.band);

    // callback(id, band, null); does not exist
    // OR
    // callback(id, band, undefined); don't know
    // OR
    // callback(id, band, d); data
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.update = function(paramd, callback) {
    var self = this;

    self._validate_updated(paramd, callback);

    var channel = self.initd.channel(self.initd, paramd.id, paramd.band);
    var d = self.initd.pack(paramd.value, paramd.id, paramd.band);

    logger.error({
        method: "update",
        channel: channel,
        d: d,
    }, "NOT IMPLEMENTED");

    callback({
        error: new Error("not implemented"),
    });
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.updated = function(paramd, callback) {
    var self = this;

    if (arguments.length === 1) {
        paramd = {};
        callback = arguments[0];
    }

    self._validate_updated(paramd, callback);
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.remove = function(paramd, callback) {
    var self = this;

    self._validate_remove(paramd, callback);

    var channel = self.initd.channel(self.intid, paramd.id, paramd.band);
};

/* --- internals --- */
var _encode = function(s) {
    return s.replace(/[\/$%#.\]\[]/g, function(c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
};

var _decode = function(s) {
    return decodeURIComponent(s);
}

var _unpack = function(d) {
    return _.d.transform(d, {
        pre: _.ld_compact,
        key: _decode,
    });
};

var _pack = function(d) {
    return _.d.transform(d, {
        pre: _.ld_compact,
        key: _encode,
    });
};

/**
 *  API
 */
exports.AWSTransport = AWSTransport;
