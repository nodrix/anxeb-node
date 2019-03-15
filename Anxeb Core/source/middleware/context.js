'use strict';
const utils = require('../common/utils');

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
					_self[m] = _self.route.routing.settings.context.methods[m];
				}
			}
		}

		let postCall = function (payload) {
			if (_self.route.context && _self.route.context.response) {
				_self.route.context.response(_self.req, _self.res, payload);
			}

			_self.res.set('Identified', _self.req.session && _self.req.session.bearer !== null && _self.req.session.bearer !== undefined);
		};

		_self.render = function (payload) {
			if (_self.res.finished || _self.res.statusCode === 408) {
				return;
			}
			payload = payload || {};

			if (_options && _options.partial === true) {
				payload.layout = null;
			} else {
				if (_self.route.container) {
					if (_self.route.container.startsWith('.')) {
						payload.layout = _self.route.container;
					} else {
						payload.layout = utils.general.path.join(_self.service.renderer.settings.templates.containers, _self.route.container);
					}
				} else if (_self.route.parent) {
					if (_self.route.parent.view.startsWith('.')) {
						payload.layout = _self.route.parent.view;
					} else {
						payload.layout = utils.general.path.join(_self.service.renderer.settings.templates.views, _self.route.parent.view);
					}
				}
			}

			postCall(payload);
			_self.res.render(_self.route.view, payload);
		};

		_self.send = function (payload) {
			if (_self.res.finished) {
				return;
			}
			payload = payload || {};

			postCall(payload);
			_self.res.send(payload);
		};

		_self.image = function (data) {
			let img = data;

			if (data.startsWith('data:image/jpeg;base64')) {
				data = data.replace(/^data:image\/jpeg;base64,/, '');
				img = Buffer.from(data, 'base64');
				_self.res.type('jpeg');
			} else if (data.startsWith('data:image/png;base64')) {
				data = data.replace(/^data:image\/png;base64,/, '');
				img = Buffer.from(data, 'base64');
				_self.res.type('png');
			}

			_self.res.end(img);
		};

		_self.complete = function () {
			this.send();
		};

		_self.ok = function () {
			this.send();
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
			this.send(_self.service.security.sign(payload, options));
		};

		_self.auth = function (payload, options) {
			let token = _self.service.security.sign(payload, options);
			_self.req.session.bearer = { token : token };
			return token;
		};

		_self.logout = function () {
			if (_self.req.session) {
				_self.req.session.bearer = undefined;
			}
		};
	}
};
