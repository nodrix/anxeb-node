'use strict';

const utils = require("../common/utils");
const path = require("path");
const Enums = require("../middleware/enums");

module.exports = function (service) {
	var _self = this;
	var _service = service;
	var _statesScript = null;
	var _initScript = null;

	_self.states = function () {
		if (_statesScript === null) {
			var result = ["anxeb.app.config(function ($stateProvider) { $stateProvider"];

			var generateState = function (state) {
				var _state = state;
				result.push('\t.state("' + _state.link + '", { ');
				result.push('\t\tcache: false,');
				result.push('\t\turl: "' + _state.url + '",');
				if (_state.controller) {
					result.push('\t\tcontroller: "' + _state.controller.toPascalCase() + 'Controller",');
				}
				result.push('\t\ttemplateUrl: function ($stateParams) {');
				result.push('\t\t\treturn anxeb.utils.getParametersFromState($stateParams, "/anxeb/view/' + _state.view + '");');
				result.push('\t\t},');

				result.push('\t})');
				if (_state.childs) {
					for (var name in _state.childs) {
						generateState(_state.childs[name]);
					}
				}
			};

			var generateContainer = function (state) {
				if (state && state.container) {
					result.push('\t.state("' + state.container + '", { templateUrl : "/anxeb/container/' + state.container + '" })');
				}

				for (var key in _service.states) {
					var item = _service.states[key];
					if (!item.parent) {
						if ((state && state.container && item.container === state.container) || !item.container) {
							generateState(item);
						}
					}
				}
			};

			var rootContainers = [];
			for (var key in _service.states) {
				var item = _service.states[key];
				if (item.container) {
					if (rootContainers.indexOf(item.container) === -1) {
						rootContainers.push(item.container);
						generateContainer(item);
					}
				}
			}
			generateContainer();

			result.push("});");
			_statesScript = result.join("\n");
		}

		return _statesScript;
	};

	_self.init = function () {
		if (!_initScript) {
			var result = ["var initialize = function() {"];
			result.push("\tanxeb.defaults.states.login = '" + _service.defaults.states.login.link + "';");
			result.push("}");

			result.push("\ninitialize();");
			_initScript = result.join("\n");
		}
		return _initScript;
	};
};
