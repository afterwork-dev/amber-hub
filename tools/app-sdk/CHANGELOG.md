# Changelog

All notable changes to `@amber-hub/app-sdk` are documented here, mapped to the documented
App-Hub interface revision each version targets (developer.md is unversioned itself, so this
is the practical way to tell which contract a given SDK version was built against).

## 0.3.0 — 2026-09-06

Adds MCP tool publishing to the backend contract. Additive only — Apps built against 0.2.0 keep working unchanged.

- `AppManager` gains `registerTool(tool)`: an App declares a tool (name, description, JSON
  Schema `inputSchema`, optional `readOnlyHint`/`destructiveHint` annotations, and a handler)
  the same way it registers a route. The handler receives `{ user, input }`; the Hub validates
  input against the schema, runs the handler as the API key's owner, and renders its plain
  return value for the LLM.
- New exports (`@amber-hub/app-sdk/backend`): `ToolDefinition`, `ToolContext`, `AppToolHandler`,
  `ToolInputSchema`, `ToolAnnotations`.

Requires a Hub that serves the `/mcp` endpoint. Tools declared against an older Hub are simply
never published. Check `SDK_VERSION` against the Hub you target.

## 0.2.0 — 2026-08-10

Adds App data storage to the backend contract. Additive only — Apps built against 0.1.0 keep working unchanged.

- `AppManager` gains `storage`, the only way an App persists data: `store`/`query`/`remove`,
  each taking a logical collection name the App chooses plus the record, filter, or id. The
  Hub owns physical naming, validation, and database access; Apps never see any of it.
- New exports (`@amber-hub/app-sdk/backend`): `AppStorage`, `StorableValue`,
  `StorableRecord`, `StoredRecord`, `StorageFilter`, `AppStorageError`,
  `AppStorageErrorCode`, and the `isAppStorageError()` runtime guard — the first runtime
  export on the backend entrypoint, which was types-only until now.
- New shared error codes: `APP_STORAGE_INVALID_COLLECTION_NAME`,
  `APP_STORAGE_INVALID_RECORD`, `APP_STORAGE_INVALID_FILTER`,
  `APP_STORAGE_RECORD_NOT_FOUND`, `APP_STORAGE_UNAVAILABLE`.

Requires a Hub that serves the storage contract; against an older Hub a storage call never
receives a reply. Check `SDK_VERSION` against the Hub you target.

## 0.1.0 — 2026-07-04

Initial release. Tracks the App-Hub interface as documented in developer.md as of this date:

- Frontend contract (`mount`/`unmount`/`context`).
- Backend contract (`registerRoute`/`RouteContext`/init function) and the
  `/app-api/{appId}/{path}` call pattern.

Exports: `AppContext`, `AppMount`, `AppUnmount` (`@amber-hub/app-sdk/frontend`);
`RouteContext`, `AppRouteHandler`, `AppManager`, `AppBackendInit`
(`@amber-hub/app-sdk/backend`); `SDK_VERSION`, `callAppApi`, `AppApiError`, and the
re-exported `ApiResponse`/`ErrorCode` from `@amber-hub/shared` (package root).
