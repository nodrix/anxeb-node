'use strict';

const moment = require('moment');

module.exports = {
	instance : function (socket, params) {
		let _self = this;

		_self.service = params.service;
		_self.socket = params.socket;
		_self.context = params.context;
		_self.index = params.index;
		_self.date = moment();
		_self.connected = true;

		let setupCallback = function (name, callback) {
			_self.context.on(name, function (payload, fn) {
				fn(callback({
					service : _self.service,
					client  : _self,
					payload : payload
				}));
			});
		};

		for (let c in _self.service.socket.callbacks) {
			let item = _self.service.socket.callbacks[c];
			setupCallback(item.name, item.callback);
		}

		_self.context.on('disconnect', function () {
			if (_self.context.disconnected) {
				_self.connected = _self.context.disconnected;
			}
		});
	}
};
