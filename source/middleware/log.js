'use strict';

const Event = require("../middleware/event");
const Enums = require("../middleware/enums");

module.exports = function (firstLog) {
	var _self = this;

	if (firstLog) {
		console.log("\n---------------------------------------------------------------------------------------------------------");
	}

	var setupEvent = function (event) {
		event.toEvent = function () {
			return new Event({
				message : this.message,
				code    : this.code,
				type    : this.type,
				color   : this.color,
				style   : this.style,
				log     : _self
			});
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

		event.toError = function () {
			return this.toEvent().toError();
		};

		return event;
	};

	var init = function (events) {
		for (var key in events) {
			var event = setupEvent(events[key]);
			setupEvent(event);
		}
	};

	_self.include = function (events) {
		for (var key in events) {
			var event = setupEvent(events[key]);

			if (event.type === Enums.EventType.Debug || event.type === Enums.EventType) {
				_self.debug[key] = event;
			} else if (event.type === Enums.EventType.InformationAlert || event.type === Enums.EventType.ExclamationAlert) {
				_self.alert[key] = event;
			} else {
				_self.exception[key] = event;
			}
		}
	};

	_self.print = function (text) {
		console.log(clc.green(text));
		utils.write(params.fileName, text);
	};

	_self.start = function (params) {
		if (params) {
			_self.identifier = params.identifier;
			_self.settings = params.settings;
		}
		init(_self.alert);
		init(_self.debug);
		init(_self.exception);
	};

	_self.alert = JSON.parse(JSON.stringify(require("../common/alerts")));
	_self.debug = JSON.parse(JSON.stringify(require("../common/debugs")));
	_self.exception = JSON.parse(JSON.stringify(require("../common/exceptions")));

	_self.start({
		identifier : "Anxeb",
		settings   : {
			debug : process.env.NODE_ENV !== 'PROD'
		}
	});
};
