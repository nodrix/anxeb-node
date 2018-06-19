'use strict';
require('./source/middleware/prototypes')();

var Server = require('./source/core/server');
var Enums = require("./source/middleware/enums");
var MongooseTypes = require('mongoose').Schema.Types;
var utils = require('./source/common/utils');
var path = require('path');
var uuid = require('uuid');

module.exports = {
	Server : Server,
	Enums  : Enums,
	utils  : {
		path : path,
		uuid : uuid,
		data : utils.data,
		copy : utils.copy
	},
	Types  : {
		ObjectId      : MongooseTypes.ObjectId,
		Array         : MongooseTypes.Array,
		Buffer        : MongooseTypes.Buffer,
		DocumentArray : MongooseTypes.DocumentArray,
		Decimal128    : MongooseTypes.Decimal128,
		Mixed         : MongooseTypes.Mixed
	},
	Data   : {
		Schema : require('mongoose').Schema
	}
};
