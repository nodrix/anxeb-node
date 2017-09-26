'use strict';

anxeb.Enums = {
	RouteAccess  : {
		Private : "Private",
		Public  : "Public"
	},
	RouteType    : {
		Action : "Action",
		State  : "State"
	},
	StateType    : {
		Default   : "Default",
		Login     : "Login",
		Exception : "Exception"
	},
	EventType    : {
		ServiceException   : "ServiceException",
		DataException      : "DataException",
		InternalError      : "InternalError",
		HttpError          : "HttpError",
		MissParameterError : "MissParameterError",
		Debug              : "Debug",
		InformationAlert   : "InformationAlert",
		ExclamationAlert   : "ExclamationAlert"
	},
	RequestState : {
		StandBy   : "StandBy",
		Busy      : "Busy",
		Canceled  : "Canceled",
		Completed : "Completed",
		Failed    : "Failed"
	}
};
