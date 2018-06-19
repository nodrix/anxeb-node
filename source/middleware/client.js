'use strict';

var moment = require("moment");

module.exports = function (service, params) {
	var _self = this;
	var _service = service;
	_self.socket = params.socket;
	_self.connected = true;
	_self.date = moment();
	_self.index = params.index;

	var setupCallback = function (cb) {
		var name = cb.name;
		_self.socket.on(name, function (payload, fn) {
			fn(cb.callback({
				service : _service,
				client  : _self,
				payload : payload
			}));
		});
	};

	for (var c in _service.callbacks) {
		var cb = _service.callbacks[c];
		setupCallback(cb);
	}

	_self.socket.on('disconnect', function () {
		if (_self.socket.disconnected) {
			_self.connected = _self.socket.disconnected;
		}
	});
};
