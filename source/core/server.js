'use strict';

const Log = require('../middleware/log').instance;
const Locator = require('../common/locator').instance;
const Service = require('./service');
const utils = require('../common/utils');

module.exports = function (params) {
	let _self = this;
	let _version = require('../../package.json').version;

	_self.log = new Log();
	_self.log.require({
		from  : params,
		items : [
			'name',
			'key',
			'settings.root'
		]
	}, 'server');

	utils.internal.parameters.process.server(params);

	_self.log.init(params.settings.log);
	_self.log.separator();

	_self.name = params.name;
	_self.description = params.description;
	_self.key = params.key;
	_self.settings = params.settings;
	_self.structure = params.structure;
	_self.extensions = params.extensions;
	_self.locate = new Locator(_self.settings.root, _self.structure);

	let _baseServices = params.services;
	let _packageFile = _self.locate.item('/package.json');

	if (utils.general.file.exists(_packageFile)) {
		_self.version = 'v' + require(_self.locate.item('/package.json')).version || null;
	}
	_self.services = {};
	let _services = [];

	_self.log.debug.server_initializing.args(_version, _self.description + (_self.version ? ' ' + _self.version : ''), _self.name, _self.key).print();

	_self.include = {
		service : function (params, name) {
			let service = new Service(_self, params);
			if (service.active === undefined || service.active === true) {
				_self.services[params.key || name] = service;
				_services.push(service.start);
			}
		}
	};

	const handleException = function (err, cause) {
		if (err) {
			if (err.event === undefined) {
				_self.log.exception.unhandled_exception.args(err).print();
			} else {
				err.event.args(err).print();
			}

			if (err.exit) {
				process.exit();
			}
		} else {
			_self.log.exception.unhandled_exception.args('', {
				message : cause
			}).print();
			process.exit();
		}
	};

	process.on('unhandledRejection', function (err) {
		handleException(err, 'Unhandled Rejection');
	});

	process.on('uncaughtException', function (err) {
		handleException(err, 'Uncaught Exception');
	});

	_self.start = function () {
		if (_services.length) {
			let index = 0;

			let next = function () {
				if (index < _services.length) {
					_services[index++]().then(function () {
						next();
					}).catch(function (err) {
						handleException(err, 'Context Error');
					});
				} else {
					_self.log.break();
					_self.log.debug.server_started.args('v' + _self.version, _self.description, _self.name, _self.key).print();
					_self.log.break();
				}
			};

			next();
		} else {
			_self.log.exception.no_service_included.print();
			_self.log.debug.server_ended.args('v' + _self.version, _self.description, _self.name, _self.key).print();
		}
	};

	_self.init = function () {
		if (_baseServices) {
			for (let s in _baseServices) {
				_self.include.service(_baseServices[s], s);
			}
		}

		try {
			if (_self.structure && _self.structure.services && typeof _self.structure.services === 'string') {
				utils.internal.modules.list(_self.locate.services()).map(function (service) {
					_self.include.service(service.module);
				});
			}

			if (_self.extensions) {
				for (let key in _self.extensions) {
					let extension = _self.extensions[key];
					if (extension.name && extension.version && extension.init) {
						try {
							extension.instance = new extension.init(_self);
							_self.log.debug.extension_loaded.args(extension.description, extension.name, extension.version ? 'v' + extension.version : '').print();
						} catch (err) {
							_self.log.exception.extension_init_failed.args(key, err).print();
						}
					}
				}
			}
		} catch (err) {
			if (err.code === 4) {
				_self.log.exception.modules_path_not_found.args(err.path, 'services').throw();
			} else {
				_self.log.exception.modules_load_exception.args('services', err).throw();
			}
		}
	};

	_self.init();

};