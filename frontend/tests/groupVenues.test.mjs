import assert from 'node:assert/strict'
import test from 'node:test'
import { groupVenues } from '../src/utils/groupVenues.ts'

const bar = (id, name, lat = 58.58, lng = 16.18) => ({ id, name, lat, lng, user_id: null })
const report = (id, venue_id) => ({ id, venue_id, price: 60, volym: 40 })

test('separate bars with identical names keep their own reports and coordinates', () => {
  const groups = groupVenues(
    [bar(1, 'The Pub'), bar(2, 'The Pub', 58.6, 16.2)],
    [report(10, 1), report(20, 2)],
  )
  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map((group) => group.reports.map((r) => r.id)), [[10], [20]])
  assert.deepEqual(groups.map((group) => [group.lat, group.lng]), [[58.58, 16.18], [58.6, 16.2]])
})

test('renaming a bar keeps its stable key and all linked reports', () => {
  const reports = [report(10, 1), report(11, 1)]
  const before = groupVenues([bar(1, 'The Pub')], reports)[0]
  const after = groupVenues([bar(1, 'The New Pub')], reports)[0]
  assert.equal(before.key, after.key)
  assert.equal(after.name, 'The New Pub')
  assert.deepEqual(after.reports, reports)
})

test('filtering reports does not move the marker or change its identity', () => {
  const venue = bar(1, 'The Pub')
  const groups = groupVenues([venue], [report(11, 1)])
  assert.equal(groups[0].id, venue.id)
  assert.equal(groups[0].lat, venue.lat)
  assert.equal(groups[0].lng, venue.lng)
})

test('bars without reports remain available and orphan reports do not create bars', () => {
  const groups = groupVenues([bar(1, 'The Pub')], [report(10, 99)])
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].reports, [])
})
