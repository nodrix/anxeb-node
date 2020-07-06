'use strict';

const utils = require('../common/utils');

const Locator = function (root, structure, subfolders) {
	let _self = this;

	_self.structure = structure;
	_self.root = root;

	let getPath = function (args, from, allowArray, subfolder) {
		let $paths = [];
		if (subfolder) {
			$paths.push(subfolder);
		}
		if (args) {
			for (let a = 0; a < args.length; a++) {

				let arg = args[a];
				if (arg !== undefined && arg !== null) {
					$paths.push(arg);
				}
			}
		}

		let $root = null;
		if (typeof from === 'string') {
			$root = from;
		} else if (from instanceof Array) {
			if (allowArray) {
				$root = from;
			} else {
				$root = _self.root;
			}
		} else {
			$root = _self.root;
		}

		let _getComposite = function (root, paths) {
			let result = root;
			for (let i = 0; i < paths.length; i++) {
				if (paths[i]) {
					result = utils.general.path.join(result, paths[i]);
				}
			}
			return result;
		}

		if ($root instanceof Array) {
			for (let i = 0; i < $root.length; i++) {
				$root[i] = _getComposite($root[i], $paths);
			}
			return $root;
		} else {
			return _getComposite($root, $paths);
		}
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
		return getPath(arguments, _self.structure.services, true);
	};

	_self.keys = function () {
		return getPath(arguments, _self.structure.keys);
	};

	_self.storage = function () {
		return getPath(arguments, _self.structure.storage, false, subfolders != null ? subfolders.storage : null);
	};

	_self.configs = function () {
		return getPath(arguments, _self.structure.configs);
	};
};

module.exports = {
	instance : Locator
};