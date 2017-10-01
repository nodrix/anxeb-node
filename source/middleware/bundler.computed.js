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

			var modules = '[]';

			if (_service.settings.service.client && _service.settings.service.client && _service.settings.service.client.modules && _service.settings.service.client.modules.length > 0) {
				modules = '[' + _service.settings.service.client.modules.map(function (item) {
						return '"' + item + '"';
					}).join(',') + ']';
			}

			var result = [];
			result.push('var initialize = function() {');
			result.push('\treturn {');
			result.push('\t\tmodules  : ' + (modules ? modules : '["ui.router", "angular-storage"]') + ',');
			if (_service.settings.service.client && _service.settings.service.client.settings) {
				result.push('\t\tsettings: ' + JSON.stringify(_service.settings.service.client.settings) + ",");
			}
			result.push('\t\tdefaults : {');
			result.push('\t\t\tstates : {');
			result.push('\t\t\t\texception : null,');
			result.push('\t\t\t\tlogin     : ' + (_service.defaults.states && _service.defaults.states.login.link ? '"' + _service.defaults.states.login.link + '"' : 'null'));
			result.push('\t\t\t}');
			result.push('\t\t}');
			result.push('\t};');
			result.push('}');

			result.push("\nvar anxeb = initialize();");
			_initScript = result.join("\n");
		}
		return _initScript;
	};
};
