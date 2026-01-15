// Invoke with e.g.: node api/utility/chatwoot.js 1234 > chatwoot.log 2>&1 &
import config from '../../config/config.js';
import db from '../helpers/litedb.js';

export const chatwootSetup = async (tournId = parseInt(process.argv[2])) => {
	if (!tournId || Number.isNaN(tournId)) {
		throw new Error('No tournament ID provided');
	}

	console.log(`Starting chatwoot setup for tournament # ${tournId} ...\n`);

	const tourn = await db.sequelize.query(`
		select * from tourn
		where id = ${tournId}
	`, {
		type : db.sequelize.QueryTypes.SELECT,
	});

	if (!tourn || tourn.length === 0) {
		throw new Error('No tournament found');
	}

	const fetchOptions = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'api_access_token': process.env.CHATWOOT_TOKEN || config.CHATWOOT.TOKEN,
		},
	};

	const account = {
		name: tourn[0].name,
		locale: 'en',
		domain: `${tourn[0].webname}.chat.tabroom.com`,
		support_email: 'support@tabroom.com',
		status: "active",
		limits: {},
		custom_attributes: {}
	};

	let accountId = null;

	try {
		const accountData = await fetch(
			`${config.CHATWOOT.API_URL}/accounts`,
			{ ...fetchOptions, body: JSON.stringify(account) },
		);
		const json = await accountData.json();
		accountId = json.id;
		console.log(json);
	} catch (err) {
		console.error('Error creating chatwoot account:', err);
	}

	const users = await db.sequelize.query(`
		select
			person.email,
			CONCAT(person.first, ' ', person.last) as name,
			permission.tag
		from person
		inner join permission on permission.person = person.id
		where permission.tourn = ${tournId}
		and permission.tag IN ('owner', 'tabber')
	`, {
		type : db.sequelize.QueryTypes.SELECT,
	});

	for (const user of users) {
		const userData = {
			name: user.name,
			display_name: user.name,
			email: user.email,
			password: '1234ABCDabcd!@#$',
			custom_attributes: {},
		};

		let userId = null;
		try {
			const userDataResponse = await fetch(
				`${config.CHATWOOT.API_URL}/users`,
				{ ...fetchOptions, body: JSON.stringify(userData) },
			);
			const json = await userDataResponse.json();
			userId = json.id;
			console.log(json);
		} catch (err) {
			console.error(`Error creating chatwoot user for ${user.email}:`, err);
		}

		const accountUser = {
			account_id: accountId,
			user_id: userId,
			role: user.tag === 'owner' ? 'administrator' : 'agent',
		};

		try {
			const data = await fetch(
				`${config.CHATWOOT.API_URL}/accounts/${accountId}/account_users`,
				{ ...fetchOptions, body: JSON.stringify(accountUser) },
			);
			const json = await data.json();
			console.log(json);
		} catch (err) {
			console.error(`Error creating chatwoot account user for ${user.email}:`, err);
		}
	}

	console.log(`\nDone.`);
};

await chatwootSetup();
process.exit();

export default chatwootSetup;
