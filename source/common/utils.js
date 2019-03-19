'use strict';

const path = require('path');
const clc = require('cli-color');
const fs = require('fs');
const mkpath = require('mkpath');
const URL = require('url-parse');
const parameters = require('./parameters');
const moment = require('moment');

const utils = {
	general  : {
		path   : path,
		fs     : fs,
		moment : moment,
		data   : {
			populate         : function (obj, source) {
				var model = obj._doc || obj;
				for (var i in model) {
					if (source[i] !== undefined && i !== '_id') {
						obj[i] = source[i];
					}
				}
			},
			copy             : function (obj) {
				if (obj) {
					return JSON.parse(JSON.stringify(obj));
				} else {
					return null;
				}
			},
			containsProperty : function (obj, prop) {
				let items = prop.split('.');

				for (let i = 0; i < items.length; i++) {
					let key = items[i];
					if (obj[key] !== undefined && obj[key] !== null) {
						obj = obj[key];
					} else {
						return false;
					}
				}
				return true;
			},
			format           : function (obj, prefix, ignoreEdges) {
				var result = [];

				let lines = JSON.stringify(obj, null, 4).split('\n');
				for (let i = 0; i < lines.length; i++) {
					let line = lines[i];

					if (line.indexOf(' "anxeb.') > -1) {
						line = line.replace(' "anxeb.', ' anxeb.');
						line = line.replace(')",', '),');
					}

					if (ignoreEdges) {
						if (i === 0 || i === lines.length - 1) {
							result.push(line);
						} else {
							result.push(prefix + line);
						}
					} else {
						result.push(prefix + line);
					}
				}
				return result.join('\n');
			}
		},
		url    : {
			normalize : function (value) {
				if (value) {
					return value.replaceAll('\\', '/');
				} else {
					return '/';
				}
			},
			create    : function (url) {
				return new URL(url)
			}
		},
		file   : {
			fetch  : function (filePath) {
				return new Promise(function (resolve, reject) {
					fs.readFile(filePath, 'utf8', function (err, data) {
						if (err) {
							reject(err);
						} else {
							resolve(data);
						}
					});
				});
			},
			read   : function (filePath) {
				return fs.readFileSync(filePath)
			},
			write  : function (filePath, params) {
				const doAppend = function (canCreateDirectory) {
					try {
						if (params && params.replace === true) {
							fs.writeFileSync(filePath, params.text || '');
						} else {
							fs.appendFileSync(filePath, params.text || '');
						}
					} catch (err) {
						if (err.code === 'ENOENT' && canCreateDirectory) {
							createDir(utils.general.path.dirname(filePath));
						} else {
							console.log(clc.redBright('Could not log event. ' + err.message));
						}
					}
				};

				const createDir = function (dirPath) {
					try {
						mkpath.sync(dirPath);
						doAppend();
					} catch (err) {
						if (err !== null) {
							console.log(clc.redBright('Could not create log directory. ' + err.message));
						} else {
							doAppend(false);
						}
					}
				};

				doAppend(true);
			},
			list   : function (dirPath, params) {
				const checkPath = function (childPath) {
					let files = [];
					const contPath = utils.general.path.join(dirPath, childPath);
					const checkFile = function (childPath, item) {
						const relativeFile = utils.general.path.join(childPath, item);
						const absoluteFile = utils.general.path.join(dirPath, childPath, item);
						const info = fs.statSync(absoluteFile);

						if (info.isFile() && item.endsWith(params.endsWith)) {
							files.push(relativeFile);
						} else if (params.subfolders && info.isDirectory()) {
							let sfiles = checkPath(relativeFile);
							for (let f = 0; f < sfiles.length; f++) {
								files.push(sfiles[f]);
							}
						}
					};

					let items = fs.readdirSync(contPath);
					for (let i = 0; i < items.length; i++) {
						checkFile(childPath, items[i]);
					}
					return files;
				};

				return checkPath('');
			},
			exists : fs.existsSync
		},
		email  : {
			validate : function (mail) {
				if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)) {
					return true;
				} else {
					return false;
				}
			}
		}
	},
	internal : {
		file       : {
			fetch : (filePath) => utils.general.file.fetch(utils.internal.parameters.fill.date(filePath)),
			read  : (filePath) => utils.general.file.read(utils.internal.parameters.fill.date(filePath)),
			write : (filePath, params) => utils.general.file.write(utils.internal.parameters.fill.date(filePath), params),
		},
		modules    : {
			list : function (data) {
				let throwNotFound = function (folderName) {
					let notFoundError = Error('Modules folder \'' + folderName + '\' does not exist');
					notFoundError.code = 4;

					notFoundError.path = folderName;
					throw notFoundError;
				};

				if (data !== null && data !== undefined) {

					let getModules = function (modulesPath) {
						if (typeof modulesPath === 'string') {
							if (fs.existsSync(modulesPath)) {
								let files = utils.general.file.list(modulesPath, {
									subfolders : true,
									endsWith   : '.js'
								});

								return files.map(function (moduleFile) {
									let fileName = utils.general.path.join(modulesPath, moduleFile);
									return {
										module : require(fileName),
										name   : moduleFile.replaceAll('.js', '')
									}
								});
							} else {
								throwNotFound(modulesPath);
							}
						} else if (typeof modulesPath === 'object') {
							return modulesPath;
						} else {
							return [];
						}
					};

					if (data instanceof Array) {
						let result = [];
						for (let i = 0; i < data.length; i++) {
							result = Array.prototype.concat(result, getModules(data[i]));
						}
						return result;
					} else if (typeof data === 'object') {
						let result = [];
						for (let k in data) {
							let module = data[k];
							result.push({
								module : module,
								name   : k
							})
						}
						return result;
					} else {
						return getModules(data);
					}
				} else {
					return [];
				}
			}
		},
		parameters : parameters
	}
};

module.exports = utils;