'use strict';

var utils = require("../common/utils");
var Enums = require("../middleware/enums");
var Route = require("../middleware/route");
var Action = require("../middleware/action");

var State = function (service, params, parent) {
	var _self = this;
	_self.service = service;
	_self.parent = parent || null;
	_self.methods = params.methods;
	_self.actions = {};
	_self.childs = {};

	_self.name = params.name;
	_self.view = params.view || (parent ? parent.view + "_" + _self.name : _self.name);
	_self.controller = params.controller || (parent ? parent.controller : _self.name);
	_self.container = params.container || (parent ? parent.view : null);
	_self.url = params.url ? params.url : "/" + _self.name;
	_self.path = parent ? utils.join(parent.path, _self.url) : _self.url;
	_self.link = parent ? (parent.link + "." + _self.name) : (_self.container ? (_self.container + "." + _self.name) : _self.name);
	_self.type = params.type || (parent ? parent.type : Enums.StateType.Default);
	_self.access = params.access || (parent ? parent.access : Enums.RouteAccess.Public);
	_self.timeout = params.timeout || (parent ? parent.timeout : 5000);
	_self.data = params.data || (parent ? parent.data : null);

	_self.route = new Route(_self, Enums.RouteType.State);
	_self.dispatch = _self.route.dispatch;

	_self.preMethodConfig = function (req, res) {
		res.set("stateType", _self.type);
	};

	_self.postMethodConfig = function (req, res, payload) {
	};

	if (params.actions) {
		for (var key in params.actions) {
			var item = params.actions[key];
			item.name = item.name ? item.name : key;
			_self.actions[key] = new Action(_self.service, item, _self);
		}
	}

	if (params.childs) {
		for (var key in params.childs) {
			var item = params.childs[key];
			item.name = item.name ? item.name : key;
			_self.childs[key] = new State(_self.service, item, _self);
		}
	}
};

module.exports = State;

