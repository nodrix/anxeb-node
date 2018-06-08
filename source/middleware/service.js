'use strict';

const utils = require("../common/utils");
const moment = require("moment");
const Log = require("../middleware/log");
const Data = require("../middleware/data");
const Bundler = require("../middleware/bundler");
const Client = require("../middleware/client");
const Enums = require("../middleware/enums");
const Action = require("../middleware/action");
const State = require("../middleware/state");
const Job = require("../middleware/job");
const ServiceHelper = require("../middleware/service.helper");
const exjwt = require('express-jwt');
const jwt = require('jsonwebtoken');

const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require('http');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors")();
const session = require("express-session");
const RedisStore = require('connect-redis')(session);
const favicon = require('serve-favicon');
const hbs = require('express-hbs');
const Handlebars = require('handlebars');
const sio = require("socket.io");
const schedule = require("node-schedule");
const request = require('request');

module.exports = function (server, params) {
	var _self = this;
	var _defaultConfiguration = {};

	_self.log = new Log();

	if (params.name === undefined) {
		_self.log.exception.missing_param_name.exit();
	}

	if (params.settings.service.paths === undefined) {
		_self.log.exception.missing_param_paths.exit();
	}

	utils.fillServerParameters(server, params);

	_self.name = params.name;
	_self.key = params.key;
	_self.domain = params.domain;
	_self.active = params.active;
	_self.configuration = params.configuration || {};
	_self.settings = params.settings;
	_self.callbacks = params.callbacks || {};
	_self.initialize = params.initialize;
	_self.actions = {};
	_self.states = {};
	_self.jobs = {};
	_self.clients = [];
	_self.application = {};

	_self.server = server;

	_self.locate = new utils.locate(_self.server.paths.source);
	_self.defaults = {
		states : {
			exception : null,
			login     : null
		}
	};

	_self.storage = {
		save  : function (filePath, text) {
			utils.file.write(path.join(_self.server.settings.paths.storage, filePath), text, true);
		},
		fetch : function (filePath, callback) {
			utils.file.fetch(path.join(_self.server.settings.paths.storage, filePath), callback);
		}
	};

	params.settings.log.debug = params.settings.log.debug !== undefined ? params.settings.log.debug : (_self.settings.debug !== undefined ? _self.settings.debug : (_self.server.settings.debug !== undefined ? _self.server.settings.debug : false));

	_self.log.start({
		identifier : params.name,
		settings   : params.settings.log
	});

	_self.schedule = schedule;
	if (_self.settings.data) {
		_self.data = new Data(_self);
	}
	_self.bundler = new Bundler(_self);
	_self.express = express();
	_self.socket = sio(http.createServer(_self.express));

	_self.express.use(cors);
	_self.express.use(bodyParser.json({ limit : '50mb' }));
	_self.express.use(express.static(_self.locate.path(_self.settings.service.paths.static)));
	_self.express.use(bodyParser.urlencoded({ limit : '50mb', extended : true }));

	if (_self.settings.service.paths.favicon) {
		_self.express.use(favicon(_self.locate.path(_self.settings.service.paths.favicon)));
	}

	if (_self.settings.service.security.session) {
		_self.express.use(session({
			name              : _self.settings.service.security.session.name || 'anxeb',
			secret            : _self.settings.service.security.session.secret || '4nx3b',
			store             : _self.settings.service.redis ? new RedisStore(_self.settings.service.redis) : null,
			resave            : false,
			saveUninitialized : true
		}));
	}

	if (_self.settings.service.security.keys) {
		var getKey = function (key) {
			if (key.indexOf('/') > -1) {
				return utils.file.read(path.join(_self.server.settings.paths.keys, key));
			} else {
				return key;
			}
		};

		_self.keys = {
			secret     : _self.settings.service.security.keys.secret ? getKey(_self.settings.service.security.keys.secret) : null,
			private    : getKey(_self.settings.service.security.keys.private),
			public     : getKey(_self.settings.service.security.keys.public),
			expiration : _self.settings.service.security.keys.expiration,
			verify     : function (token, callback) {
				jwt.verify(token, this.public, callback);
			},
			decode     : function (token) {
				try {
					return jwt.verify(token, this.public);
				} catch (err) {
					return null;
				}
			}
		};

		if (_self.keys.secret) {
			_self.express.use(exjwt({
				secret              : new Buffer(_self.keys.secret, 'hex'),
				credentialsRequired : false,
				resultProperty      : 'bearer'
			}));
		}
	}

	_self.sign = function (body, options) {
		if (_self.keys.private === undefined) {
			_self.log.exception.private_key_not_found.throw();
		}

		var _options = {};
		if (options) {
			_options = utils.copy(options);
		}

		var payload = {
			alg  : "RS256",
			typ  : "JWT",
			iss  : _options.iss || _self.domain,
			exp  : _options.exp || moment().add(_self.keys.expiration, 'seconds').valueOf() / 1000,
			nbf  : _options.nbf || moment().add(-1, 'minute').valueOf() / 1000,
			iat  : _options.iat || moment().valueOf() / 1000,
			body : body
		};

		return jwt.sign(payload, _self.keys.private, {
			algorithm : payload.alg
		});
	};

	_self.router = express.Router();
	_self.express.use(_self.router);

	if (_self.settings.service.paths.templates && _self.settings.service.paths.templates.views) {
		_self.express.set('views', _self.locate.path(_self.settings.service.paths.templates.views));
	}

	_self.express.engine('hbs', hbs.express4({
		handlebars  : Handlebars,
		extname     : '.hbs',
		partialsDir : _self.settings.service.paths.templates ? _self.locate.path(_self.settings.service.paths.templates.partials) : null,
		layoutsDir  : _self.settings.service.paths.templates ? _self.locate.path(_self.settings.service.paths.templates.containers) : null,
		onCompile   : function (exhbs, source, filename) {
			var html = source.replace("{{{view}}}", "<div ui-view>{{{body}}}</div>");
			return exhbs.handlebars.compile(html);
		}
	}));

	_self.express.set('view engine', 'hbs');

	_self.express.use(function (req, res, next) {
		var err = _self.log.exception.page_not_found.args(req.url).print().toError();
		_self.send.error(req, res, err, 404);
	});

	_self.express.use(function (err, req, res, next) {
		var event = null;

		if (err.event !== undefined) {
			event = err.event;
		} else {
			event = _self.log.exception.unhandled_exception.args(err.message, err);
			err = event.toError();
		}
		event.print();

		_self.send.error(req, res, err, event.type === Enums.EventType.HttpError ? event.code : 500);
	});

	_self.include = {
		callback : function (name, params) {
			if (params) {
				var cb = {};
				var getType = {};
				if (getType.toString.call(params) === '[object Function]') {
					cb.name = name;
					cb.callback = params;
				} else {
					cb.name = params.name || name;
					cb.callback = params.callback;
				}
				_self.callbacks[cb.name] = cb;
			}
		},
		state    : function (name, params) {
			if (params) {
				params.name = params.name || name;

				var stateObject = new State(_self, params);

				if (stateObject.type === Enums.StateType.Login) {
					_self.defaults.states.login = stateObject;
				} else if (stateObject.type === Enums.StateType.Exception) {
					_self.defaults.states.exception = stateObject;
				}

				if (stateObject.type !== Enums.RouteType.Exception) {
					_self.states[stateObject.name] = stateObject;
				}
			}
		},
		action   : function (name, params) {
			if (params) {
				params.name = params.name || name;
				_self.actions[params.name] = new Action(_self, params);
			}
		},
		job      : function (name, params) {
			if (params) {
				params.name = params.name || name;
				_self.jobs[params.name] = new Job(_self, params);
			}
		}
	};

	if (params.settings.service.paths.events) {
		var eventsPath = path.join(_self.server.settings.paths.source, params.settings.service.paths.events);

		utils.file.modules(eventsPath).map(function (events) {
			_self.log.include(events.module);
		});
	}

	if (params.settings.service.paths.callbacks) {
		var callbacksPath = path.join(_self.server.settings.paths.source, params.settings.service.paths.callbacks);

		utils.file.modules(callbacksPath).map(function (callback) {
			_self.include.callback(callback.name, callback.module);
		});
	}

	if (params.settings.service.paths.states) {
		var statesPath = path.join(_self.server.settings.paths.source, params.settings.service.paths.states);

		utils.file.modules(statesPath).map(function (state) {
			_self.include.state(state.name, state.module);
		});
	}

	if (params.settings.service.paths.actions) {
		var actionsPath = path.join(_self.server.settings.paths.source, params.settings.service.paths.actions);

		utils.file.modules(actionsPath).map(function (action) {
			_self.include.action(action.name, action.module);
		});
	}

	if (params.settings.service.paths.jobs) {
		var jobsPath = path.join(_self.server.settings.paths.source, params.settings.service.paths.jobs);

		utils.file.modules(jobsPath).map(function (job) {
			_self.include.job(job.name, job.module);
		});
	}

	_self.socket.on('connection', function (clientSocket) {
		var client = new Client(_self, { socket : clientSocket, index : _self.clients.length });
		_self.clients.push(client);
		clientSocket.on('disconnect', function () {
			_self.clients.splice(_self.clients.indexOf(client), 1);
		});
	});

	ServiceHelper.setInternatRoutes(_self);

	_self.send = {
		error : function (req, res, err, status) {
			var response = utils.getClientError(err, _self.log.settings.debug);
			res.status(status || 500);

			var isClient = req && req.headers && req.headers.source === "Client";

			if (isClient) {
				res.json(response);
			} else if (_self.defaults.states.login && (
					err.event.code === _self.log.exception.unauthorized_access.code ||
					err.event.code === _self.log.exception.invalid_auth.code ||
					err.event.code === _self.log.exception.expired_token.code ||
					err.event.code === _self.log.exception.invalid_token.code)
			) {
				res.redirect(_self.defaults.states.login.path);
			} else {
				if (_self.defaults.states.exception !== null) {
					response.layout = _self.defaults.states.exception.container;
					res.render(_self.defaults.states.exception.view, response);
				} else {
					res.send(response);
				}
			}
		}
	};

	_self.start = function (callback) {
		Handlebars.registerPartial('anxeb', _self.bundler.anxeb());
		Handlebars.registerPartial('anxeb.init', _self.bundler.init());
		Handlebars.registerPartial('anxeb.middleware', _self.bundler.middleware());
		Handlebars.registerPartial('anxeb.controllers', _self.bundler.controllers());

		Handlebars.registerHelper('part', function (name) {
			var blocks = this._blocks;
			var content = blocks && blocks[name];

			return content ? content.join('\n') : null;
		});

		Handlebars.registerHelper('partContent', function (name, options) {
			var blocks = this._blocks || (this._blocks = {}),
				block = blocks[name] || (blocks[name] = []);

			if (block.length === 0) {
				block.push(options.fn(this).trim());
			} else {
				block.push(options.fn(this));
			}
		});

		var startJobs = function () {
			for (var j in _self.jobs) {
				_self.jobs[j].start();
			}
		};

		var beginListening = function (callback) {
			console.log('');
			_self.log.debug.service_instance_starting.args(_self.key, _self.settings.service.host, _self.settings.service.port).print();

			_self.socket.httpServer.listen(_self.settings.service.port, _self.settings.service.host, function () {
				_self.log.debug.service_instance_started.args((_self.settings.service.protocol ? _self.settings.service.protocol : 'http') + '://' + _self.settings.service.host + ':' + _self.settings.service.port).print();
				if (_self.data) {
					_self.data.connect(function () {
						startJobs();
						if (callback) {
							callback();
						}
					});
				} else {
					startJobs();
					if (callback) {
						callback();
					}
				}
			}).on('error', function (err) {
				setTimeout(beginListening, 2000);
				_self.log.exception.http_server_initialization_failed.args(_self.settings.service.host, _self.settings.service.port, err).throw();
			});
		};

		var setupConfiguration = function () {
			_self.configuration.save = function () {
				_self.storage.save(configFileName, JSON.stringify(_self.configuration));
			};

			_self.configuration.reset = function () {
				_self.configuration = utils.copy(_defaultConfiguration);
				_self.storage.save(configFileName, JSON.stringify(_self.configuration));
				setupConfiguration();
			};
		};

		var init = function () {
			beginListening(function () {
				if (_defaultConfiguration && _defaultConfiguration.overwrite) {
					_self.log.debug.config_overwrite_warning.print();
				}
				_self.log.debug.service_initialized.args(_self.key).print();

				if (_self.initialize) {
					_self.initialize(_self, _self.application);
				}
				if (callback) {
					callback();
				}
			});
			setupConfiguration();
		};

		if (_self.configuration) {
			_defaultConfiguration = utils.copy(_self.configuration);
			var configFileName = path.join('config', _self.key + '.json');
			_self.storage.fetch(configFileName, function (err, data) {
				if (_defaultConfiguration.overwrite || err) {
					_self.storage.save(configFileName, JSON.stringify(_self.configuration));
				} else {
					_self.configuration = JSON.parse(data);
				}
				init();
			});
		} else {
			init();
		}
	};

	_self.request = request;

	Object.defineProperty(_self, "models", {
		get : function () {
			if (_self.data) {
				if (_self.data.connected) {
					return _self.data.models;
				} else {
					_self.log.exception.data_server_offline.throw();
				}
			}
			return null;
		}
	});

};
