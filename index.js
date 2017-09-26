'use strict';
require('./source/middleware/prototypes')();

const Server = require('./source/core/server');
const Enums = require("./source/middleware/enums");

module.exports = {
	Server : Server,
	Enums  : Enums,
	moment : require('moment')
};
