'use strict';

const eventTypes = require('../middleware/event').types;

module.exports = {
	// ====== ** : Internal exceptions =================================================================================
	custom                   : {
		message : '[0]',
		code    : -1,
		type    : eventTypes.internal_error
	},
	inner_exception          : {
		message : '[inner]',
		code    : -1,
		type    : eventTypes.internal_error
	},
	unhandled_exception      : {
		message : 'Unhandled exception. [0]',
		code    : 0,
		type    : eventTypes.internal_error
	},
	missing_parameter        : {
		message : 'Parameter [0:w] is missing for [1:w] object.',
		code    : 1,
		type    : eventTypes.parameter_error
	},
	missing_parameters       : {
		message : 'Parameters [0:w] are missing.',
		code    : 1,
		type    : eventTypes.parameter_error
	},
	parameter_path_not_found : {
		message : 'Path \'[0]\' not found.',
		code    : 2,
		type    : eventTypes.parameter_error
	},
	parameter_file_not_found : {
		message : 'File \'[0]\' not found.',
		code    : 3,
		type    : eventTypes.parameter_error
	},
	modules_path_not_found   : {
		message : 'Modules path \'[0]\' for [1:w] not found or invalid.',
		code    : 4,
		type    : eventTypes.parameter_error
	},
	modules_load_exception   : {
		message : 'Error loading [0:w] modules.',
		code    : 5,
		type    : eventTypes.parameter_error
	},
	no_service_included      : {
		message : 'No service included.',
		code    : 5,
		type    : eventTypes.parameter_error
	},
	extension_init_failed         : {
		message : 'Extension [0:w] initialization failed.',
		code    : 6,
		type    : eventTypes.parameter_error
	},
	extension_startup_failed : {
		message : 'Extension [0:w] startup failed.',
		code    : 7,
		type    : eventTypes.parameter_error
	},

	// ====== *** : HTTP errors ========================================================================================
	page_not_found      : {
		message : 'Resource from URL [0] not found.',
		code    : 404,
		type    : eventTypes.http_error
	},
	request_timeout     : {
		message : 'HTTP request timeout.',
		code    : 408,
		type    : eventTypes.http_error
	},
	unauthorized_access : {
		message : 'Unauthorized access to [1:w] using [0:w] method.',
		code    : 401,
		type    : eventTypes.http_error
	},

	// ====== 60** : Web server errors =================================================================================
	ssl_server_initialization_failed  : {
		message : 'SSL server initialization failed using port [1] on [0].',
		code    : 6001,
		type    : eventTypes.service_exception
	},
	http_server_initialization_failed : {
		message : 'HTTP server initialization failed using port [1] on [0].',
		code    : 6002,
		type    : eventTypes.service_exception
	},
	invalid_request                   : {
		message : 'Invalid request.',
		code    : 6005,
		type    : eventTypes.service_exception
	},
	invalid_token                     : {
		message : 'Failed to authenticate token.',
		code    : 6006,
		type    : eventTypes.service_exception
	},
	http_server_file_response         : {
		message : 'Exception trying to read or send the file [0].',
		code    : 6007,
		type    : eventTypes.service_exception
	},
	file_not_found                    : {
		message : 'File [0] not found on server.',
		code    : 6008,
		type    : eventTypes.service_exception
	},
	route_not_found                   : {
		message : 'Route for view \'[0]\' not registered on service [1].',
		code    : 6009,
		type    : eventTypes.service_exception
	},
	invalid_internal_api_request      : {
		message : 'Invalid request to [0] internal api. Resource [1] not found.',
		code    : 6010,
		type    : eventTypes.service_exception
	},
	private_key_not_found             : {
		message : 'Private key not found.',
		code    : 6011,
		type    : eventTypes.service_exception
	},
	invalid_auth                      : {
		message : 'Invalid authentication token.',
		code    : 6012,
		type    : eventTypes.service_exception
	},
	expired_token                     : {
		message : 'Token access expired.',
		code    : 6013,
		type    : eventTypes.service_exception
	},
	bundle_not_found                  : {
		message : 'Bundle \'[0]\' not registered on service [1].',
		code    : 6014,
		type    : eventTypes.service_exception
	},
	view_not_found                    : {
		message : 'View \'[0]\' not registered on service [1].',
		code    : 6014,
		type    : eventTypes.service_exception
	},
	container_not_found               : {
		message : 'Container \'[0]\' not registered on service [1].',
		code    : 6014,
		type    : eventTypes.service_exception
	},
	security_keys_not_defined         : {
		message : 'Security keys not defined.',
		code    : 6017,
		type    : eventTypes.service_exception
	}
};
