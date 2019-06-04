if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function (search, replacement) {
		let target = this;
		return target.split(search).join(replacement);
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