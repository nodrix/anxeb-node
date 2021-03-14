'use strict';

const Client = require('./client').instance;
const Stack = require('../common/stack').instance;

module.exports = {
	instance : function (socket, params, sio) {
		let _self = this;

		_self.socket = socket;
		_self.service = socket.service;
		_self.name = params.name;
		_self.path = params.path;
		_self.roles = params.roles;
		_self.owners = params.owners;
		_self.access = params.access;
		_self.clients = [];

		_self.context = sio.of(_self.path);

		let _settings = {
			context   : params.context,
			client    : params.client,
			callbacks : params.callbacks
		};

		_self.to = function () {
			return _self.context.to.apply(_self.context, Array.from(arguments));
		}

		_self.in = function () {
			return _self.context.in.apply(_self.context, Array.from(arguments));
		}

		_self.emit = function () {
			_self.context.emit.apply(_self.context, Array.from(arguments));
			return _self;
		}

		_self.pipes = function () {
			return _self.context.clients.apply(_self.context, Array.from(arguments));
		}

		_self.use = function () {
			return _self.context.use.apply(_self.context, Array.from(arguments));
		}

		_self.only = function (rooms) {
			let pipe = _self.context;
			for (let i = 0; i < rooms.length; i++) {
				let roomName = rooms[i];
				pipe = pipe.to(roomName);
			}
			return pipe;
		}

		_self.context.use((pipe, next) => {
			_self.service.security.socket.checkpoint({
				access         : _self.access,
				path           : _self.path,
				roles          : _self.roles,
				owners         : _self.owners,
				url            : pipe.client.request.url,
				authorization  : pipe.handshake.headers.authorization,
				printException : true
			}).then(function () {
				return next();
			}).catch(function (err) {
				return next(Error(JSON.stringify({
					message : err.message,
					route   : _self.service.log.route ? err.route : undefined,
					code    : err.event !== undefined ? err.event.code : 0,
					stack   : _self.service.log.stack ? new Stack(err).substract.main() : undefined,
					meta    : err.meta !== undefined ? err.meta : undefined,
					inner   : null
				})));
			});
		});

		_self.context.on('connection', function (pipe) {
			let $client = new Client(_self, {
				pipe     : pipe,
				settings : _settings
			});
			_self.clients.push($client);

			if (_settings.client && _settings.client.connected) {
				_settings.client.connected($client.context(), $client);
			}
		});
	}
};
