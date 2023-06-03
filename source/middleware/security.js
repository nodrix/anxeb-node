'use strict';

const moment = require('moment');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis')
const jwt = require('jsonwebtoken');
const accessType = require('./route').access;
const utils = require('../common/utils');

module.exports = {
	instance : function (service, settings) {
		let _self = this;

		let _redisConnected = false;
		let _redisClient = null;

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

		_self.canAccess = function (params) {
			let methodName = params.request.method.toLowerCase();

			if (params.request.owners != null && params.identity.type != null) {
				if (typeof params.request.owners === 'string') {
					if (params.request.owners !== '*' && params.identity.type !== params.request.owners) {
						return false;
					}
				} else if (params.request.owners instanceof Array && params.request.owners.length > 0) {
					if (params.request.owners[0] !== '*' && !params.request.owners.includes(params.identity.type)) {
						return false;
					}
				} else if (typeof params.request.owners === 'object') {
					let methodOwners = params.request.owners[methodName];
					if (methodOwners != null) {
						if (typeof methodOwners === 'string') {
							if (methodOwners !== '*' && params.identity.type !== methodOwners) {
								return false;
							}
						} else if (methodOwners instanceof Array && methodOwners.length > 0) {
							if (methodOwners[0] !== '*' && !methodOwners.includes(params.identity.type)) {
								return false;
							}
						}
					}
				}
			}

			for (let c = 0; c < params.identity.claims.length; c++) {
				let claim = params.identity.claims[c];
				if (typeof (claim) === 'string') {
					if (claim.indexOf(params.request.path) > -1) {
						return true;
					}
				} else {
					let starts = claim.path[claim.path.length - 1] === '*' ? params.request.path.startsWith(claim.path.substring(0, claim.path.length - 1)) : false;
					let same = claim.path === params.request.path;

					if ((claim.path === '*' || starts || same) && (claim.method === '*' || methodName === claim.method.toLowerCase())) {
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

			if (params.request.roles != null && params.identity.roles != null && params.identity.roles.length) {
				if (typeof params.request.roles === 'string') {
					if (params.request.roles === '*' || params.identity.roles.includes(params.request.roles)) {
						return true;
					}
				} else if (params.request.roles instanceof Array && params.request.roles.length > 0) {
					return params.request.roles.iterate((requestRole) => {
						if (requestRole === '*') {
							return true;
						}
						if (params.identity.roles.includes(requestRole)) {
							return true;
						}
					}) || false;
				} else if (typeof params.request.roles === 'object') {
					let methodRoles = params.request.roles[methodName];
					if (methodRoles != null) {
						if (typeof methodRoles === 'string') {
							if (methodRoles === '*' || params.identity.roles.includes(methodRoles)) {
								return true;
							}
						} else if (methodRoles instanceof Array && methodRoles.length > 0) {
							return methodRoles.iterate((requestRole) => {
								if (requestRole === '*') {
									return true;
								}
								if (params.identity.roles.includes(requestRole)) {
									return true;
								}
							}) || false;
						}
					}
				}
			}
		};

		let _handleException = function (exception, internal) {
			if (internal.printException) {
				if (internal.next) {
					exception.print().throw({ next : internal.next });
				} else {
					exception.print().throw();
				}
			} else if (internal.next) {
				exception.throw({ next : internal.next });
			} else {
				exception.throw();
			}
		};

		let _checkpoint = async function (params, internal) {
			if (params.access === accessType.private) {
				let bearer = internal.bearer;
				if (bearer && bearer.token) {
					if (_self.keys) {
						try {
							let auth = await _self.keys.verify(bearer.token);
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
									method : internal.method
								}
							})) {
								return _handleException(_self.service.log.exception.unauthorized_access.args(internal.method, internal.url), internal);
							}
						} catch (err) {
							if (err.message === 'jwt expired') {
								if (internal.session != null) {
									internal.session.bearer = null;
								}
								return _handleException(_self.service.log.exception.expired_token, internal);
							} else {
								return _handleException(_self.service.log.exception.invalid_auth.args(err), internal);
							}
						}
					} else {
						return _handleException(_self.service.log.exception.security_keys_not_defined, internal);
					}
				} else {
					return _handleException(_self.service.log.exception.unauthorized_access.args(internal.method, internal.url), internal);
				}
			}
		};

		_self.check = function () {
			if (_redisConnected === true) {
				_self.service.log.debug.redis_client_connected.args(_redisClient.connection_options.host, _redisClient.connection_options.port, _self.service.key).print();
			}
		}

		_self.route = {
			checkpoint : async function (params, req, res, next) {
				return await _checkpoint(params, {
					session : req.session,
					bearer  : _self.route.bearer(req, res),
					url     : req.url,
					method  : req.method,
					next    : next
				});
			},
			bearer     : function (req, res) {
				let bearer = (req.session && req.session.bearer) || res.bearer || null;
				if (!bearer && req.headers && req.headers.authorization) {
					bearer = {
						token : req.headers.authorization.substring(7)
					}
				}

				if (!bearer && req.query._token) {
					bearer = {
						token : req.query._token
					}
				}

				if (bearer && bearer.token) {
					bearer.auth = _self.service.security.keys.decode(bearer.token);
				}
				return bearer;
			}
		};

		_self.socket = {
			checkpoint : async function (params) {
				return await _checkpoint(params, {
					session        : null,
					bearer         : _self.socket.bearer(params.authorization),
					url            : params.url,
					method         : 'emit',
					next           : null,
					printException : params.printException
				});
			},
			bearer     : function (authorization) {
				let bearer = authorization ? {
					token : authorization.substring(7)
				} : null;

				if (bearer && bearer.token) {
					bearer.auth = _self.service.security.keys.decode(bearer.token);
				}
				return bearer;
			}
		};

		if (_self.settings.session) {
			let _settings = utils.general.data.copy(_self.settings.session);
			_settings.name = _settings.name || 'anxeb';
			_settings.secret = _settings.secret || '4nx3b'
			_settings.resave = _settings.resave != null ? _settings.resave : false;
			_settings.saveUninitialized = _settings.saveUninitialized != null ? _settings.saveUninitialized : true;

			if (_settings.redis != null) {
				let options = _settings.redis === true ? {} : _settings.redis
				_redisClient = redis.createClient(options);

				_redisClient.on('error', function (err) {
					if (_redisConnected === true) {
						_redisConnected = false;
						if (_self.service.initialized) {
							_self.service.log.exception.redis_client_error.args(err).print();
						}
					}
				});

				_redisClient.on('reconnecting', function () {
					if (_redisConnected === false) {
						if (_self.service.initialized === true) {
							_self.service.log.debug.redis_client_reconnecting.args(_redisClient.connection_options.host, _redisClient.connection_options.port, _self.service.key).print();
						}
					}
				});

				_redisClient.on('connect', function () {
					_redisConnected = true;
					if (_self.service.initialized === true) {
						_self.service.log.debug.redis_client_connected.args(_redisClient.connection_options.host, _redisClient.connection_options.port, _self.service.key).print();
					}
				});

				delete _settings.redis;
				_settings.store = new RedisStore({ client : _redisClient });
				_self.service.redis = _redisClient;
				_self.service.express.use(session(_settings));
			} else {
				_self.service.express.use(session(_settings));
			}
		}
	}
};