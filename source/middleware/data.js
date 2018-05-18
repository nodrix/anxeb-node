'use strict';

const utils = require("../common/utils");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const fs = require("fs");
const bluebird = require('bluebird');
const path = require("path");

module.exports = function (service) {
	var _self = this;
	var _service = service;
	var _settings = service.settings.data;

	mongoose.Promise = bluebird;
	_self.context = mongoose.createConnection();

	_self.models = {};
	_self.connected = false;

	_self.include = {
		model : function (params) {
			_self.models[params.name] = _self.context.model(params.name, new Schema(params.schema, {
				collection : params.collection || params.name
			}));
		}
	};

	var loadModels = function () {
		if (_service.settings.service.paths.models) {
			var modelsPath = path.join(_service.server.settings.paths.source, _service.settings.service.paths.models);
			utils.file.modules(modelsPath).map(function (model) {
				model.module.name = model.module.name || model.name.toPascalCase();
				if (!model.module.disabled) {
					_self.include.model(model.module);
				}
			});
		}
	};

	_self.newId = function () {
		return mongoose.Types.ObjectId();
	};

	_self.context.on('open', function (ref) {
		_self.connected = true;
	});

	_self.context.on('connecting', function () {
		_service.log.debug.data_server_connecting.args(_settings.uri).print();
	});

	_self.context.on('connected', function () {
		_service.log.debug.data_server_connected.args(_settings.uri).print();
		_self.connected = true;
	});

	_self.context.on('disconnected', function () {
		setTimeout(_self.connect, 2000);
		if (_self.connected === true) {
			_self.connected = false;
			_service.log.exception.data_server_disconnected.args(_settings.uri).print();
		}
	});

	_self.connect = function (callback) {
		if (_self.connected) {
			if (callback) {
				callback();
			}
		} else {
			_self.context.openUri(_settings.uri, _settings.options).then(function () {
				if (callback) {
					callback();
				}
			}).catch(function (err) {
				_service.log.exception.data_server_connection_failed.args(_settings.uri, err).throw();
			});
		}
	};

	loadModels();
};
