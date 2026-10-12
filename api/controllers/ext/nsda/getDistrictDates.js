import { startOfYear } from '@speechanddebate/nsda-js-utils';

export const getDistrictDates = {
	GET: async (req, res) => {

		const db = req.db;

		let districtDates = [];

		try {
			let results = await db.sequelize.query(`
				SELECT
					TS.value AS 'district',
					GROUP_CONCAT(E.abbr) AS 'events',
					W.name,
					S.name AS 'location',
					W.city AS 'city',
					W.start,
					W.end
				FROM tabroom.weekend W
				INNER JOIN tabroom.tourn T ON W.tourn = T.id
				INNER JOIN tabroom.event E ON E.tourn = T.id
				INNER JOIN tabroom.event_setting ES ON ES.event = E.id
				INNER JOIN tabroom.tourn_setting TS ON TS.tourn = T.id
				LEFT JOIN tabroom.site S ON W.site = S.id
				WHERE
					ES.tag = 'weekend'
					AND ES.value = W.id
					AND TS.tag = 'nsda_district'
					AND W.start > '${startOfYear}-08-01 00:00:00'
					${req.query.district_id ? 'AND TS.value = :districtId' : ''}
				GROUP BY W.id
			`, {
				replacements: req.query.district_id ? { districtId: req.query.district_id } : undefined,
				type: db.Sequelize.QueryTypes.SELECT,
			});

			results = results.map(d => ({ ...d, district: Number(d.district) }));
			districtDates = results;
		} catch (err) {
			console.log(`Error condition recieved`);
			console.log(err);
		}

		return res.status(200).json(districtDates);
	},
};

getDistrictDates.GET.apiDoc = {
	summary: 'Load district dates',
	operationId: 'getDistrictDates',
	parameters: [
		{
			in          : 'query',
			name        : 'district_id',
			description : 'NSDA District ID to filter',
			required    : false,
			schema      : {
				type    : 'integer',
				minimum : 1,
			},
		},
	],
	responses: {
		200: {
			description: 'District Dates',
			content: {
				'*/*': {
					schema: {
						type: 'array',
						items: { $ref: '#/components/schemas/DistrictDate' },
					},
				},
			},
		},
		default: { $ref: '#/components/responses/ErrorResponse' },
	},
	tags: ['nsda'],
};

export default getDistrictDates;
