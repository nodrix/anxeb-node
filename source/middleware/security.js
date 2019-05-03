'use strict';

const moment = require('moment');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const jwt = require('jsonwebtoken');
const accessType = require('./route').access;
const utils = require('../common/utils');
const https = require('https');

module.exports = {
	instance : function (service, settings) {
		let _self = this;

		_self.service = service;
		_self.settings = settings || {};
		_self.jwt = jwt;

		_self.keys = {
			verify : function (token) {
				return new Promise(function (resolve, reject) {
					jwt.verify(token, _self.keys.public, function (err, decoded) {
						if (err) {
							reject(err);
						} else {
							resolve(decoded);
						}
					});
				});
			},
			decode : function (token) {
				try {
					return jwt.verify(token, _self.keys.public);
				} catch (err) {
					return null;
				}
			}
		};

		if (_self.settings.session) {
			_self.service.express.use(session({
				name              : _self.settings.session.name || 'anxeb',
				secret            : _self.settings.session.secret || '4nx3b',
				store             : _self.settings.session.redis ? new RedisStore(_self.settings.session.redis) : null,
				resave            : _self.settings.session.resave || false,
				saveUninitialized : true
			}));
		}

		if (_self.settings.keys) {
			let getKey = function (key) {
				if (key.indexOf('/') > -1) {
					return utils.internal.file.read(_self.service.locate.keys(key));
				} else {
					return key;
				}
			};

			_self.keys.private = getKey(_self.settings.keys.private);
			_self.keys.public = getKey(_self.settings.keys.public);
			_self.keys.expiration = _self.settings.keys.expiration;
		}

		_self.sign = function (body, options) {
			if (_self.keys.private === undefined) {
				_self.service.log.exception.private_key_not_found.throw();
			}

			let _options = {};
			if (options) {
				_options = utils.general.data.copy(options);
			}

			let payload = {
				alg  : 'RS256',
				typ  : 'JWT',
				iss  : _options.iss || _self.service.domain,
				exp  : _options.exp || moment().add(_self.keys.expiration, 'seconds').valueOf() / 1000,
				nbf  : _options.nbf || moment().add(-1, 'minute').valueOf() / 1000,
				iat  : _options.iat || moment().valueOf() / 1000,
				body : body
			};

			return jwt.sign(payload, _self.keys.private, {
				algorithm : payload.alg
			});
		};

		_self.bearer = function (req, res) {
			let bearer = (req.session && req.session.bearer) || res.bearer || null;
			if (!bearer && req.headers && req.headers.authorization) {
				bearer = {
					token : req.headers.authorization.substring(7)
				}
			}

			if (bearer && bearer.token) {
				bearer.auth = _self.service.security.keys.decode(bearer.token);
			}
			return bearer;
		};

		_self.canAccess = function (params) {
			if (params.request.owners && params.request.owners !== '*' && params.request.owners.length && params.request.owners[0] !== '*' && params.identity.type) {
				if (params.request.owners.includes(params.identity.type) !== true) {
					return false;
				}
			}

			for (let c = 0; c < params.identity.claims.length; c++) {
				let claim = params.identity.claims[c];
				if (typeof (claim) === 'string') {
					if (claim.indexOf(params.request.path) > -1) {
						return true;
					}
				} else {
					var starts = claim.path[claim.path.length - 1] === '*' ? params.request.path.startsWith(claim.path.substring(0, claim.path.length - 1)) : false;
					var same = claim.path === params.request.path;

					if ((claim.path === '*' || starts || same) && (claim.method === '*' || params.request.method.toLowerCase() === claim.method.toLowerCase())) {
						return true;
					}
				}
			}

			if (params.identity.roles && params.identity.roles.length) {
				if (params.identity.roles === '*') {
					return true;
				}
				if (params.identity.roles.includes('*') === true) {
					return true;
				}
			}

			if (params.request.roles === '*') {
				return true;
			}

			if (params.request.roles && params.request.roles.length > 0) {
				for (let r = 0; r < params.request.roles.length; r++) {
					let requestRole = params.request.roles[r];
					if (requestRole === '*') {
						return true;
					}
					if (params.identity.roles && params.identity.roles.length) {
						if (params.identity.roles.includes(requestRole) === true) {
							return true;
						}
					}
				}
			}
		};

		_self.checkpoint = function (params, req, res, next) {
			return new Promise(function (resolve) {
				if (params.access === accessType.private) {
					let bearer = _self.bearer(req, res);
					if (bearer && bearer.token) {
						if (_self.keys) {
							_self.keys.verify(bearer.token).then(function (auth) {
								if (!auth.body.roles || !auth.body.claims || !_self.canAccess({
									identity : {
										claims : auth.body.claims,
										roles  : auth.body.roles,
										type   : auth.body.type
									},
									request  : {
										roles  : params.roles,
										owners : params.owners,
										path   : params.path,
										method : req.method
									}
								})) {
									_self.service.log.exception.unauthorized_access.args(req.method, req.url).throw({ next : next });
								} else {
									resolve();
								}
							}).catch(function (err) {
								if (err.message === 'jwt expired') {
									_self.service.log.exception.expired_token.throw({ next : next });
								} else {
									_self.service.log.exception.invalid_auth.args(err).throw({ next : next });
								}
							});
						} else {
							_self.service.log.exception.security_keys_not_defined.throw({ next : next });
						}
					} else {
						_self.service.log.exception.unauthorized_access.args(req.method, req.url).throw({ next : next });
					}
				} else {
					resolve();
				}
			});
		};
	}
};