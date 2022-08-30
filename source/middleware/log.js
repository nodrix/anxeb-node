'use strict';

const Event = require('./event').instance;
const eventTypes = require('./event').types;
const utils = require('../common/utils');
const clc = require('cli-color');

module.exports = {
	instance : function () {
		let _log = this;
		let _events = null;
		let _alerts = JSON.parse(JSON.stringify(require('../events/alerts')));
		let _debugs = JSON.parse(JSON.stringify(require('../events/debugs')));
		let _exceptions = JSON.parse(JSON.stringify(require('../events/exceptions')));

		_log.stack = process.env.NODE_ENV !== 'PROD';

		let PreEvent = function (params, key, context) {
			let _self = this;
			let _params = params;
			let _context = context;

			_self.key = key;
			_self.message = _params.message;
			_self.code = _params.code;
			_self.type = _params.type;
			_self.color = _params.color;
			_self.style = _params.style;
			_self.meta = _params.meta;

			_self.toEvent = function () {
				return new Event({
					key     : key,
					message : _params.message,
					code    : _params.code,
					type    : _params.type,
					color   : _params.color,
					style   : _params.style,
					meta    : _params.meta,
					context : _context,
					log     : _log
				});
			};

			_self.include = function (meta) {
				return _self.toEvent().include(meta);
			};

			_self.args = function () {
				return _self.toEvent().args(arguments);
			};

			_self.throw = function (res) {
				return _self.toEvent().throw(res);
			};

			_self.bubble = function (res) {
				return _self.toEvent().bubble(res);
			};

			_self.print = function () {
				return _self.toEvent().print();
			};

			_self.exit = function () {
				return _self.toEvent().exit();
			};

			_self.toError = function (params) {
				return _self.toEvent().toError(params);
			};

			return _self;
		};

		let getEventGroup = function (events, context) {
			let items = {};
			for (let key in events) {
				items[key] = new PreEvent(events[key], key, context);
			}
			return items;
		};

		_log.alert = getEventGroup(_alerts);
		_log.debug = getEventGroup(_debugs);
		_log.exception = getEventGroup(_exceptions);

		_log.withContext = function (context) {
			return {
				alert     : getEventGroup(_alerts, context),
				debug     : getEventGroup(_debugs, context),
				exception : getEventGroup(_exceptions, context)
			}
		}

		_log.include = {
			event : function (module) {
				for (let key in module) {
					let event = new PreEvent(module[key], key);

					if (event.type === eventTypes.debug_log ||
						event.type === eventTypes.warning_log) {
						_log.debug[key] = event;
						_debugs[key] = module[key];
					} else if (
						event.type === eventTypes.information_alert ||
						event.type === eventTypes.exclamation_alert) {
						_log.alert[key] = event;
						_alerts[key] = module[key];
					} else {
						_log.exception[key] = event;
						_exceptions[key] = module[key];
					}
				}
			}
		};

		_log.print = function (text) {
			if (_log.enabled) {
				console.log(clc.green(text));
				if (_log.file) {
					utils.internal.file.write(_log.file, text);
				}
			}
		};

		_log.require = function (params, owner) {
			let from = params.from;
			let items = params.items;
			let missing = [];

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				if (!utils.general.data.containsProperty(from, item)) {
					missing.push(item);
				}
			}

			let ev = null;
			if (missing.length === 1) {
				ev = _log.exception.missing_parameter.args(missing[0], owner)
			} else if (missing.length > 1) {
				ev = _log.exception.missing_parameters.args(missing.join(', '))
			}

			if (ev) {
				ev.print();
				process.exit();
				return false;
			} else {
				return true;
			}
		};

		_log.break = function () {
			if (_log.enabled) {
				console.log('');
				if (_log.file) {
					utils.internal.file.write(_log.file, { text : '\n' });
				}
			}
		};

		_log.separator = function () {
			if (_log.enabled) {
				let sp = '';
				for (let i = 0; i < 20; i++) {
					sp += '\u23BC\u23BC\u23BC\u23BC\u23BC';
				}

				sp = '\n' + sp;
				console.log(sp);
				if (_log.file) {
					utils.internal.file.write(_log.file, { text : sp + '\n' });
				}
			}
		};

		_log.init = function (settings) {
			_log.identifier = settings.identifier || 'Anxeb';
			_log.enabled = settings.enabled != null ? settings.enabled : true;
			_log.stack = settings.stack != null ? settings.stack : process.env.NODE_ENV !== 'PROD';
			_log.route = settings.route != null ? settings.route : false;
			_log.file = settings.file;
			_events = settings.events;
			_log.reload();
		};

		_log.reload = function () {
			if (_events) {
				try {
					utils.internal.modules.list(_events).map(function (item) {
						_log.include.event(item.module);
					});
				} catch (err) {
					if (err.code === 4) {
						_log.exception.modules_path_not_found.args(err.path, ' events').throw();
					} else {
						_log.exception.modules_load_exception.args(err, 'events').throw();
					}
				}
			}
		};
	}
};
