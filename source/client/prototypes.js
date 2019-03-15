if (!String.prototype.replaceAll) {
	String.prototype.replaceAll = function (search, replacement) {
		let target = this;
		return target.split(search).join(replacement);
	}
}