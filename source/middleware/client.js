'use strict';

const moment = require('moment');
const Stack = require('../common/stack').instance;

module.exports = {
	instance : function (namespace, params) {
		let _self = this;

		_self.namespace = namespace;
		_self.service = namespace.service;
		_self.pipe = params.pipe;
		_self.id = params.pipe.id;
		_self.index = namespace.clients.length;
		_self.tick = moment().unix();
		_self.connected = true;
		_self.state = 'connected';
		_self.meta = {};
		_self.room = null;
		_self.key = null;

		let _settings = params.settings;

		_self.context = function () {
			let _context = {
				client      : _self,
				log         : _self.service.log,
				service     : _self.service,
				application : _self.service.application,
				root        : _self.namespace,
				pipe        : _self.pipe,
				bearer      : _self.bearer,
				room        : _self.room,
				key         : _self.key,
				id          : _self.id,
				to          : function () {
					return _self.namespace.to.apply(_self.namespace, Array.from(arguments));
				},
				in          : function () {
					return _self.namespace.in.apply(_self.namespace, Array.from(arguments));
				},
				of          : function () {
					return _self.namespace.of.apply(_self.namespace, Array.from(arguments));
				},
				emit        : function () {
					return _self.namespace.emit.apply(_self.namespace, Array.from(arguments));
				},
				broadcast   : function () {
					return _self.pipe.broadcast.emit.apply(_self.pipe.broadcast, Array.from(arguments));
				}
			};

			if (_settings.context) {
				if (_settings.context.properties) {
					for (let key in _settings.context.properties) {
						let obj = _settings.context.properties[key];

						if (typeof obj === 'function') {
							Object.defineProperty(_context, key, {
								get : function () {
									return obj(_context);
								}
							});
						} else {
							_context[key] = obj;
						}
					}
				}

				if (_settings.context.methods) {
					for (let key in _settings.context.methods) {
						let obj = _settings.context.methods[key];

						if (typeof obj === 'function') {
							_context[key] = function () {
								let args = Array.from(arguments);
								args.unshift(_context);
								return obj.apply(_settings.context.methods, args);
							}
						} else {
							_context[key] = function () {
								return obj;
							}
						}
					}
				}
			}
			return _context;
		}

		Object.defineProperty(_self, 'rooms', {
			get : function () {
				let result = [];
				for (let key in _self.pipe.rooms) {
					if (key !== _self.id) {
						result.push(key);
					}
				}
				return result;
			}
		});

		_self.use = function () {
			return _self.pipe.use.apply(_self.pipe, Array.from(arguments));
		}

		_self.send = function () {
			return _self.pipe.send.apply(_self.pipe, Array.from(arguments));
		}

		_self.emit = function () {
			return _self.pipe.emit.apply(_self.pipe, Array.from(arguments));
		}

		_self.on = function () {
			_self.pipe.on.apply(_self.pipe, Array.from(arguments));
			return _self;
		}

		_self.once = function () {
			_self.pipe.once.apply(_self.pipe, Array.from(arguments));
			return _self;
		}

		_self.join = function () {
			return _self.pipe.join.apply(_self.pipe, Array.from(arguments));
		}

		_self.leave = function () {
			return _self.pipe.leave.apply(_self.pipe, Array.from(arguments));
		}

		_self.to = function () {
			return _self.pipe.to.apply(_self.pipe, Array.from(arguments));
		}

		_self.in = function () {
			return _self.pipe.in.apply(_self.pipe, Array.from(arguments));
		}

		_self.broadcast = function () {
			return _self.pipe.broadcast.emit.apply(_self.pipe.broadcast, Array.from(arguments));
		}

		_self.talk = function (to) {
			return function () {
				let pipe = _self.pipe.broadcast.to(to);
				return pipe.emit.apply(pipe, Array.from(arguments));
			}
		}

		_self.headers = _self.pipe.handshake.headers;

		_self.address = _self.pipe.handshake.address;

		_self.issued = _self.pipe.handshake.issued;

		_self.query = _self.pipe.handshake.query;

		_self.secure = _self.pipe.handshake.secure;

		_self.bearer = _self.pipe.handshake.headers.authorization ? _self.service.security.socket.bearer(_self.pipe.handshake.headers.authorization) : null;

		let _room = _self.headers['client-room'];

		if (_room != null) {
			_self.pipe.join(_room, function () {
				_self.room = _room;
				if (_settings.client && _settings.client.joined) {
					_settings.client.joined(_self.context(), _self, _self.room);
				}
			});
		}

		if (_self.headers['client-key'] != null) {
			_self.key = _self.headers['client-key'];
		}

		_self.pipe.on('join_room', function (room) {
			_self.pipe.join(room, function () {
				if (_settings.client && _settings.client.joined) {
					_settings.client.joined(_self.context(), _self, room);
				}
			});
		});

		_self.pipe.on('leave_room', function (room) {
			_self.pipe.leave(room, function () {
				if (_settings.client && _settings.client.left) {
					_settings.client.left(_self.context(), _self, room);
				}
			});
		});

		_self.pipe.on('error', (error) => {
			_self.error = error;
			if (_settings.client && _settings.client.error) {
				_settings.client.error(_self.context(), _self, error);
			}
		});

		_self.pipe.on('disconnect', (reason) => {
			_self.connected = false;
			_self.state = reason.replaceAll(' ', '_');
			_self.dispose();

			if (_settings.client && _settings.client.disconnect) {
				_settings.client.disconnect(_self.context(), _self);
			}
		});

		_self.dispose = function () {
			_self.state = 'disposed';
			_self.pipe.disconnect(true);
			_self.namespace.clients.splice(_self.namespace.clients.indexOf(_self), 1);
			if (_settings.client && _settings.client.disposed) {
				_settings.client.disposed(_self.context(), _self);
			}
		}

		for (let key in _settings.callbacks) {
			let $callback = _settings.callbacks[key];

			_self.pipe.on(key, function () {
				let args = Array.from(arguments);
				args.unshift(_self.context());

				let resolve = null;
				if (args.length > 1) {
					resolve = args[args.length - 1];
					if (typeof resolve === 'function') {
						args.pop()
					} else {
						resolve = null;
					}
				}

				try {
					let result = $callback.apply(_settings.callbacks, args);
					if (resolve != null) {
						resolve(result);
					}
				} catch (err) {
					let event = err.event ? err.event : _self.service.log.exception.unhandled_exception.args(err);
					resolve(event.print().toClient({
						source : 'socket_event_error'
					}));
				}
			});
		}
	}
};
