'use strict';

const path = require('path');
const https = require('https');
const clc = require('cli-color');
const fs = require('fs');
const mkpath = require('mkpath');
const URL = require('url-parse');
const parameters = require('./parameters');
const moment = require('moment');
const ip = require('ip');
const axios = require('axios');

const utils = {
	general  : {
		ip     : ip,
		https  : https,
		path   : path,
		fs     : fs,
		moment : moment,
		axios  : axios,
		format : {
			number : function (value, params) {
				let decimalCount = params != null && params.decimals != null ? params.decimals : 2;
				let thousandComma = params != null && params.comma != null ? params.comma : true;

				if (value == null) {
					value = 0;
				}

				value = parseFloat(value).toFixed(decimalCount);

				if (thousandComma === true) {
					value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
				}
				return value
			},
			date   : function (value, params) {
				let date = null;

				if (typeof value === 'number') {
					date = moment.unix(value);
				} else if (typeof value === 'string') {
					date = moment(String(value));
				} else {
					date = value;
				}

				if (params === 'short_text') {
					return date.format('D [de] MMMM');
				} else if (params === 'full_text') {
					return date.format('D [de] MMMM YYYY');
				} else if (params === 'full_date') {
					return date.format('DD/MM/YYYY hh:mm:ss A');
				} else if (params === 'small_date') {
					return date.format('D/M/YYYY h:mm A');
				} else if (params.type === 'full_time') {
					return date.format('hh:mm:ss A');
				} else if (params.type === 'small_time') {
					return date.format('h:mm A');
				} else if (params === 'receipt') {
					return date.format('DD/MM/YYYY h:mm:ss A');
				} else {
					return date.format('D/M/YYYY');
				}
			}
		},
		money  : {
			normalize : function (value, options) {
				let res = Number(parseFloat(value).toFixed(2));
				if (isNaN(res)) {
					if (options && options.default != null) {
						return options.default;
					} else {
						return 0;
					}
				} else {
					if (options && options.positive === true && res < 0) {
						return 0;
					}
					return res;
				}
			}
		},
		date   : {
			now  : function () {
				return moment();
			},
			utc  : function () {
				return moment().utc();
			},
			unix : function () {
				return moment().unix();
			}
		},
		data   : {
			populate         : function (obj, source) {
				let model = obj._doc || obj;
				for (let i in model) {
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
				let result = [];

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
			hierarchy : function (value) {
				value = this.normalize(value);
				value = value.substr(1).replace(('/', '.'));
				return value;
			},
			normalize : function (value) {
				if (value === '/' || value == null) {
					return '/';
				} else {
					value = value.replaceAll('\\', '/');
					value = path.normalize('/' + value);
					if (value.endsWith('/')) {
						value = value.substr(0, value.length - 1);
					}
					return value;
				}
			},
			create    : function (url) {
				return new URL(url)
			}
		},
		file   : {
			fetch  : function (filePath, options) {
				return new Promise(function (resolve, reject) {
					fs.readFile(filePath, 'utf8', function (err, data) {
						if (err) {
							reject(err);
						} else {
							if (options && options.stats === true) {
								resolve({
									data  : data,
									stats : fs.statSync(filePath)
								});
							} else {
								resolve(data);
							}
						}
					});
				});
			},
			read   : function (filePath, options) {
				return fs.readFileSync(filePath, options)
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
			exists : fs.existsSync,
			stats  : fs.statSync
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
			fetch  : (filePath, options) => utils.general.file.fetch(utils.internal.parameters.fill.date(filePath), options),
			read   : (filePath) => utils.general.file.read(utils.internal.parameters.fill.date(filePath)),
			write  : (filePath, params) => utils.general.file.write(utils.internal.parameters.fill.date(filePath), params),
			exists : (filePath) => utils.general.file.exists(utils.internal.parameters.fill.date(filePath))
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