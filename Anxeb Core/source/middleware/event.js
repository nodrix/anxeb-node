'use strict';

const utils = require('../common/utils');
const clc = require('cli-color');
const moment = require('moment');
const Stack = require('../common/stack').instance;

module.exports = {
	types    : {
		service_exception : 'service_exception',
		data_exception    : 'data_exception',
		user_exception    : 'user_exception',
		internal_error    : 'internal_error',
		http_error        : 'http_error',
		parameter_error   : 'parameter_error',
		information_alert : 'information_alert',
		exclamation_alert : 'exclamation_alert',
		debug_log         : 'debug_log',
		warning_log       : 'warning_log'
	},
	instance : function (params) {
		let _self = this;
		let _log = null;

		_self.title = [moment().format('hh:mm:ss a')];
		_self.message = null;
		_self.code = null;
		_self.type = null;
		_self.error = null;
		_self.color = null;

		let _colorMessage = null;

		if (typeof (params) === 'string') {
			_self.message = utils.internal.parameters.fill.date(params);
			_colorMessage = _self.message;
		} else {
			_self.message = utils.internal.parameters.fill.date(params.message);
			_colorMessage = _self.message;
			_self.code = params.code;
			_self.meta = params.meta;
			_self.type = params.type;
			_self.color = params.color || (_self.type === module.exports.types.debug_log ? 'green' : 'redBright');
			_self.style = params.style || 'strike';
			_log = params.log;

			if (_log.identifier) {
				_self.title = _self.title + ' / ' + _log.identifier;
			}
		}

		let _stackTrace = _log && _log.stack === true;

		_self.include = function (meta) {
			_self.meta = meta;

			return _self;
		};

		let setFeatures = function (features, value) {
			let result = value;
			let colors = {
				K : 'blackBright',
				R : 'redBright',
				G : 'greenBright',
				Y : 'yellowBright',
				B : 'blueBright',
				M : 'magentaBright',
				W : 'whiteBright',
				C : 'cyanBright',
				k : 'black',
				r : 'red',
				g : 'green',
				y : 'yellow',
				b : 'blue',
				m : 'magenta',
				w : 'white',
				c : 'cyan',
			};

			let styles = {
				B : 'bold',
				I : 'italic',
				U : 'underline',
				K : 'blink',
				V : 'inverse',
				S : 'strike'
			};

			let color = features.length > 0 ? features[0] : null;
			let background = features.length > 1 ? features[1] : null;
			let style = features.length > 2 ? features[2] : null;

			if (style === '!') {
				result = result.toString(16).toUpperCase();
			}

			if (color && colors[color]) {
				result = clc[colors[color]](result.toString());
			}

			if (background && colors[background]) {
				let capitalize = function (value) {
					return value.charAt(0).toUpperCase() + value.slice(1);
				};
				result = clc['bg' + capitalize(colors[background])](result.toString());
			}

			if (style && styles[style]) {
				result = clc[styles[style]](result.toString());
			}
			return result;
		};

		let replaceFeatures = function (text, index, value, options) {
			if (text) {
				let result = text;

				let start = text.indexOf('[' + index);
				if (start > -1) {
					let pretext = text.substr(start);

					let end = pretext.indexOf(']');
					if (end > -1) {
						let field = text.substring(start + 1, start + end);
						let parts = field.split(':');
						if (options && options.clear) {
							result = result.replaceAll('[' + field + ']', value);
						} else {
							result = result.replaceAll('[' + field + ']', setFeatures(parts.length > 1 ? parts[1] : '', value));
						}
					}
				}
				return result;
			} else {
				return text;
			}
		};

		_self.args = function () {
			let items = arguments.length > 0 && arguments[0].toString() === '[object Arguments]' ? arguments[0] : arguments;

			for (let i in items) {
				let value = items[i];

				if (value !== undefined && value !== null) {

					if (value && value.message) {
						_self.error = value;

						if (_self.message.indexOf('[inner]') > -1) {
							if (_self.error.message) {
								_self.message = _self.message.replaceAll('[inner]', value.message);
							} else {
								_self.message = _self.message.replaceAll('[inner]', '');
							}
							_colorMessage = _self.message;
						}
					} else {
						if (value !== undefined && value !== null) {
							_self.message = replaceFeatures(_self.message, i, value, {
								clear : true
							});
							_colorMessage = replaceFeatures(_colorMessage, i, value)
						}
					}
				}
			}

			_self.message = _self.message.trim();
			_colorMessage = _colorMessage.trim();
			return _self;
		};

		_self.print = function () {
			let logText = '';
			let clcText = '';

			let inner = _self.error && (_self.error.ever === undefined || _self.error.event !== this) ? _self.error : null;

			if (_self.type === module.exports.types.debug_log) {
				clcText += clc.whiteBright(_self.title) + ' > ' + clc[_self.color][_self.style](_colorMessage);
				logText += _self.title + ' > ' + _self.message + '\n';
			} else {
				if (!_self.stack) {
					try {
						throw _self.toError();
					} catch (err) {
						_self.stack = new Stack(err);
					}
				}

				let stackString = _stackTrace && _self.stack ? _self.stack.substract.main('\n') + (inner ? '' : '\n') : '';

				let clcHeader = clc.whiteBright(_self.title + ' > ') + clc[_self.color][_self.style]('Error Code ' + _self.code.toString().padStart(4, '0') + ' / ' + _colorMessage) + stackString;
				let logHeader = _self.title + ' > ' + 'Error Code ' + _self.code.toString().padStart(4, '0') + ' / ' + _self.message + stackString;

				clcText += clcHeader;
				logText += logHeader;
			}

			let getErrorDetail = function (err, level) {
				let stack = new Stack(err, {
					isInner : true
				});
				let stackString = _stackTrace ? stack.substract.main('\n  ' + String('  ').repeat(level)) : '\n';

				let space = String('  ').repeat(level) + '\u2514\u2574';

				if (err.event) {
					return {
						clcText : clc.redBright(space + err.event.message + ' Error code ' + err.event.code + '.') + stackString,
						logText : space + err.event.message + ' Error code ' + err.event.code + '.' + (stackString ? stackString : '\n')
					}
				} else {
					return {
						clcText : space + clc.redBright(err.message) + stackString,
						logText : space + err.message + (stackString ? stackString : '\n')
					}
				}
			};


			let breakPage = inner !== undefined && inner !== null;
			let level = 1;

			while (inner) {
				clcText += '\n';
				logText += '\n';
				let detail = getErrorDetail(inner, level);

				clcText += detail.clcText;
				logText += detail.logText + "\n";

				inner = inner.inner;
				level++;
			}

			if (breakPage) {
				clcText = '\n' + clcText;
				logText = '\n' + logText;
			}

			if (_log.enabled === true) {
				console.log(clcText);
				if (_log && _log.file) {
					utils.internal.file.write(_log.file, { text : logText });
				}
			}
			return _self;
		};

		this.throw = function (params) {
			let err = _self.toError(params);

			if (params && params.next) {
				params.next(err);
			} else {
				try {
					throw err;
				} catch (err) {
					_self.stack = new Stack(err);
					throw err;
				}
			}
		};

		this.exit = function () {
			let err = _self.toError({
				exit : true
			});
			throw err;
		};

		_self.toError = function (params) {
			let err = new Error(this.message);
			err.inner = _self.error;
			err.event = _self;
			err.exit = params !== undefined ? params.exit || false : false;
			err.meta = params !== undefined ? params.meta : _self.meta || null;
			return err;
		};

	}
};
