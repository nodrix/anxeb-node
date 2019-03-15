'use strict';

const HBS = require('express-hbs');
const Handlebars = require('handlebars');
const express = require('express');
const favicon = require('serve-favicon');
const utils = require('../common/utils');


module.exports = {
	instance : function (service, settings) {
		let _self = this;
		let _handlebars = Handlebars.create();
		let _hbs = HBS.create();
		_self.service = service;
		_self.settings = settings || {};
		_self.settings.extension = _self.settings.extension || '.hbs';

		_hbs.cacheLayout = function (layoutFile, useCache, cb) {
			var self = this;
			if (utils.general.path.extname(layoutFile) === '') {
				layoutFile += this._options.extname;
			}

			var layoutTemplates = this.cache[layoutFile];
			if (layoutTemplates) {
				return cb(null, layoutTemplates);
			}

			utils.general.fs.readFile(layoutFile, 'utf8', function (err, str) {
				if (err) {
					return cb(err);
				}

				if (layoutFile.startsWith(_self.settings.templates.views)) {
					var viewName = layoutFile.substr(_self.settings.templates.views.length + 1);
					var dotIndex = viewName.lastIndexOf('.');
					if (dotIndex > -1) {
						viewName = viewName.substr(0, dotIndex);
					}

					var route = _self.service.routing.retrieve.byView(viewName);
					if (route) {
						if (route.container) {
							let va = '{{!< ' + route.container + '}}';
							str = va + '\n\n' + str;
						} else if (route.parent) {
							let va = '{{!< ./../' + route.parent.name + '}}\n\n';
							str = va + '\n\n' + str;
						}
					}
				}

				var parentLayoutFile = self.declaredLayoutFile(str, layoutFile);

				var _returnLayouts = function (layouts) {
					var currentLayout;
					layouts = layouts.slice(0);
					currentLayout = self.compile(str, layoutFile);
					layouts.push(currentLayout);
					if (useCache) {
						self.cache[layoutFile] = layouts.slice(0);
					}
					cb(null, layouts);
				};

				if (parentLayoutFile) {
					self.cacheLayout(parentLayoutFile, useCache, function (err, parentLayouts) {
						if (err) {
							return cb(err);
						}
						_returnLayouts(parentLayouts);
					});
				} else {
					_returnLayouts([]);
				}
			});
		};

		_self.include = {
			partial : function (key, value) {
				if (value instanceof Array) {
					_handlebars.registerPartial(key, value.join('\n') + '\n');
				} else {
					_handlebars.registerPartial(key, value);
				}
			},
			anxeb   : function () {
				var lines = ["<!-- Anxeb Base -->"];
				lines.push('<script src="' + utils.general.path.join(_self.service.routing.internal.bundle.path, 'core/anxeb.js') + '"></script>');
				lines.push('<script src="' + utils.general.path.join(_self.service.routing.internal.bundle.path, 'core/prototypes.js') + '"></script>');
				lines.push('<script src="' + utils.general.path.join(_self.service.routing.internal.bundle.path, 'core/utils.js') + '"></script>');
				this.partial('anxeb', lines)
			}
		};

		_self.init = function () {
			if (_self.settings.templates) {
				if (_self.settings.templates && _self.settings.templates.views) {
					_self.service.express.set('views', _self.settings.templates.views);
				}

				_self.service.express.engine(_self.settings.extension, _hbs.express4({
					handlebars  : _handlebars,
					extname     : _self.settings.extension,
					partialsDir : _self.settings.templates ? _self.settings.templates.partials : null,
					layoutsDir  : _self.settings.templates ? _self.settings.templates.containers : null,
					onCompile   : function (exhbs, source, filename) {
						return exhbs.handlebars.compile(source);
					}
				}));
				_self.service.express.set('view engine', _self.settings.extension);
			}

			if (_self.settings.static) {
				if (utils.general.file.exists(_self.settings.static)) {
					_self.service.express.use(express.static(_self.settings.static));
				} else {
					_self.service.log.exception.parameter_path_not_found.args(_self.settings.static).throw();
				}
			}

			if (_self.settings.favicon) {
				_self.service.express.use(favicon(_self.settings.favicon));
			}
		};

		_self.init();
	}
};
