import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const event = { preventDefault() {} }

function elements(tree) {
  if (Array.isArray(tree)) return tree.flatMap(elements)
  if (!tree || typeof tree !== 'object' || !tree.props) return []
  return [tree, ...elements(tree.props.children)]
}

// Render the components' event handlers with persistent hooks and a fake server.
function renderComponent(file, server, props, select = (exports) => exports.default) {
  const hooks = []
  const effects = []
  let cursor = 0
  const sameDeps = (previous, next) => previous && next && previous.length === next.length && previous.every((value, i) => Object.is(value, next[i]))
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = initial
      return [hooks[index], (value) => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useRef(initial) {
      const index = cursor++
      return hooks[index] ??= { current: initial }
    },
    useMemo(calculate, deps) {
      const index = cursor++
      if (!sameDeps(hooks[index]?.deps, deps)) hooks[index] = { value: calculate(), deps }
      return hooks[index].value
    },
    useEffect(effect, deps) {
      const index = cursor++
      if (!sameDeps(hooks[index]?.deps, deps)) {
        effects.push(() => {
          hooks[index]?.cleanup?.()
          hooks[index] = { deps, cleanup: effect() }
        })
      }
    },
  }
  function loadComponent(fileName) {
    const source = readFileSync(new URL(`../src/components/${fileName}`, import.meta.url), 'utf8')
      .replace('import.meta.env.VITE_MAPBOX_TOKEN', '"test-token"')
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    })
    const module = { exports: {} }
    new Function('require', 'module', 'exports', 'document', outputText)((name) => {
      if (name === 'react') return react
      if (name === '../lib/supabase') return { supabase: server }
      if (name === '../utils/temperature') return { getTempLabel: () => 'Kall' }
      if (name === '../utils/openingHours') return require('../src/utils/openingHours.ts')
      if (name === 'mapbox-gl') return { __esModule: true, default: server.mapbox }
      if (name.endsWith('.css')) return {}
      if (name.startsWith('./')) return loadComponent(`${name.slice(2)}.tsx`)
      return require(name)
    }, module, module.exports, server.document)
    return module.exports
  }
  const Component = select(loadComponent(file))
  return () => {
    cursor = 0
    const tree = elements(Component(props))
    for (const element of tree) {
      if (element.props.ref && element.props.ref.current === null) element.props.ref.current = {}
    }
    while (effects.length) effects.shift()()
    return tree
  }
}

test('map keeps its source and layers across panel renders, votes, and filter changes', () => {
  const maps = []
  const sources = []
  const layers = []
  const updates = []
  const server = {
    document: { createElement: () => ({ style: {}, dataset: {}, addEventListener() {} }) },
    mapbox: {
      Map: class {
        constructor() { this.handlers = {}; maps.push(this) }
        on(event, layer, handler) { this.handlers[handler ? `${event}:${layer}` : event] = handler ?? layer }
        off() {}
        getCanvas() { return { style: {} } }
        addSource(id, source) { sources.push({ id, source }) }
        addLayer(layer) { layers.push(layer) }
        getSource() { return { setData: (data) => updates.push(data) } }
      },
    },
  }
  const first = { key: '1', id: 1, name: 'Pub', lat: 58.5, lng: 16.2, reports: [
    { id: 10, price: 40, volym: 40 }, { id: 11, price: 120, volym: 40 },
  ] }
  const second = { key: '2', id: 2, name: 'Other pub', lat: 58.6, lng: 16.3, reports: [] }
  const props = {
    venueGroups: [first, second], votes: [], reviews: [], user: null, placingMode: false,
    setSelectedCoords() {}, onMapClick() {}, onPlaceConfirmed() {}, onCancelPlace() {},
  }
  const render = renderComponent('MapView.tsx', server, props)
  render()
  maps[0].handlers.load()
  render()
  const beforePanel = updates.length
  render()
  assert.equal(updates.length, beforePanel, 'an unrelated rerender must not update the map source')
  props.votes = [{ report_id: 11, value: 1 }]
  render()
  assert.equal(updates.at(-1).features[0].properties.color, '#e04040')
  props.venueGroups = [{ ...first, reports: [first.reports[0]] }]
  render()
  assert.equal(maps.length, 1)
  assert.equal(sources.length, 1)
  assert.equal(layers.length, 3)
  assert.equal(updates.at(-1).features.length, 1)
  assert.equal(updates.at(-1).features[0].properties.color, '#3fb64b')
  assert.equal(updates.at(-1).features[0].properties.key, '1')
})

test('report actions are hidden for visitors and other users', () => {
  for (const userId of [null, 'other-user']) {
    const render = renderComponent('ReportActions.tsx', {}, {
      report: { id: 12, user_id: 'owner' }, userId, onEdit() {}, onDeleted() {},
    })
    assert.deepEqual(render(), [])
  }
})

test('report deletion requires confirmation, recovers from failure, and blocks repeated requests', async () => {
  let complete
  let deletes = 0
  let deletedId
  let success = false
  const filters = []
  const chain = {
    eq(column, value) { filters.push([column, value]); return this },
    select() {
      deletes++
      return success ? Promise.resolve({ data: [{ id: 12 }], error: null })
        : new Promise((resolve) => { complete = resolve })
    },
  }
  const render = renderComponent('ReportActions.tsx', { from: () => ({ delete: () => chain }) }, {
    report: { id: 12, user_id: 'owner' }, userId: 'owner', onEdit() {},
    onDeleted: (id) => { deletedId = id },
  })
  render().find((el) => el.props['aria-label'] === 'Ta bort rapport').props.onClick()
  assert.equal(deletes, 0)
  const confirm = render().find((el) => el.props.className === 'report-delete-confirm')
  const pending = confirm.props.onClick()
  await confirm.props.onClick()
  assert.equal(deletes, 1)
  assert.ok(render().filter((el) => el.type === 'button').every((el) => el.props.disabled))
  complete({ data: null, error: { message: 'Denied' } })
  await pending
  assert.equal(deletedId, undefined)
  assert.ok(render().find((el) => el.props.role === 'alert'))
  success = true
  await render().find((el) => el.props.className === 'report-delete-confirm').props.onClick()
  assert.equal(deletedId, 12)
  assert.deepEqual(filters.slice(0, 2), [['id', 12], ['user_id', 'owner']])
})

