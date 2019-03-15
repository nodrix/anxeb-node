'use strict';

require('./source/common/prototypes')();

const Server = require('./source/core/server');
const utils = require('./source/common/utils');
const Event = require('./source/middleware/event');
const Route = require('./source/middleware/route');

module.exports = {
	Server  : Server,
	utils   : utils.general,
	Event   : Event,
	Route   : Route
};