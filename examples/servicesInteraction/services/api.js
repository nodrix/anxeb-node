const anxeb = require('../../../index');

module.exports = {
	domain   : 'api.examples.anxeb.com',
	name     : 'Anxeb API',
	key      : 'api',
	active   : true,
	settings : {
		log     : {
			identifier : '[service_name]'
		},
		socket  : {
			host : '127.0.0.1',
			port : 8010
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
								hello : 'api'
							});
						},
						get  : function (context) {
							context.socket.do.post({
								uri  : context.services.backend.socket.uri,
								json : true
							}).then(function (response, body) {
								context.send({
									i_am    : 'api',
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
