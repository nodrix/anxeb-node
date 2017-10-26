'use strict';
require('./source/middleware/prototypes')();

const Server = require('./source/core/server');
const Enums = require("./source/middleware/enums");
const MongooseTypes = require('mongoose').Schema.Types;

module.exports = {
	Server : Server,
	Enums  : Enums,
	Types  : {
		ObjectId : MongooseTypes.ObjectId
	}
};
