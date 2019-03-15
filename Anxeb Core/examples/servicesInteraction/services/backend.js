const anxeb = require('../../../index');

module.exports = {
	domain   : 'backend.examples.anxeb.com',
	name     : 'Anxeb Backend',
	key      : 'backend',
	active   : true,
	settings : {
		log     : {
			identifier : '[service_name]'
		},
		socket  : {
			host : '127.0.0.1',
			port : 8011
		},
		routing : {
			routes : {
				index : {
					url     : '/',
					access  : anxeb.Route.access.public,
					timeout : 1000,
					methods : {
						post : function (context) {
							context.send({
								hello : 'backend'
							});
						},
						get  : function (context) {
							context.socket.do.post({
								uri  : context.services.api.socket.uri,
								json : true
							}).then(function (response, body) {
								context.send({
									i_am    : 'backend',
									this_is : response.hello
								});
							}).catch(function (err) {

							});
						}
					}
				}
			}
		}
	}
};
