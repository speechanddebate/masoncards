// These paths are for tournament published data only, and can be seen by any
// users, even if not logged in.

// Disabled most of this because some AI bot from hell hit it this weekend and well, no.

import { futureTourns, pastTourns } from '../../../controllers/public/invite/tournList.js';

export default [
	{ path: '/public/invite/upcoming'          , module : futureTourns } ,
	{ path: '/public/invite/past'              , module : pastTourns }   ,
	{ path: '/public/invite/upcoming/:circuit' , module : futureTourns } ,
];
