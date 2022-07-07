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
		let _context = params.context;

		_self.key = params.key;
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
			_self.source = params.source;
			_self.type = params.type;
			_self.color = params.color || (_self.type === module.exports.types.debug_log ? 'green' : 'redBright');
			_self.style = params.style || null;
			_log = params.log;

			if (_log.identifier) {
				_self.title = _self.title + ' / ' + _log.identifier;
			}
		}

		if (_context != null && _context.label != null) {
			let prefix;
			if (_self.type === module.exports.types.debug_log ||
				_self.type === module.exports.types.warning_log) {
				prefix = 'debugs';
			} else if (
				_self.type === module.exports.types.information_alert ||
				_self.type === module.exports.types.exclamation_alert) {
				prefix = 'alerts';
			} else {
				prefix = 'exceptions';
			}

			const localeMsg = _context.label(`${prefix}.${_self.key}`);
			if (localeMsg != null && localeMsg !== '') {
				_self.message = localeMsg;
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

				if (value != null) {
					if (value.message) {
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
						if (typeof value === 'string' && value.startsWith('labels.') && _context != null && _context.label != null) {
							value = _context.label(value);
						}
						_self.message = replaceFeatures(_self.message, i, value, {
							clear : true
						});
						_colorMessage = replaceFeatures(_colorMessage, i, value)
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

			let clcInstance = clc;
			if (_self.color) {
				clcInstance = clcInstance[_self.color];
			}
			if (_self.style) {
				clcInstance = clcInstance[_self.style];
			}

			if (_self.type === module.exports.types.debug_log) {
				clcText += clc.whiteBright(_self.title) + ' > ' + clcInstance(_colorMessage);
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

				let clcHeader = clc.whiteBright(_self.title + ' > ') + clcInstance(clc.yellowBright('Exception ' + _self.code.toString()) + clc.whiteBright(' : ') + _colorMessage) + stackString;
				let logHeader = _self.title + ' > ' + 'Exception ' + _self.code.toString() + ' : ' + _self.message + stackString;

				clcText += clcHeader;
				logText += logHeader;
			}

			let getErrorDetail = function (err, level) {
				let stack = new Stack(err, {
					isInner : true
				});
				let stackString = _stackTrace ? stack.substract.main('\n  ' + String('  ').repeat(level)) : '';
				let space = String('  ').repeat(level) + '\u2514\u2574';
				let message = err.event ? err.event.message : err.message;

				if (message.indexOf('\n') > -1) {
					message = message.substr(0, message.indexOf('\n') - 1);
				}

				let $code = err.event ? err.event.code : err.code;
				let $codeType = 'Internal Error';

				if ($code != null && !isNaN($code) && parseInt($code) > 0) {
					$codeType = `Exception ${$code}`;
				} else if ($code != null && isNaN($code)) {
					$codeType = $code;
				}

				return {
					clcText : space + clc.yellowBright($codeType) + clc.whiteBright(' : ') + clc.redBright(message) + stackString,
					logText : space + $codeType + ' : ' + message + (stackString ? stackString : '\n')
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

			if (_context && _context.next) {
				_context.next(err);
			} else if (params && params.next) {
				params.next(err);
			}

			if (params == null || params.silent !== true) {
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
			err.exit = params != null ? params.exit || false : false;
			err.source = params && params.source ? params.source : _self.source;
			err.meta = params && params.meta ? params.meta : _self.meta;
			err.silent = params != null ? params.silent : false;

			if (params != null && params.route) {
				let route = params.route;
				err.route = {
					name       : route.name,
					type       : route.type,
					url        : route.url,
					alias      : route.alias,
					path       : route.path,
					identifier : route.identifier,
					access     : route.access,
					roles      : route.roles,
					owners     : route.owners,
					timeout    : route.timeout,
					tag        : route.tag,
				};
			}
			return err;
		};

		_self.toClient = function (params) {
			let _error = _self.toError(params);
			let _service = params ? params.service : null;

			let result = {
				message : _self.message,
				code    : _self.code,
				type    : _self.type || 'error'
			}

			if (_error.meta != null || _self.meta) {
				result.meta = _error.meta || _self.meta;
			}

			if (_error.source != null || _self.source) {
				result.source = _error.source || _self.source;
			}

			if (_service && _service.log.stack) {
				result.stack = new Stack(_error).substract.main();
			}
			return result;
		}

	}
};