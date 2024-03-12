import { createPinia } from 'pinia'

export function setupStore(app) {
  app.use(createPinia())
}

export * from './modules'
