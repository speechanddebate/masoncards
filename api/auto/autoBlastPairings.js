import db from '../helpers/litedb.js';
import { shareRooms } from  '../controllers/tab/round/share.js';
import { scheduleFlips } from  '../controllers/tab/round/flips.js';
import { invalidateCache } from '../helpers/round.js';
import { blastRoundPairing } from '../controllers/tab/round/blast.js';

const autoBlastRounds = async () => {

	const pendingQueues = await db.sequelize.query(`
		select aq.id, aq.tag, aq.created_at,
			aq.created_by,
			round.id roundId, round.name, round.label, round.published, round.type roundType,
			event.id eventId, event.tourn tournId, event.type eventType, event.abbr eventAbbr,
			(select nats.value
				from tourn_setting nats
				where nats.tag = 'nsda_nats'
				and nats.tourn = tourn.id
			) nats
		from (autoqueue aq, round, event, tourn)
		where (aq.active_at < NOW() OR aq.active_at IS NULL)
			and aq.tag IN ("blast", "publish", "blast_publish")
			and aq.round = round.id
			and round.event = event.id
			and event.tourn = tourn.id
		order by aq.created_at
	`, {
		type: db.Sequelize.QueryTypes.SELECT,
	});

	const promises = [];

//	const aq = db.sequelize.query(`
//		delete autoqueue.*
//			from autoqueue
//		where (autoqueue.active_at < NOW() OR autoqueue.active_at IS NULL)
//			and autoqueue.tag IN ("blast", "publish", "blast_publish")
//	`, {
//		type: db.Sequelize.QueryTypes.DELETE,
//	});
//	promises.push(aq);

	await pendingQueues.forEach( (round) => {

		// Set the round to publish and process the various dependencies thereof.

		if (round.tag !== 'blast') {

			if (round.published !== 1) {
				const publish = db.sequelize.query(`
					update round set published = 1 where round.id = :roundId
				`, {
					replacements: {
						roundId: round.roundId,
					},
					type: db.Sequelize.QueryTypes.UPDATE,
				});
				promises.push(publish);
			}

			const changeLog = {
				round  : round.roundId,
				event  : round.eventId,
				person : round.created_by,
				description : 'Round published by scheduled blast',
			};

			if (parseInt(round.nats) === 1 && round.roundType) {

				const newLog = {
					event       : round.eventId,
					round       : round.roundId,
					person      : round.created_by || 7,
					description : 'Creating round ranks report for Nationals',
				};

				const change = db.sequelize.query(
					`insert into change_log (tag, event, round, person, description) values ('tabbing', :event, :round, :person, :description)`,
					{
						replacements: { ...newLog },
						type: db.Sequelize.QueryTypes.INSERT
					}
				);

				promises.push(change);

				const report = {
					event     : round.eventId,
					round     : round.roundId,
					person    : round.created_by,
				};

				const aq = db.sequelize.query(
					`insert into autoqueue (tag, event, round, created_by, active_at)
					values ('scores', :event, :round, :person, NOW())`,
					{
						replacements: { ...report },
						type: db.Sequelize.QueryTypes.INSERT
					}
				);

				promises.push(aq);
			}

			const cl = db.sequelize.query(
				`insert into change_log (tag, round, event, person, description) values ('tabbing', :round, :event, :person, :description)`,
				{
					replacements: { ...changeLog },
					type: db.Sequelize.QueryTypes.INSERT
				}
			);

			promises.push(cl);

			if (round.eventType === 'debate') {
				// Docshare rooms
				const share = shareRooms(round.roundId);
				promises.push(share);
			}

			if (round.eventType === 'debate' || round.eventType === 'wsdc') {
				// Publish Flips
				const flips = scheduleFlips(round.roundId, round.created_by);
				promises.push(flips);
			}

			// Invalidate Caches
			if (process.env.NODE_ENV === 'production') {
				const production = invalidateCache(round.tournId, round.roundId);
				promises.push(production);
			}
		}

		if (round.tag !== 'publish') {

			// Blast the round! BLAST IT!

			const req = {
				body: {
					sender     : round.created_by,
					noResponse : true,
					message    : round.message,
				},
				session : {
					person : round.created_by,
				},
				params: {
					roundId: round.roundId,
					tournId: round.tournId,
				},
				db,
			};

			const res = {};
			const blast = blastRoundPairing.POST(req, res);
			promises.push(blast);
		}
	});

	await Promise.all(promises);
};

await autoBlastRounds();
process.exit();
