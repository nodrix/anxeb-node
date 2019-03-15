'use strict';

const utils = require('../common/utils');

const Locator = function (root, structure) {
	let _self = this;

	_self.structure = structure;
	_self.root = root;

	let getPath = function (args, from) {
		let paths = [];
		if (args) {
			for (let a = 0; a < args.length; a++) {

				let arg = args[a];
				if (arg !== undefined && arg !== null) {
					paths.push(arg);
				}
			}
		}
		let result = typeof from === 'string' ? from : _self.root;
		for (let i = 0; i < paths.length; i++) {
			if (paths[i]) {
				result = utils.general.path.join(result, paths[i]);
			}
		}
		return result;
	};

	_self.item = function () {
		return getPath(arguments, _self.root);
	};

	_self.source = function () {
		return getPath(arguments, _self.structure.source);
	};

	_self.logs = function () {
		return getPath(arguments, _self.structure.logs);
	};

	_self.services = function () {
		return getPath(arguments, _self.structure.services);
	};

	_self.keys = function () {
		return getPath(arguments, _self.structure.keys);
	};

	_self.storage = function () {
		return getPath(arguments, _self.structure.storage);
	};

	_self.configs = function () {
		return getPath(arguments, _self.structure.configs);
	};
};

module.exports = {
	instance : Locator
};