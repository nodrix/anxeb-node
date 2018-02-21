'use strict';
require('./source/middleware/prototypes')();

const Server = require('./source/core/server');
const Enums = require("./source/middleware/enums");
const MongooseTypes = require('mongoose').Schema.Types;

module.exports = {
	Server : Server,
	Enums  : Enums,
	Types  : {
		ObjectId      : MongooseTypes.ObjectId,
		Array         : MongooseTypes.Array,
		Buffer        : MongooseTypes.Buffer,
		DocumentArray : MongooseTypes.DocumentArray,
		Decimal128    : MongooseTypes.Decimal128,
		Mixed         : MongooseTypes.Mixed
	}
};
