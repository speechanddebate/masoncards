const DistrictDate = {
	type : 'object',
	properties : {
		district    : { type : 'integer' },
		events      : { type : 'string'  , nullable  : true },
		name        : { type : 'string'  , nullable  : true },
		location    : { type : 'string'  , nullable  : true },
		city        : { type : 'string'  , nullable  : true },
		start       : { type : 'string'  , nullable  : true },
		end         : { type : 'string'  , nullable  : true },
	},
};

export default DistrictDate;
