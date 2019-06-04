'use strict';

module.exports = function () {
	if (!String.prototype.padStart) {
		String.prototype.padStart = function padStart(targetLength, padString) {
			targetLength = targetLength >> 0;
			padString = String(padString || ' ');
			if (this.length > targetLength) {
				return String(this);
			} else {
				targetLength = targetLength - this.length;
				if (targetLength > padString.length) {
					padString += padString.repeat(targetLength / padString.length);
				}
				return padString.slice(0, targetLength) + String(this);
			}
		};
	}

	if (!String.prototype.repeat) {
		String.prototype.repeat = function repeat(count) {
			return Array(count).join(String(this))
		};
	}

	if (!String.prototype.startsWithAny) {
		String.prototype.startsWithAny = function (value) {
			if (value instanceof Array) {
				for (let i = 0; i < value.length; i++) {
					if (this.startsWith(value[i]) === true) {
						return true;
					}
				}
				return false;
			} else {
				return this.startsWith(value);
			}
		}
	}

	if (!String.prototype.replaceAll) {
		String.prototype.replaceAll = function (search, replacement) {
			let target = this;
			return target.split(search).join(replacement);
		}
	}

	if (!String.prototype.toCamelCase) {
		String.prototype.toCamelCase = function () {
			let text = this;
			text = text.replaceAll('.', ' ');
			return text.replace(/\s(.)/g, function ($1) { return $1.toUpperCase(); }).replace(/\s/g, '').replace(/^(.)/, function ($1) { return $1.toLowerCase(); });
		}
	}

	if (!String.prototype.toTitleCase) {
		String.prototype.toTitleCase = function () {
			return this.replace(
				/\w\S*/g,
				function (txt) {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				}
			);
		}
	}

	if (!String.prototype.toPascalCase) {
		String.prototype.toPascalCase = function (spaced) {
			let text = this;
			text = text.replaceAll('.', ' ').toCamelCase();

			if (spaced) {
				return text.replace(/([A-Z])/g, ' $1').replace(/^./, function (str) { return str.toUpperCase(); })
			} else {
				return text.replace(/^./, function (str) { return str.toUpperCase(); })
			}
		}
	}

	if (!String.prototype.toCapital) {
		String.prototype.toCapital = function () {
			let value = this.toLowerCase();
			return value.charAt(0).toUpperCase() + value.slice(1);
		}
	}

	if (!String.prototype.isTrue) {
		String.prototype.isTrue = function () {
			return this.toLowerCase() === 'true' || this.toLowerCase() === 't' || this.toLowerCase() === '1' || this.toLowerCase() === 'yes';
		}
	}

	if (!Array.prototype.iterate) {
		Array.prototype.iterate = function (callback, filter) {
			if (!callback) { return; }
			let items = this;

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				if (filter == null || filter(item, i) === true) {
					let result = callback(item, i);
					if (result !== undefined) {
						return result;
					}
				}
			}
		}
	}

	if (!Array.prototype.atomize) {
		Array.prototype.atomize = function (callback, filter) {
			let items = this;
			for (let i = 0; i < items.length; i++) {
				let obj = items[i];
				if (typeof obj === 'object') {
					for (let key in obj) {
						let item = obj[key];
						if (filter == null || filter(item, key) === true) {
							let result = callback(item, key);
							if (result !== undefined) {
								return result;
							}
						}
					}
				} else if (obj instanceof Array) {
					let result = obj.iterate(callback, filter);
					if (result !== undefined) {
						return result;
					}
				}
			}
		}
	}
};
