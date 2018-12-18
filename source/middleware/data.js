'use strict';

var utils = require("../common/utils");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var fs = require("fs");
var bluebird = require('bluebird');
var path = require("path");

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

			if (params.childs) {
				for (var c in params.childs) {
					var child_params = params.childs[c];

					var child_options = {
						collection : child_params.collection || child_params.name
					};

					if (child_params.options) {
						child_options = child_params.options;
						child_options.collection = child_params.collection || child_params.options.collection || child_params.name
					}

					var child_schema = new Schema(child_params.schema, child_options);

					if (child_params.virtuals) {
						for (var v in child_params.virtuals) {
							child_schema.virtual(v).get(child_params.virtuals[v]);
						}
					}

					if (child_params.methods) {
						for (var m in child_params.methods) {
							child_schema.method(m, child_params.methods[m]);
						}
					}

					_self.models[params.name + child_params.name] = _self.context.model(params.name + child_params.name, child_schema);
				}
			}

			var options = {
				collection : params.collection || params.name
			};

			if (params.options) {
				options = params.options;
				options.collection = params.collection || params.options.collection || params.name
			}

			var schema = new Schema(params.schema, options);

			if (params.virtuals) {
				for (var v in params.virtuals) {
					schema.virtual(v).get(params.virtuals[v]);
				}
			}

			if (params.methods) {
				for (var m in params.methods) {
					schema.method(m, params.methods[m]);
				}
			}
			_self.models[params.name] = _self.context.model(params.name, schema);
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
