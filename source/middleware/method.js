'use strict';

const Context = require('./context').instance;

module.exports = {
	types    : {
		get    : 'get',
		post   : 'post',
		put    : 'put',
		delete : 'delete'
	},
	instance : function (route, base, func, type) {
		let _self = this;
		_self.route = route;
		_self.access = route.access;
		_self.service = route.service;
		_self.type = type;
		_self.base = base;

		let _func = func;

		let dispatch = function (req, res, next, options) {
			let bearer = _self.service.security.route.bearer(req, res);

			if ((!bearer || bearer.auth === null || bearer.auth === undefined) && _self.access === 'private') {
				_self.service.log.exception.unauthorized_access.args(req.method, req.url).throw();
			}

			res.set('Route-Type', _self.route.type);
			res.set('Access-Type', _self.route.access);

			if (_self.route.context && _self.route.context.request) {
				_self.route.context.request(req, res);
			}

			_func(new Context(_self.route, {
				req    : req,
				res    : res,
				next   : next,
				bearer : bearer
			}, options));

			res.setTimeout(_self.route.timeout || 5000, function () {
				_self.service.log.exception.request_timeout.throw({ next : next });
			});
		};

		_self.base.route[_self.type](function (req, res, next) {
			dispatch(req, res, next);
		});

		_self.dispatch = function (req, res, next, options) {
			_self.service.security.route.checkpoint({
				access : _self.base.access || _self.route.access,
				path   : _self.base.path || _self.route.path,
				roles  : _self.base.roles || _self.route.roles,
				owners : _self.base.owners || _self.route.owners,
			}, req, res, next).then(function () {
				dispatch(req, res, next, options);
			});
		}
	}
};
