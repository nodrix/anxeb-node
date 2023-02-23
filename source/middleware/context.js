'use strict';
const utils = require('../common/utils');
const axios = require('axios');

module.exports = {
	instance : function (route, call, options) {
		let _self = this;
		let _options = options;

		_self.route = route;
		_self.service = _self.route.service;
		_self.services = _self.route.service.server.services;
		_self.req = call.req;
		_self.res = call.res;
		_self.next = call.next;
		_self.bearer = call.bearer;
		_self.socket = _self.service.socket;
		_self.log = _self.service.log.withContext(_self);
		_self.session = _self.req.session;
		_self.query = _self.req.query;
		_self.params = _self.req.params;
		_self.payload = _self.req.body;
		_self.application = _self.service.application;
		_self.files = _self.req.files || null;

		if (_self.route.routing.settings.context) {
			if (_self.route.routing.settings.context.properties) {
				for (let key in _self.route.routing.settings.context.properties) {
					let obj = _self.route.routing.settings.context.properties[key];

					if (typeof obj === 'function') {
						Object.defineProperty(_self, key, {
							get : function () {
								return obj(_self);
							}
						});
					} else {
						_self[key] = obj;
					}
				}
			}

			if (_self.route.routing.settings.context.methods) {
				for (let key in _self.route.routing.settings.context.methods) {
					let obj = _self.route.routing.settings.context.methods[key];

					if (typeof obj === 'function') {
						_self[key] = function () {
							let args = Array.from(arguments);
							args.unshift(_self);
							return obj.apply(_self.route.routing.settings.context.methods, args);
						}
					} else {
						_self[key] = function () {
							return obj;
						}
					}
				}
			}
		}

		let postCall = function (payload) {
			if (_self.route.context && _self.route.context.response) {
				_self.route.context.response(_self.req, _self.res, payload);
			}

			if (_self.req.session && _self.req.session.bearer !== null && _self.req.session.bearer !== undefined) {
				_self.res.set('Session-Token', _self.req.session.bearer);
			}
		};

		_self.render = function (payload, template, options) {
			if (template != null) {
				_self.service.renderer.compile(template, payload, options).then(function (html) {
					_self.res.send(html);
				}).catch(function (err) {
					_self.log.exception.invalid_request.args(err).throw();
				});
			} else {
				if (_self.res.finished || _self.res.statusCode === 408) {
					return;
				}
				payload = payload || {};

				if (_options && _options.partial === true) {
					payload.layout = null;
				} else {
					if (_self.route.container) {
						payload.layout = _self.service.renderer.retrieve.container(_self.route.container);
					} else if (_self.route.parent) {
						if (typeof _self.route.parent === 'string') {
							payload.layout = _self.service.renderer.retrieve.view(_self.route.parent);
						} else {
							if (_self.route.parent.view) {
								payload.layout = _self.service.renderer.retrieve.view(_self.route.parent.view);
							}
						}
					}
				}

				postCall(payload);
				_self.res.render(_self.route.view, payload);
			}
		};

		_self.send = function (payload) {
			if (_self.res.finished) {
				return;
			}
			payload = payload || {};

			postCall(payload);
			_self.res.send(payload);
		};


		_self.file = function (filePath, options) {
			_self.res.sendFile(filePath, options)
		};

		_self.download = function (filePath, options) {
			_self.res.download(filePath, options)
		};


		_self.complete = function () {
			this.send();
		};

		_self.ok = function () {
			this.send();
		};

		_self.end = function (status, headers) {
			if (status) {
				this.res.writeHead(status, headers);
			}
			this.res.end();
		};

		_self.invalid = function () {
			_self.log.exception.invalid_request.throw();
		};

		_self.redirect = function (page) {
			_self.res.redirect(page);
		};

		_self.forward = function (func) {
			func(_self.req, _self.res, _self.next);
		};

		_self.sign = function (payload, options) {
			return _self.service.security.sign(payload, options);
		};

		_self.auth = function (payload, options) {
			let token = _self.sign(payload, options);
			_self.req.session.bearer = { token : token };
			return token;
		};

		_self.authorize = function (condition) {
			if (condition === true) {
				return true;
			} else {
				_self.log.exception.unauthorized_access.args(_self.req.method, _self.req.url).throw();
				return false;
			}
		};

		_self.login = function () {
			if (_self.req.headers.authorization) {
				if (_self.req.session == null) {
					_self.log.exception.session_management_inactive.throw();
					return null;
				} else {
					_self.req.session.bearer = {
						token : _self.req.headers.authorization.substring(7)
					};
					return _self.req.session.bearer;
				}
			} else {
				return null;
			}
		};

		_self.logout = function () {
			if (_self.req.session) {
				_self.req.session.bearer = undefined;
				return true;
			} else {
				return false;
			}
		};

		_self.proxy = async function (baseUri, path) {
			let url = null;
			if (baseUri.endsWith('/')) {
				baseUri = baseUri.substr(0, baseUri.length - 1);
			}

			if (path) {
				url = baseUri + utils.general.path.join('/', path, _self.req.url);
			} else {
				url = baseUri + utils.general.path.join('/', _self.req.url);
			}

			let headers = _self.req.headers;

			if (_self.req.session && _self.req.session.bearer && _self.req.session.bearer.token) {
				headers['Authorization'] = 'Bearer ' + _self.req.session.bearer.token;
			}

			const axres = await axios({
				url          : url,
				method       : _self.req.method.toLowerCase(),
				headers      : headers,
				responseType : 'stream'
			});

			axres.data.end = function () { };

			_self.req.pipe(axres.data).pipe(_self.res);

		};

		if (_self.service.i18n) {
			_self.translate = _self.req.__;
		}
	}
};
