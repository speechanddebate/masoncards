import request from 'supertest';
import { assert } from 'chai';
import server from '../../../../app';
import { testUserAPIKey } from '../../../../tests/testFixtures';

const authHeader = Buffer.from(`69:${testUserAPIKey.value}`).toString('base64');

describe('District Dates', () => {
	it('Returns district dates', async () => {
		const res = await request(server)
			.get(`/v1/ext/nsda/district-dates`)
			.set('Accept', 'application/json')
			.set('Authorization', `Basic ${authHeader}`)
			.expect('Content-Type', /json/)
			.expect(200);

		assert.isArray(res.body, 'Response is an array');

		// Could fail if there are no districts scheduled yet this year, so guard it
		// Once we have better synthetic test data, remove the conditional
		if (res.body.length > 0) {
			assert.property(res.body[0], 'district', 'Response has district property');
			assert.property(res.body[0], 'events', 'Response has events property');
			assert.property(res.body[0], 'name', 'Response has name property');
			assert.property(res.body[0], 'location', 'Response has location property');
			assert.property(res.body[0], 'city', 'Response has city property');
			assert.property(res.body[0], 'start', 'Response has start property');
			assert.property(res.body[0], 'end', 'Response has end property');
		}
	}, 30000);

	it('Allows filtering to a district', async () => {
		const res = await request(server)
			.get(`/v1/ext/nsda/district-dates?district_id=2`)
			.set('Accept', 'application/json')
			.set('Authorization', `Basic ${authHeader}`)
			.expect('Content-Type', /json/)
			.expect(200);

		assert.isArray(res.body, 'Response is an array');
	}, 30000);
});
