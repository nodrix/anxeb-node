'use strict';

var path = require('path');
var clc = require("cli-color");
var moment = require("moment");
var fs = require("fs");
var mkpath = require("mkpath");
var URL = require("url-parse");

var utils = {
	data                 : {
		populate : function (obj, source) {
			var model = obj._doc || obj;
			for (var i in model) {
				if (source[i] !== undefined && i !== '_id') {
					obj[i] = source[i];
				}
			}
		},
		parse    : {
			error : function (err, inner) {
				if (err && err.name === 'ValidationError') {
					var fields = [];
					var message = '';

					for (var field in err.errors) {

						var item = err.errors[field];
						var fName = item.message;

						var inx = fName.indexOf('/');
						if (inx > -1) {
							var index = parseInt(fName.substring(0, inx));
							fName = fName.substring(inx + 1);
							fields.push({
								name  : field,
								index : index
							});
						} else {
							fields.push({
								name  : fName,
								index : -1
							});
						}
						message += (message.length ? ', ' : '') + fName;
					}

					err = inner.args(message).toError({ meta : { fields : fields } });
				}
				return err;
			}
		}
	},
	copy                 : function (obj) {
		if (obj) {
			return JSON.parse(JSON.stringify(obj));
		} else {
			return null;
		}
	},
	url                  : function (url) {
		return new URL(url)
	},
	file                 : {
		fetch   : function (filePath, callback) {
			filePath = utils.fillDateParameters(filePath);

			return fs.readFile(filePath, 'utf8', callback);
		},
		read    : function (filePath) {
			filePath = utils.fillDateParameters(filePath);
			return fs.readFileSync(filePath)
		},
		write   : function (filePath, text, replace) {
			filePath = utils.fillDateParameters(filePath);

			var doAppend = function (canCreateDirectory) {
				try {
					if (replace) {
						fs.writeFileSync(filePath, text);
					} else {
						fs.appendFileSync(filePath, text);
					}
				} catch (err) {
					if (err.code === "ENOENT" && canCreateDirectory) {
						createDir(path.dirname(filePath));
					} else {
						console.log(clc.redBright("Could not log event. " + err.message));
					}
				}
			};

			var createDir = function (dirPath) {
				try {
					mkpath.sync(dirPath);
					doAppend();
				} catch (err) {
					if (err !== null) {
						console.log(clc.redBright("Could not create log directory. " + err.message));
					} else {
						doAppend(false);
					}
				}
			};

			doAppend(true);
		},
		modules : function (modulesPath) {
			if (fs.existsSync(modulesPath)) {

				var files = fs.readdirSync(modulesPath);

				return files.filter(function (file) {
					return file.endsWith(".js");
				}).map(function (script) {
					var modulePath = path.join(modulesPath, script);
					return {
						module : require(modulePath),
						name   : script.replace(".js", "")
					}
				});
			} else {
				return [];
			}
		},
		list    : function (params) {
			var allFiles = fs.readdirSync(params.path);
			return allFiles.filter(function (fileName) {
				return fileName.endsWith(params.endsWith);
			});
		},
		exists  : fs.existsSync
	},
	join                 : path.join,
	fillCommonParameters : function (value) {
		var result = value;
		result = result.replace("[node_version]", process.version);
		return result;
	},
	fillDateParameters   : function (value) {
		var result = value;
		result = result.replace("[date]", moment().format('dddd DD/MM/YYYY'));
		result = result.replace("[time]", moment().format('h:mm:ss a'));
		result = result.replace("[year]", moment().format("YYYY"));
		result = result.replace("[month_name]", moment().format("MMMM").toLowerCase());
		result = result.replace("[day]", moment().format("DD"));
		return utils.fillCommonParameters(result);
	},
	fillServerParameters : function (serverParams, instanceParams) {
		var replaceFromServerParams = function (value) {
			var result = value;
			result = result.replace("[server_name]", serverParams.name);
			result = result.replace("[server_key]", serverParams.key);
			result = result.replace("[server_logs_path]", serverParams.settings.paths.logs);
			result = result.replace("[server_root_path]", serverParams.settings.paths.root);
			result = result.replace("[server_source_path]", serverParams.settings.paths.source);
			result = result.replace("[server_certs_path]", serverParams.settings.paths.certs);
			result = result.replace("[server_instances_path]", serverParams.settings.paths.instances);
			return utils.fillCommonParameters(result);
		};

		var replaceFromInstanceParams = function (value) {
			var result = value;
			result = result.replace("[instance_name]", instanceParams.name);
			result = result.replace("[instance_key]", instanceParams.key);
			result = result.replace("[instance_service_port]", instanceParams.settings.service.port);
			result = result.replace("[node_version]", process.version);
			return utils.fillCommonParameters(result);
		};

		if (serverParams !== undefined) {
			serverParams.settings.log.fileName = replaceFromServerParams(serverParams.settings.log.fileName);

			if (instanceParams !== undefined) {
				instanceParams.settings.log.fileName = replaceFromServerParams(replaceFromInstanceParams(instanceParams.settings.log.fileName));
			}
		}
	},
	locate               : function (rootPath) {
		var _self = this;
		_self.rootPath = rootPath;

		_self.path = function () {
			var paths = arguments;
			var result = _self.rootPath;
			for (var i = 0; i < paths.length; i++) {
				if (paths[i]) {
					result = path.join(result, paths[i]);
				}
			}
			return result;
		};
	},
	getMainStack         : function (stackString, prefix) {
		if (!stackString) {
			return '';
		}
		var lines = stackString.split("\n");
		var lastLine = null;

		for (var i in lines) {
			if (lines[i]) {
				var line = lines[i].toString();
				var fromPrintMethod = (line.includes("_self.print (/") && line.includes("middleware/event.js"));
				var fromErrorMethod = (line.includes("toError (/") && line.includes("middleware/event.js"));
				var fromThrowMethod = ((line.includes("throw (/") || line.includes("exit (/")) && (line.includes("middleware/log.js") || line.includes("middleware/event.js")));
				var fromExitMethod = (line.includes("exit (/") && line.includes("middleware/log.js"));

				var notAt = !line.startsWith("    at ");
				var isModule = line.includes("node_modules");

				if (notAt || isModule || fromErrorMethod || fromThrowMethod || fromExitMethod || fromPrintMethod) {

				} else {
					var st = line.indexOf("/");
					if (st > 0) {
						var link = line.substring(st);
						link = link.replace(")", "").replace("(", "").replace("\n", "");
						if (prefix) {
							return prefix + link;
						}
						return link;
					}
				}
			}
		}

		if (lastLine === null) {
			return "";
		}
		if (prefix) {
			return prefix + lastLine;
		}
		return lastLine;
	},
	getClientError       : function (err, debug) {
		var result = {
			message : err.message,
			code    : err.event !== undefined ? err.event.code : 0,
			stack   : debug ? this.getMainStack(err.stack) : null,
			meta    : err.meta !== undefined ? err.meta : undefined,
			inner   : null
		};

		var inner = err;
		var inres = result;

		while (true) {
			inner = inner.inner;
			if (inner === null || inner === undefined) {
				break;
			} else {
				inres.inner = {
					message : inner.message,
					code    : inner.event !== undefined ? inner.event.code : 0,
					stack   : debug ? this.getMainStack(inner.stack) : null,
					meta    : inner.meta !== undefined ? inner.meta : undefined,
					inner   : null
				};
				inres = inres.inner;
			}
		}
		return result;
	},
	canAccess            : function (claims, path, method) {
		for (var c = 0; c < claims.length; c++) {
			var claim = claims[c];
			if (typeof(claim) === 'string') {
				if (claim.indexOf(path) > -1) {
					return true;
				}
			} else {
				if ((claim.path === '*' || claim.path.indexOf(path) > -1) && (claim.method === '*' || method.toLowerCase() === claim.method.toLowerCase())) {
					return true;
				}
			}
		}
	},
	getBearer            : function (req, res) {
		var bearer = req.session.bearer || res.bearer || null;
		if (!bearer && req.headers.authorization) {
			bearer = {
				token  : req.headers.authorization.substring(7),
				client : null
			}
		}
		return bearer;
	}
};

module.exports = utils;
