'use strict';

const path = require('path');
const clc = require("cli-color");
const moment = require("moment");
const fs = require("fs");
const mkpath = require("mkpath");
const URL = require("url-parse");

const utils = {
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
		var lines = stackString.split("\n");
		var lastLine = null;

		for (var i in lines) {
			var line = lines[i];
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
					stack   : debug ? this.getMainStack(inner.stack) : null,
					message : inner.message,
					code    : inner.event !== undefined ? inner.event.code : 0,
					inner   : null
				};
				inres = inres.inner;
			}
		}
		return result;
	}
};

module.exports = utils;
