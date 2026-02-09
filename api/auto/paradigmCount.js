import db from '../helpers/litedb.js';

export const paradigmCount = async () => {

	const rawReviewDates = await db.sequelize.query(`
		select
			ts.tag, ts.value_date
		from tabroom_setting ts
		where 1=1
			and ts.tag IN ('paradigm_review_cutoff', 'paradigm_review_start')
	`, {
		type: db.Sequelize.QueryTypes.SELECT,
	});

	const reviewDates = {};

	rawReviewDates.forEach( (row) => {
		reviewDates[row.tag] = new Date(row.value_date);
	});

	const now = new Date();
	let limiter = new Date('2020-01-01 00:00:00');

	if (
		reviewDates.paradigm_review_cutoff
		&& reviewDates.paradigm_review_cutoff < now
		&& reviewDates.paradigm_review_start
	) {
		limiter = reviewDates.paradigm_review_start;
	}

	const paradigmCounts = await db.sequelize.query(`
		select count(distinct paradigm.id) as paradigmCount
			from person_setting paradigm
		where 1=1
			and paradigm.tag = 'paradigm'
			and paradigm.timestamp > :limiter
		and not exists (
			select banned.id
			from person_setting banned
			use index (person_tag)
			where paradigm.person = banned.person
			and banned.tag IN ('banned', 'email_unconfirmed')
		)
	`, {
		replacements : { limiter },
		type         : db.Sequelize.QueryTypes.SELECT,
	});

	const countValue = paradigmCounts[0].paradigmCount;

	await db.sequelize.query(`
		insert into tabroom_setting (id, tag, value	)
		VALUES(1, "paradigm_count", :countValue)
		ON DUPLICATE KEY UPDATE value = :countValue, timestamp = current_timestamp
	`, {
		replacements : { countValue },
		type         : db.Sequelize.QueryTypes.SELECT,
	});

};

await paradigmCount();
db.sequelize.close();
process.exit();

export default paradigmCount;
