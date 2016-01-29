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
var unirest = require('unirest');
var url = require('url');

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
var AWSTransport = function (initd) {
    var self = this;

    self.initd = _.d.compose.shallow(
        initd,
        {
            channel: iotdb_transport.channel,
            unchannel: iotdb_transport.unchannel,
            pack: function(d) { return d },
        },
        iotdb.keystore().get("/transports/AWSTransport/initd"),
        {
            api: "https://api.homestar.io", 
            "machine-id": "",
            store: "things",
            verbose: false,
            add_timestamp: true,
            optimistic: true,
        }
    );

    if (_.is.Empty(self.initd["machine-id"])) {
        throw new Error("machine_id is required");
    };

    if (_.is.Empty(self.initd.store)) {
        throw new Error("store is required");
    };

    // create a prefix from "api" and "machine-id"
    var parts = [
        self.initd.api,
        "iotdb",
        "homestar",
        "0",
        self.initd["machine-id"] || "-",
        self.initd.store || "-",
    ];
    parts = _.map(parts, function(part) {
        return part.replace(/(^\/+|\/+$)/g, '');
    });

    self.initd.prefix = parts.join("/");
};

AWSTransport.prototype = new iotdb_transport.Transport;
AWSTransport.prototype._class = "AWSTransport";

/* --- methods --- */

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.list = function(paramd, callback) {
    var self = this;
    var ld;

    self._validate_list(paramd, callback);

    var _request = function(url) {
        if (self.initd.verbose) {
            logger.info({
                method: "list",
                url: url,
            }, "requesting list");
        }

        unirest.get(url)
            .type('json')
            .end(function (result) {
                if (result.error) {
                    if (self.initd.verbose) {
                        logger.info({
                            method: "list",
                            url: url,
                            error: _.error.message(result.error),
                        }, "failure!");
                    }

                    ld = _.shallowCopy(paramd);
                    return callback(result.error, ld);
                }

                if (self.initd.verbose) {
                    logger.info({
                        method: "list",
                        url: url,
                        body: result.body,
                    }, "success!");
                }

                if (result.body.thing) {
                    result.body.thing.map(function(thing_path) {
                        var thing_url = self._path_url(thing_path);
                        var parts = self.initd.unchannel(self.initd, thing_url);
                        if (parts.length && parts[0] !== '.') {
                            ld = _.shallowCopy(paramd);
                            ld.id = parts[0];

                            callback(null, ld);
                        }
                    });
                }

                if (!result.body.pivot) {
                    return callback(null, null);
                }

                _request(self._path_url(result.body.pivot));
            });
    };

    _request(self.initd.channel(self.initd));
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.added = function(paramd, callback) {
    var self = this;

    self._validate_added(paramd, callback);

    var channel = self.initd.channel(self.initd, paramd.id);
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.get = function(paramd, callback) {
    var self = this;

    self._validate_get(paramd, callback);

    var gd = _.shallowCopy(paramd);
    var url = self.initd.channel(self.initd, gd.id, gd.band);

    if (self.initd.verbose) {
        logger.info({
            method: "get",
            url: url,
            id: gd.id,
            band: gd.band,
        }, "requesting thing/band");
    }

    unirest
        .get(url)
        .type('json')
        .end(function (result) {
            if (result.error) {
                if (self.initd.verbose) {
                    logger.info({
                        method: "get",
                        url: url,
                        error: _.error.message(result.error),
                    }, "failure!");
                }

                return callback(result.error, gd);
            }

            if (self.initd.verbose) {
                logger.info({
                    method: "get",
                    url: url,
                    body: result.body,
                }, "success!");
            }

            gd.value = result.body;
            delete gd.value["@id"];

            callback(null, gd);
        });
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.bands = function(paramd, callback) {
    var self = this;

    self._validate_bands(paramd, callback);

    var ad = _.shallowCopy(paramd);
    var url = self.initd.channel(self.initd, ad.id);

    if (self.initd.verbose) {
        logger.info({
            method: "bands",
            url: url,
            id: ad.id,
        }, "requesting thing");
    }

    unirest
        .get(url)
        .type('json')
        .end(function (result) {
            if (result.error) {
                if (self.initd.verbose) {
                    logger.info({
                        method: "bands",
                        url: url,
                        error: _.error.message(result.error),
                    }, "failure!");
                }

                return callback(result.error, ad);
            }

            if (self.initd.verbose) {
                logger.info({
                    method: "bands",
                    url: url,
                    body: result.body,
                }, "success!");
            }

            ad.bandd = {};
            for (var key in result.body) {
                if (key.match(/^@/)) {
                    continue;
                }

                ad.bandd[key] = null;
            }

            callback(null, ad);
        });
};


/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.put = function(paramd, callback) {
    var self = this;

    self._validate_update(paramd, callback);

    var ud = _.shallowCopy(paramd);
    var channel = self.initd.channel(self.initd, ud.id, ud.band);

    if (self.initd.add_timestamp) {
        ud.value = _.timestamp.add(ud.value);
    }

    if (self.initd.verbose) {
        logger.info({
            channel: channel,
            ud: ud,
        }, "sending");
    }

    unirest.put(channel)
        .type('json')
        .json(ud.value)
        .end(function (result) {
            if (result.error) {
                if (self.initd.verbose) {
                    logger.info({
                        channel: channel,
                        error: _.error.message(result.error),
                    }, "failure!");
                }

                return callback(result.error, ud);
            }

            if (self.initd.verbose) {
                logger.info({
                    channel: channel,
                    body: result.body,
                }, "success!");
            }

            if (result.body && result.body.value) {
                ud.value = result.body.value;
            }

            callback(null, ud);
        });
};

/**
 *  See {iotdb_transport.Transport#Transport} for documentation.
 */
AWSTransport.prototype.updated = function(paramd, callback) {
    var self = this;

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
AWSTransport.prototype._path_url = function(path) {
    var self = this;

    var urlp = url.parse(self.initd.api);
    var pathp = url.parse(path);

    urlp.pathname = pathp.pathname;
    urlp.query = pathp.query;
    urlp.search = pathp.search;

    return url.format(urlp);
};

                    
/**
 *  API
 */
exports.AWSTransport = AWSTransport;
