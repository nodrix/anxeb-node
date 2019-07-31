'use strict';

const Event = require('./event').instance;
const eventTypes = require('./event').types;
const utils = require('../common/utils');
const clc = require('cli-color');

module.exports = {
	instance : function () {
		let _self = this;
		let _events = null;

		_self.stack = process.env.NODE_ENV !== 'PROD';

		let setupEvent = function (event) {
			event.toEvent = function () {
				return new Event({
					message : this.message,
					code    : this.code,
					type    : this.type,
					color   : this.color,
					style   : this.style,
					meta    : this.meta,
					log     : _self
				});
			};

			event.include = function (meta) {
				return this.toEvent().include(meta);
			};

			event.args = function () {
				return this.toEvent().args(arguments);
			};

			event.throw = function (res) {
				return this.toEvent().throw(res);
			};

			event.print = function () {
				return this.toEvent().print();
			};

			event.exit = function () {
				return this.toEvent().exit();
			};

			event.toError = function (params) {
				return this.toEvent().toError(params);
			};

			return event;
		};
		let init = function (events) {
			for (let key in events) {
				let event = setupEvent(events[key]);
				setupEvent(event);
			}
		};

		_self.alert = JSON.parse(JSON.stringify(require('../events/alerts')));

		_self.debug = JSON.parse(JSON.stringify(require('../events/debugs')));

		_self.exception = JSON.parse(JSON.stringify(require('../events/exceptions')));

		_self.include = {
			event : function (module) {
				for (let key in module) {
					let event = setupEvent(module[key]);

					if (event.type === eventTypes.debug_log ||
						event.type === eventTypes.warning_log) {
						_self.debug[key] = event;
					} else if (
						event.type === eventTypes.information_alert ||
						event.type === eventTypes.exclamation_alert) {
						_self.alert[key] = event;
					} else {
						_self.exception[key] = event;
					}
				}
			}
		};

		_self.print = function (text) {
			if (_self.enabled) {
				console.log(clc.green(text));
				if (_self.file) {
					utils.internal.file.write(_self.file, text);
				}
			}
		};

		_self.require = function (params, owner) {
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
				ev = _self.exception.missing_parameter.args(missing[0], owner)
			} else if (missing.length > 1) {
				ev = _self.exception.missing_parameters.args(missing.join(', '))
			}

			if (ev) {
				ev.print();
				process.exit();
				return false;
			} else {
				return true;
			}
		};

		_self.break = function () {
			if (_self.enabled) {
				console.log('');
				if (_self.file) {
					utils.internal.file.write(_self.file, { text : '\n' });
				}
			}
		};

		_self.separator = function () {
			if (_self.enabled) {
				let sp = '';
				for (let i = 0; i < 20; i++) {
					sp += '\u23BC\u23BC\u23BC\u23BC\u23BC';
				}

				sp = '\n' + sp;
				console.log(sp);
				if (_self.file) {
					utils.internal.file.write(_self.file, { text : sp + '\n' });
				}
			}
		};

		_self.init = function (settings) {
			_self.identifier = settings.identifier || 'Anxeb';
			_self.enabled = settings.enabled != null ? settings.enabled : true;
			_self.stack = settings.stack != null ? settings.stack : process.env.NODE_ENV !== 'PROD';
			_self.route = settings.route != null ? settings.route : false;
			_self.file = settings.file;
			_events = settings.events;
			_self.reload();
		};

		_self.reload = function () {
			if (_events) {
				try {
					utils.internal.modules.list(_events).map(function (item) {
						_self.include.event(item.module);
					});
				} catch (err) {
					if (err.code === 4) {
						_self.exception.modules_path_not_found.args(err.path, ' events').throw();
					} else {
						_self.exception.modules_load_exception.args(err, 'events').throw();
					}
				}
			}
		};

		init(_self.alert);
		init(_self.debug);
		init(_self.exception);

	}
};
