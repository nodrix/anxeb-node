'use strict';

const utils = require('../common/utils');
const fileUpload = require('express-fileupload');

module.exports = {
	instance : function (service, settings) {
		let _self = this;

		_self.service = service;
		_self.settings = settings || {};
		_self.sub_folder = _self.settings.sub_folder;

		_self.service.express.use(fileUpload({
			limits       : { fileSize : _self.settings.upload_limit || 50 * 1024 * 1024 },
			abortOnLimit : true
		}));

		_self.save = function (filePath, text) {
			utils.internal.file.write(_self.service.locate.storage(_self.sub_folder, filePath), {
				text    : text,
				replace : true
			});
		};

		_self.fetch = function (filePath) {
			return utils.internal.file.fetch(_self.service.locate.storage(_self.sub_folder, filePath));
		};

		_self.read = function (filePath) {
			return utils.internal.file.read(_self.service.locate.storage(_self.sub_folder, filePath));
		};
	}
};