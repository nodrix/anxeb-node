'use strict';

var path = require('path');
var utils = require('../common/utils');
var Log = require("../middleware/log");
var Service = require('../middleware/service');
var async = require('async');

module.exports = function (params) {
	var _self = this;

	_self.log = new Log(true);

	if (!params.name) {
		_self.log.exception.missing_param_name.exit();
	}

	if (!params.settings || !params.settings.paths) {
		_self.log.exception.missing_param_paths.exit();
	}

	utils.fillServerParameters(params);

	params.version = params.version || require(params.settings.paths.root + '/package.json').version;
	_self.version = params.version;
	_self.instances = {};
	_self.settings = params.settings;
	_self.paths = _self.settings.paths;

	params.settings.log.debug = params.settings.log.debug !== undefined ? params.settings.log.debug : (_self.settings.debug !== undefined ? _self.settings.debug : false);

	_self.log.start({
		identifier : params.name,
		settings   : params.settings.log
	});
	_self.log.debug.server_initializing.args('v' + params.version, params.description, params.name, params.key).print();

	var _handleError = function (err) {
		if (err.event === undefined) {
			_self.log.exception.unhandled_exception.args(err).print();
		} else {
			err.event.args(err).print();
		}

		if (err.exit) {
			process.exit();
		}
	};

	process.on('unhandledRejection', function (err) {
		_handleError(err);
	});

	process.on('uncaughtException', function (err) {
		_handleError(err);
	});

	_self.include = {
		instance : function (params) {
			_self.instances[params.key] = new Service(_self, params);
		}
	};

	utils.file.modules(params.settings.paths.instances).map(function (instance) {
		_self.include.instance(instance.module);
	});

	_self.start = function () {
		var services = [];

		var addService = function (service) {
			if (service.active) {
				services.push(service.start);
			}
		};
		for (var i in _self.instances) {
			addService(_self.instances[i]);
		}
		async.waterfall(services, function (err) {
			if (err) {
				_handleError(err);
			} else {
				console.log('');
				_self.log.debug.server_started.args('v' + params.version, params.description, params.name, params.key).print();
			}
		});
	};
};
