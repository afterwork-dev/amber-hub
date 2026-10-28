import { buildServer } from './buildServer'
import { PORT } from './config/env'
import { connectMongo, disconnectMongo } from './db/mongoClient'
import { ensureIndexes as ensureApiKeyIndexes } from './repositories/apiKey/apiKeyRepository'
import { ensureIndexes as ensureUserIndexes } from './repositories/user/userRepository'
import { apiKeysRoutes } from './routes/apiKeys/apiKeys.routes'
import { appApiRoutes } from './routes/app-api/appApi.routes'
import { mcpRoutes } from './routes/mcp/mcp.routes'
import { appsRoutes } from './routes/apps/apps.routes'
import { authRoutes } from './routes/auth/auth.routes'
import { resourcesRoutes } from './routes/resources/resources.routes'
import { startAppBackends } from './services/appBackends/appBackendManager'

async function start(): Promise<void> {
  await connectMongo()
  await ensureUserIndexes()
  await ensureApiKeyIndexes()

  await startAppBackends()

  const server = await buildServer()
  await server.register(authRoutes, { prefix: '/api' })
  await server.register(appsRoutes, { prefix: '/api' })
  await server.register(apiKeysRoutes, { prefix: '/api' })
  await server.register(resourcesRoutes, { prefix: '/resources' })
  await server.register(appApiRoutes, { prefix: '/app-api' })
  await server.register(mcpRoutes, { prefix: '/mcp' })
  await server.listen({ port: PORT, host: '0.0.0.0' })

  const shutdown = async (): Promise<void> => {
    try {
      await server.close()
      await disconnectMongo()
      process.exit(0)
    } catch (error) {
      server.log.error(error)
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
