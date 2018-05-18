'use strict';
require('./source/middleware/prototypes')();

const Server = require('./source/core/server');
const Enums = require("./source/middleware/enums");
const MongooseTypes = require('mongoose').Schema.Types;
const path = require('path');
const uuid = require('uuid');

module.exports = {
	Server : Server,
	Enums  : Enums,
	utils  : {
		path : path,
		uuid : uuid
	},
	Types  : {
		ObjectId      : MongooseTypes.ObjectId,
		Array         : MongooseTypes.Array,
		Buffer        : MongooseTypes.Buffer,
		DocumentArray : MongooseTypes.DocumentArray,
		Decimal128    : MongooseTypes.Decimal128,
		Mixed         : MongooseTypes.Mixed
	}
};