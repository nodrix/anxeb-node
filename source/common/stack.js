'use strict';

module.exports = {
	instance : function (err, params) {
		let _self = this;
		_self.body = err.stack;

		_self.substract = {
			main : function (prefix) {
				if (!_self.body) {
					return '';
				}

				let lines = _self.body.split('\n');
				let isInner = params && params.isInner === true;

				let links = [];
				let postLinw = null;
				for (let i = 0; i < lines.length; i++) {
					if (lines[i]) {
						let line = lines[i];
						let st = line.indexOf('/');

						if (st > -1) {
							let isServer = line.indexOf('source/core/server.js:') > -1;
							let isPath = line.indexOf('at /') > -1 || line.indexOf(' (/') > -1 || line[0] === '/';
							let isEvent = line.indexOf('source/middleware/event.js:') > -1;
							let isLog = line.indexOf('source/middleware/log.js:') > -1;
							let isUtils = line.indexOf('source/common/utils.js:') > -1;

							if (isEvent || isLog || isUtils || (isServer && !isInner)) {

							} else if (isPath) {
								let link = line.substring(st);
								link = link.replace(')', '').replace('(', '').replace('\n', '');
								if (prefix) {
									links.push(prefix + link);
								} else {
									links.push(link);
								}
							}

						}
					}

				}

				if (links.length) {
					return links[0]
				} else {
					return '';
				}
			}
		}
	}
};