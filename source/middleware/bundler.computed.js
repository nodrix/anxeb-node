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
			var result = ["var initStates = function() {"];

			result.push("\tanxeb.app.config(function ($stateProvider) { $stateProvider");

			var generateState = function (state) {
				var _state = state;
				result.push('\t\t.state("' + _state.link + '", { ');
				result.push('\t\t\tcache: false,');
				result.push('\t\t\turl: "' + _state.url + '",');
				if (_state.data) {
					result.push('\t\t\tdata: ' + JSON.stringify(_state.data) + ',');
				}
				if (_state.controller) {
					result.push('\t\t\tcontroller: "' + _state.controller.toPascalCase() + 'Controller",');
				}
				result.push('\t\t\ttemplateUrl: function ($stateParams) {');
				result.push('\t\t\t\treturn anxeb.utils.getParametersFromState($stateParams, "/anxeb/view/' + _state.view + '");');
				result.push('\t\t\t},');

				result.push('\t\t})');
				if (_state.childs) {
					for (var name in _state.childs) {
						generateState(_state.childs[name]);
					}
				}
			};

			var generateContainer = function (state) {
				if (state && state.container) {
					result.push('\t\t.state("' + state.container + '", { templateUrl : "/anxeb/container/' + state.container + '" })');
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

			result.push("\t});");
			result.push("}");

			result.push("\ninitStates();");
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

			var serverParams = {
				version : _service.server.version
			};

			result.push('\t\tserver: ' + JSON.stringify(serverParams) + ",");

			result.push('\t\tdefaults : {');
			result.push('\t\t\tstates : {');
			result.push('\t\t\t\texception : null,');
			result.push('\t\t\t\tlogin     : ' + (_service.defaults.states && _service.defaults.states.login && _service.defaults.states.login.link ? '"' + _service.defaults.states.login.link + '"' : 'null'));
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