test('editing pre-fills the original report and updates its ID instead of inserting', async () => {
  let saved
  let closed = 0
  let changed = 0
  const filters = []
  const chain = {
    eq(column, value) { filters.push([column, value]); return this },
    select() { return this },
    single: async () => ({ data: { id: 12 }, error: null }),
  }
  const render = renderComponent('AddVenues.tsx', { from: () => ({ update: (data) => { saved = data; return chain } }) }, {
    selectedCoords: { lat: 58.5, lng: 16.2 }, venue: { id: 1, name: 'Pub' }, userId: 'owner',
    reportToEdit: { id: 12, venue_id: 1, user_id: 'owner', price: 60, volym: 40, kannaPrice: 150, guinness: true, beerType: 'Lager', temperature: 3, rating: 7 },
    onClose: () => closed++, onVenueAdded: () => changed++,
  })
  const price = render().find((el) => el.props.placeholder === 'Ölpris (kr)')
  assert.equal(price.props.value, '60')
  price.props.onChange({ target: { value: '65' } })
  await render().find((el) => el.type === 'form').props.onSubmit(event)
  assert.equal(saved.price, 65)
  assert.equal(saved.volym, 40)
  assert.equal(saved.guinness, true)
  assert.equal(saved.beerType, 'Lager')
  assert.equal(saved.venue_id, undefined)
  assert.deepEqual(filters, [['id', 12], ['user_id', 'owner']])
  assert.equal(closed, 1)
  assert.equal(changed, 1)
})

test('review blocks repeated submits, preserves text on failure, and allows retry', async () => {
  let complete
  let writes = 0
  let closed = 0
  let added = 0
  let fail = true
  const server = { from: () => ({ insert: () => {
    writes++
    return fail ? new Promise((resolve) => { complete = resolve }) : Promise.resolve({ error: null })
  } }) }
  const render = renderComponent('ReviewModal.tsx', server, {
    reportId: 12, user: { id: 'user' },
    onClose: () => closed++, onReviewAdded: () => added++,
  })
  render().find((el) => el.type === 'textarea').props.onChange({ target: { value: 'My review' } })
  const submit = render().find((el) => el.type === 'form').props.onSubmit
  const pending = submit(event)
  await submit(event)
  assert.equal(writes, 1)
  assert.ok(render().filter((el) => el.type === 'button').every((el) => el.props.disabled))
  complete({ error: { message: 'Permission denied' } })
  await pending
  assert.equal(closed, 0)
  assert.equal(added, 0)
  assert.equal(render().find((el) => el.type === 'textarea').props.value, 'My review')
  assert.ok(render().find((el) => el.props.role === 'alert'))
  assert.ok(render().filter((el) => el.type === 'button').every((el) => !el.props.disabled))
  fail = false
  await render().find((el) => el.type === 'form').props.onSubmit(event)
  assert.equal(writes, 2)
  assert.equal(closed, 1)
  assert.equal(added, 1)
})

for (const action of ['upsert', 'delete']) {
  test(`vote ${action} reports failures, unlocks after network errors, and allows retry`, async () => {
    let failure = 'database'
    let refreshed = 0
    let changes = 0
    const write = async () => {
      if (failure === 'database') return { error: { message: 'Permission denied' } }
      if (failure === 'network') throw new Error('Offline')
      return { error: null }
    }
    const chain = { eq() { return this }, then(resolve, reject) { return write().then(resolve, reject) } }
    const server = { from: () => ({
      upsert: write, delete: () => chain,
      select: async () => { refreshed++; return { data: [], error: null } },
    }) }
    const report = { id: 12, user_id: 'other-user' }
    const props = {
      report, user: { id: 'user' }, reviews: [], userAlreadyReviewed: false,
      votes: action === 'delete' ? [{ report_id: 12, user_id: 'user', value: 1 }] : [],
      onVoteChange: () => changes++, onAddReview() {},
    }
    const render = renderComponent('VenueGroupPanel.tsx', server, props, (exports) => {
      const panel = exports.default({
        group: { name: 'Pub', reports: [report] }, votes: [], reviews: [], user: null,
        onClose() {}, onVoteChange() {}, onAddReview() {}, onAddReport() {},
      })
      return elements(panel).find((el) => el.type?.name === 'SubmissionCard').type
    })
    const up = () => render().find((el) => el.props.className?.startsWith('vote-btn up'))
    await up().props.onClick()
    assert.ok(render().find((el) => el.props.role === 'alert'))
    assert.equal(up().props.disabled, false)
    assert.equal(refreshed, 0)
    assert.equal(changes, 0)
    failure = 'network'
    await up().props.onClick()
    assert.ok(render().find((el) => el.props.role === 'alert'))
    assert.equal(up().props.disabled, false)
    assert.equal(refreshed, 0)
    failure = null
    await up().props.onClick()
    assert.equal(changes, 1)
    assert.equal(refreshed, 1)
    assert.ok(!render().find((el) => el.props.role === 'alert'))
  })
}
