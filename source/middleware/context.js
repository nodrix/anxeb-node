'use strict';
const utils = require('../common/utils');
const sharp = require('sharp');
const request = require('request');

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
		_self.log = _self.service.log;
		_self.session = _self.req.session;
		_self.query = _self.req.query;
		_self.params = _self.req.params;
		_self.payload = _self.req.body;
		_self.application = _self.service.application;
		_self.files = _self.req.files || null;

		if (_self.route.routing.settings.context) {
			if (_self.route.routing.settings.context.properties) {
				for (let m in _self.route.routing.settings.context.properties) {
					Object.defineProperty(_self, m, {
						get : _self.route.routing.settings.context.properties[m]
					});
				}
			}

			if (_self.route.routing.settings.context.methods) {
				for (let m in _self.route.routing.settings.context.methods) {
					let obj = _self.route.routing.settings.context.methods[m];
					if (typeof obj === 'function') {
						_self[m] = obj(_self);
					} else {
						_self[m] = obj;
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
					_self.service.log.exception.invalid_request.args(err).throw(_self);
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

		_self.image = function (data, options) {
			let img = data;

			if (typeof data === 'string') {
				if (data.startsWith('data:image/jpeg;base64')) {
					data = data.replace(/^data:image\/jpeg;base64,/, '');
					img = Buffer.from(data, 'base64');
					_self.res.type('jpeg');
				} else if (data.startsWith('data:image/png;base64')) {
					data = data.replace(/^data:image\/png;base64,/, '');
					img = Buffer.from(data, 'base64');
					_self.res.type('png');
				} else {
					_self.service.log.exception.invalid_image_data.throw(_self);
				}
			}

			if (options) {
				var imageSharp = sharp(img);

				for (var action in options) {
					let pars = options[action];
					if (pars === false) {
						imageSharp = imageSharp[action]();
					} else {
						imageSharp = imageSharp[action](pars);
					}
				}

				imageSharp.toBuffer().then(function (result) {
					_self.res.end(result);
				}).catch(function (err) {
					_self.service.log.exception.invalid_image_data.args(err).throw(_self);
				});
			} else {
				_self.res.end(img);
			}
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
			_self.service.log.exception.invalid_request.throw(this);
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
				_self.service.log.exception.unauthorized_access.args(_self.req.method, _self.req.url).throw(this);
				return false;
			}
		};

		_self.login = function () {
			if (_self.req.headers.authorization) {
				if (_self.req.session == null) {
					_self.service.log.exception.session_management_inactive.throw(this);
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

		_self.proxy = function (baseUri, path) {
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
			_self.req.pipe(request({ url : url, headers : headers })).pipe(_self.res);
		};
	}
};
