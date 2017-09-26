'use strict';

const Enums = require("../middleware/enums");
const utils = require("../common/utils");
const Route = require("../middleware/route");

const Action = function (service, params, parent) {
	var _self = this;
	_self.service = service;
	_self.parent = parent || null;
	_self.methods = params.methods;
	_self.childs = {};

	_self.name = params.name;
	_self.url = params.url ? params.url : "/" + _self.name;
	_self.path = parent ? utils.join(parent.path, _self.url) : _self.url;
	_self.access = params.access || (parent ? parent.access : Enums.RouteAccess.Public);
	_self.timeout = params.timeout;

	_self.route = new Route(_self, Enums.RouteType.Action);
	_self.dispatch = _self.route.dispatch;

	_self.preMethodConfig = function (req, res) {
	};

	_self.postMethodConfig = function (req, res, payload) {
	};

	if (params.childs) {
		for (var key in params.childs) {
			var item = params.childs[key];
			item.name = item.name ? item.name : key;
			_self.childs[key] = new Action(_self.service, item, _self);
		}
	}
};

module.exports = Action;

