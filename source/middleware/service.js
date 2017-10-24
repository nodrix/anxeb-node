'use strict';

const utils = require("../common/utils");
const Log = require("../middleware/log");
const Data = require("../middleware/data");
const Bundler = require("../middleware/bundler");
const Client = require("../middleware/client");
const Enums = require("../middleware/enums");
const Action = require("../middleware/action");
const State = require("../middleware/state");
const Job = require("../middleware/job");
const ServiceHelper = require("../middleware/service.helper");

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

module.exports = function (server, params) {
	var _self = this;

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
	_self.active = params.active;
	_self.settings = params.settings;
	_self.callbacks = params.callbacks || {};
	_self.actions = {};
	_self.states = {};
	_self.jobs = {};
	_self.clients = [];

	_self.server = server;
	_self.locate = new utils.locate(_self.server.paths.root);
	_self.defaults = {
		states : {
			exception : null,
			login     : null
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
	_self.express.use(bodyParser.json());
	_self.express.use(express.static(_self.locate.path(_self.settings.service.paths.static)));
	_self.express.use(bodyParser.urlencoded({ extended : true }));
	if (_self.settings.service.paths.favicon) {
		_self.express.use(favicon(_self.locate.path(_self.settings.service.paths.favicon)));
	}

	_self.express.use(session({
		name              : _self.settings.service.security ? _self.settings.service.security.session : 'anxeb' || 'anxeb',
		secret            : _self.settings.service.security ? _self.settings.service.security.secret : '4nx3b' || '4nx3b',
		store             : _self.settings.service.redis ? new RedisStore(_self.settings.service.redis) : null,
		resave            : false,
		saveUninitialized : true
	}));

	_self.router = express.Router();
	_self.express.use(_self.router);

	if (_self.settings.service.paths.templates && _self.settings.service.paths.templates.views) {
		_self.express.set('views', _self.locate.path(_self.settings.service.paths.templates.views));
	}

	_self.express.engine('hbs', hbs.express4({
		handlebars  : Handlebars,
		extname     : '.hbs',
		partialsDir : _self.settings.service.paths.templates ? _self.locate.path(_self.settings.service.paths.templates.partials) : null,
		layoutsDir  : _self.settings.service.paths.templates ? _self.locate.path(_self.settings.service.paths.templates.containers) : null
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
		var eventsPath = path.join(_self.server.settings.paths.root, params.settings.service.paths.events);

		utils.file.modules(eventsPath).map(function (events) {
			_self.log.include(events.module);
		});
	}

	if (params.settings.service.paths.callbacks) {
		var callbacksPath = path.join(_self.server.settings.paths.root, params.settings.service.paths.callbacks);

		utils.file.modules(callbacksPath).map(function (callback) {
			_self.include.callback(callback.name, callback.module);
		});
	}

	if (params.settings.service.paths.states) {
		var statesPath = path.join(_self.server.settings.paths.root, params.settings.service.paths.states);

		utils.file.modules(statesPath).map(function (state) {
			_self.include.state(state.name, state.module);
		});
	}

	if (params.settings.service.paths.actions) {
		var actionsPath = path.join(_self.server.settings.paths.root, params.settings.service.paths.actions);

		utils.file.modules(actionsPath).map(function (action) {
			_self.include.action(action.name, action.module);
		});
	}

	if (params.settings.service.paths.jobs) {
		var jobsPath = path.join(_self.server.settings.paths.root, params.settings.service.paths.jobs);

		utils.file.modules(jobsPath).map(function (job) {
			_self.include.job(job.name, job.module);
		});
	}

	_self.socket.on('connection', function (clientSocket) {
		_self.log.debug.socket_client_connected.args(clientSocket.id, _self.clients.length).print();
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
			} else if (err.event.code === _self.log.exception.unauthorized_access.code && _self.defaults.states.login) {
				res.redirect(_self.defaults.states.login.path);
				_self.log.debug.redirect_to.args(_self.defaults.states.login.path).print();
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

	_self.start = function () {
		Handlebars.registerPartial('anxeb', _self.bundler.anxeb());
		Handlebars.registerPartial('anxeb.all', _self.bundler.all());
		Handlebars.registerPartial('anxeb.init', _self.bundler.init());
		Handlebars.registerPartial('anxeb.middleware', _self.bundler.middleware());
		Handlebars.registerPartial('anxeb.vendors', _self.bundler.vendors());
		Handlebars.registerPartial('anxeb.controllers', _self.bundler.controllers());

		Handlebars.registerHelper('part', function(name) {
			var blocks  = this._blocks;
			var content = blocks && blocks[name];

			return content ? content.join('\n') : null;
		});

		Handlebars.registerHelper('partContent', function (name, options) {
			var blocks = this._blocks || (this._blocks = {}),
				block  = blocks[name] || (blocks[name] = []);

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

		var beginListening = function () {
			_self.log.debug.service_instance_starting.args(_self.settings.service.host, _self.settings.service.port).print();

			_self.socket.httpServer.listen(_self.settings.service.port, _self.settings.service.host, function () {
				_self.log.debug.service_instance_started.args(_self.settings.service.host, _self.settings.service.port).print();
				if (_self.data) {
					_self.data.connect();
				}
				startJobs();
			}).on('error', function (err) {
				setTimeout(beginListening, 2000);
				_self.log.exception.http_server_initialization_failed.args(_self.settings.service.host, _self.settings.service.port, err).throw();
			});
		};

		beginListening();
	};


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
