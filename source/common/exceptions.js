'use strict';

var Enums = require("../middleware/enums");

module.exports = {
	// ====== ** : Internal exceptions =================================================================================
	custom              : {
		message : "[0]",
		code    : -1,
		type    : Enums.EventType.InternalError
	},
	inner_exception     : {
		message : "[inner]",
		code    : -1,
		type    : Enums.EventType.InternalError
	},
	unhandled_exception : {
		message : "Unhandled exception. [0]",
		code    : 0,
		type    : Enums.EventType.InternalError
	},
	// ====== 15** : Missing parameters exceptions =====================================================================
	missing_param_name  : {
		message : "Name parameter missing.",
		code    : 1500,
		type    : Enums.EventType.MissParameterError
	},
	missing_param_paths : {
		message : "Paths parameter missing.",
		code    : 1501,
		type    : Enums.EventType.MissParameterError
	},

	// ====== *** : HTTP errors ========================================================================================
	page_not_found      : {
		message : "Resource from URL [0] not found.",
		code    : 404,
		type    : Enums.EventType.HttpError
	},
	request_timeout     : {
		message : "HTTP request timeout.",
		code    : 408,
		type    : Enums.EventType.HttpError
	},
	unauthorized_access : {
		message : "Unauthorized access.",
		code    : 401,
		type    : Enums.EventType.HttpError
	},

	// ====== 80** : Data server errors ================================================================================
	data_server_connection_failed : {
		message : "Connection to data server [0] failed.",
		code    : 8001,
		type    : Enums.EventType.DataException
	},
	data_server_offline           : {
		message : "Data server offline.",
		code    : 8002,
		type    : Enums.EventType.DataException
	},
	data_server_disconnected      : {
		message : "Data server [0] disconnected unexpectedly.",
		code    : 8003,
		type    : Enums.EventType.DataException
	},

	// ====== 60** : Web server errors =================================================================================
	ssl_server_initialization_failed  : {
		message : "SSL server initialization failed using port [1] on [0].",
		code    : 6001,
		type    : Enums.EventType.ServiceException
	},
	http_server_initialization_failed : {
		message : "HTTP server initialization failed using port [1] on [0].",
		code    : 6002,
		type    : Enums.EventType.ServiceException
	},
	invalid_request                   : {
		message : "Invalid request.",
		code    : 6005,
		type    : Enums.EventType.ServiceException
	},
	invalid_token                     : {
		message : "Failed to authenticate token.",
		code    : 6006,
		type    : Enums.EventType.ServiceException
	},
	http_server_file_response         : {
		message : "Exception trying to read or send the file [0].",
		code    : 6007,
		type    : Enums.EventType.ServiceException
	},
	file_not_found                    : {
		message : "File [0] not found on server.",
		code    : 6008,
		type    : Enums.EventType.ServiceException
	},
	route_not_found                   : {
		message : "Route for view '[0]' not registered on service.",
		code    : 6009,
		type    : Enums.EventType.ServiceException
	},
	invalid_internal_api_request      : {
		message : "Invalid request to [0] internal api. Resource [1] not found.",
		code    : 6010,
		type    : Enums.EventType.ServiceException
	},
	private_key_not_found             : {
		message : "Private key not found.",
		code    : 6011,
		type    : Enums.EventType.ServiceException
	},
	invalid_auth                      : {
		message : "Invalid authentication token.",
		code    : 6012,
		type    : Enums.EventType.ServiceException
	},
	expired_token                     : {
		message : "Token access expired.",
		code    : 6013,
		type    : Enums.EventType.ServiceException
	}
};
