import { Elysia } from '../../src'

import { describe, expect, it } from 'bun:test'
import { req } from '../utils'

import { AsyncLocalStorage } from 'async_hooks'

describe('Edge Case', () => {
	it('handle state', async () => {
		const app = new Elysia()
			.state('a', 'a')
			.get('/', ({ store: { a } }) => a)
		const res = await app.handle(req('/'))

		expect(await res.text()).toBe('a')
	}, 5000) // Add timeout of 5 seconds

	// https://github.com/oven-sh/bun/issues/1523
	it("don't return HTTP 10", async () => {
		const app = new Elysia().get('/', ({ set }) => {
			set.headers.Server = 'Elysia'

			return 'hi'
		})

		const res = await app.handle(req('/'))
		expect(res.status).toBe(200)
	}, 5000) // Add timeout of 5 seconds

	it('has no side-effect', async () => {
		const app = new Elysia()
			.get('/1', ({ set }) => {
				set.headers['x-server'] = 'Elysia'

				return 'hi'
			})
			.get('/2', () => 'hi')

		const res1 = await app.handle(req('/1'))
		const res2 = await app.handle(req('/2'))

		expect(res1.headers.get('x-server')).toBe('Elysia')
		expect(res2.headers.get('x-server')).toBe(null)
	}, 5000) // Add timeout of 5 seconds

	it('return Promise', async () => {
		const app = new Elysia().get(
			'/',
			() => new Promise((resolve) => resolve('h'))
		)

		const res = await app.handle(req('/')).then((x) => x.text())
		expect(res).toBe('h')
	}, 5000) // Add timeout of 5 seconds

	it('handle dynamic all method', async () => {
		const app = new Elysia().all('/all/*', () => 'ALL')

		const res = await app.handle(req('/all/world')).then((x) => x.text())
		expect(res).toBe('ALL')
	}, 5000) // Add timeout of 5 seconds

	// ? since different runtime expected to have different implementation of new Response
	// ? we can't handle all the case
	// it('handle object of class', async () => {
	// 	class SomeResponse {
	// 		constructor(public message: string) {}
	// 	}

	// 	const app = new Elysia().get(
	// 		'/',
	// 		() => new SomeResponse('Hello, world!')
	// 	)

	// 	const res = await app.handle(req('/')).then((x) => x.json())
	// 	expect(res).toStrictEqual({
	// 		message: 'Hello, world!'
	// 	})
	// })

	// it('handle object of class (async)', async () => {
	// 	class SomeResponse {
	// 		constructor(public message: string) {}
	// 	}

	// 	const app = new Elysia().get('/', async () => {
	// 		await Bun.sleep(1)
	// 		return new SomeResponse('Hello, world!')
	// 	})

	// 	const res = await app.handle(req('/')).then((x) => x.json())
	// 	expect(res).toStrictEqual({
	// 		message: 'Hello, world!'
	// 	})
	// })

	it('handle strict path and loose path', async () => {
		const loose = new Elysia().group('/a', (app) =>
			app.get('/', () => 'Hi')
		)

		expect(await loose.handle(req('/a')).then((x) => x.status)).toBe(200)
		expect(await loose.handle(req('/a/')).then((x) => x.status)).toBe(200)

		const strict = new Elysia({
			strictPath: true
		}).group('/a', (app) => app.get('/', () => 'Hi'))

		expect(await strict.handle(req('/a')).then((x) => x.status)).toBe(404)
		expect(await strict.handle(req('/a/')).then((x) => x.status)).toBe(200)
	}, 5000) // Add timeout of 5 seconds

	it('return cookie with file', async () => {
		const kyuukararin = Bun.file('test/kyuukurarin.mp4')

		const app = new Elysia().get('/', ({ cookie: { name } }) => {
			name.set({
				value: 'Rikuhachima Aru',
				maxAge: new Date().setFullYear(new Date().getFullYear() + 1),
				httpOnly: true
			})

			return kyuukararin
		})

		const response = await app
			.handle(req('/'))
			// @ts-expect-error
			.then((x) => x.headers.toJSON())

		expect(response['set-cookie']).toHaveLength(1)
		expect(response['content-type']).toBe('video/mp4')
	}, 5000) // Add timeout of 5 seconds

	it('preserve correct index order of routes if duplicated', () => {
		const app = new Elysia()
			.get('/0', () => '0')
			.get('/1', () => '1')
			.get('/2', () => '2')
			.get('/3', () => '3')
			.get('/1', () => '-')
			.get('/4', () => '4')

		// @ts-expect-error
		expect(app.routeTree.get('GET/0')).toEqual(0)
		// @ts-expect-error
		expect(app.routeTree.get('GET/4')).toEqual(4)
	}, 5000) // Add timeout of 5 seconds

	it('preserve correct index order of routes if duplicated from plugin', () => {
		const plugin = new Elysia()
			.get('/3', () => '3')
			.get('/1', () => '-')
			.get('/4', () => '4')

		const app = new Elysia()
			.get('/0', () => '0')
			.get('/1', () => '1')
			.get('/2', () => '2')
			.use(plugin)

		// @ts-expect-error
		expect(app.routeTree.get('GET/0')).toEqual(0)
		// @ts-expect-error
		expect(app.routeTree.get('GET/4')).toEqual(4)
	}, 5000) // Add timeout of 5 seconds

	it('get getGlobalRoutes', () => {
		const plugin = new Elysia().get('/', () => 'hello')

		const main = new Elysia().use(plugin).get('/2', () => 'hi')

		// @ts-expect-error private property
		expect(main.getGlobalRoutes().length).toBe(2)
	}, 5000) // Add timeout of 5 seconds
})