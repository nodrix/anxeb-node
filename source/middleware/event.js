'use strict';

const utils = require("../common/utils");
const Enums = require("../middleware/enums");
const clc = require('cli-color');
const moment = require("moment");

const Event = function (params) {
	var _self = this;
	var _log = null;

	_self.title = [moment().format("hh:mm:ss a")];
	_self.message = null;
	_self.code = null;
	_self.type = null;
	_self.error = null;

	if (typeof(params) === "string") {
		_self.message = utils.fillDateParameters(params);
	} else {
		_self.message = utils.fillDateParameters(params.message);
		_self.code = params.code;
		_self.type = params.type;
		_log = params.log;

		if (_log.identifier) {
			_self.title = _self.title + " / " + _log.identifier;
		}
	}

	var _debug = _log.settings && _log.settings.debug;

	_self.args = function () {
		var items = arguments.length > 0 && arguments[0].toString() === "[object Arguments]" ? arguments[0] : arguments;
		for (var i in items) {
			var value = items[i];
			var argIsError = value instanceof Error;

			if (argIsError) {
				_self.error = value;
			} else {
				if (value !== undefined && value !== null) {
					_self.message = _self.message.replace("[" + i + "]", value.toString());
				}
			}
		}

		for (var i = 0; i < 10; i++) {
			_self.message = _self.message.replace("[" + i + "]", "");
		}
		_self.message = _self.message.trim();
		return _self;
	};

	_self.print = function () {
		var logText = "";
		var clcText = "";
		var inner = _self.error && _self.error.event !== this ? _self.error : null;

		if (_self.type === Enums.EventType.Debug) {
			clcText += clc.whiteBright(_self.title) + " > " + clc.green(_self.message);
			logText += _self.title + " > " + _self.message + "\n";
		} else {
			if (!_self.stack) {
				try {
					throw _self.toError();
				} catch (x) {
					_self.stack = x.stack;
				}
			}
			var stack = _debug && _self.stack ? utils.getMainStack(_self.stack, "\n") + (inner ? "" : "\n") : "";

			var logHeader = clc.whiteBright(_self.title + " > ") + clc.redBright("Error Code " + _self.code.toString().padStart(4, '0') + " / " + _self.message) + stack;
			clcText += logHeader;
			logText += logHeader + "\n";
		}

		var getErrorDetail = function (err, level) {
			var stack = _debug ? utils.getMainStack(err.stack, "\n  " + String("  ").repeat(level)) : "\n";

			var space = String("  ").repeat(level) + "\u2514\u2574";

			if (err.event) {
				return {
					clcText : clc.redBright(space + err.event.message + " Error code " + err.event.code + ".") + stack,
					logText : space + err.event.message + " Error code " + err.event.code + "." + (stack ? stack : '\n')
				}
			} else {
				return {
					clcText : space + clc.redBright(err.message) + stack,
					logText : space + err.message + (stack ? stack : '\n')
				}
			}
		};


		var breakPage = inner !== undefined && inner !== null;
		var level = 1;

		while (inner) {
			clcText += "\n";
			logText += "\n";
			var detail = getErrorDetail(inner, level);

			clcText += detail.clcText;
			logText += detail.logText;

			inner = inner.inner;
			level++;
		}

		if (breakPage) {
			clcText = "\n" + clcText + '\n';
			logText = "\n\n" + logText + '\n';
		}

		console.log(clcText);
		if (_log.settings && _log.settings.fileName) {
			utils.file.write(_log.settings.fileName, logText);
		}
		return _self;
	};

	this.throw = function (context) {
		var err = _self.toError();
		if (context !== undefined) {
			context.next(err);
		} else {
			try {
				throw err;
			} catch (x) {
				_self.stack = x.stack;
				throw err;
			}
		}
	};

	this.exit = function () {
		var err = _self.toError({
			exit : true
		});
		throw err;
	};

	_self.toError = function (params) {
		var error = new Error(this.message);
		error.inner = _self.error;
		error.event = _self;
		if (params) {
			error.exit = params.exit || false;
		}
		return error;
	};

};

module.exports = Event;

