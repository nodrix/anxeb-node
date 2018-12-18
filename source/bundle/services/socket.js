'use strict';

anxeb.app.service('socket', function ($rootScope) {
	var socket = io.connect();
	return {
		remove       : function (eventName) {
			return socket.removeAllListeners(eventName);
		},
		emit         : function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		},
		on           : function (eventName, callback) {
			socket.on(eventName, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		connected    : function (callback) {
			this.on('connect', callback);
		},
		disconnected : function (callback) {
			this.on('disconnect', callback);
		}
	};
});
