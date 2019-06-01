if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function (search, replacement) {
		let target = this;
		return target.split(search).join(replacement);
	}
}

if (!Array.prototype.iterate) {
	Array.prototype.iterate = function (callback, filter) {
		let items = this;

		let process = function (item) {
			if (filter == null || filter(item, i) === true) {
				callback(item, i);
			}
		};

		if (items instanceof Array) {
			if (callback) {
				for (let i in items) {
					if (items.hasOwnProperty(i)) {
						process(items[i]);
					}
				}
			}
		} else {
			if (callback) {
				for (let i = 0; i < items.length; i++) {
					process(items[i]);
				}
			}
		}
	}
}