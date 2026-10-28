import { Validator, type Schema, type ValidationResult } from '@cfworker/json-schema'
import type { ToolDeclaration } from '../appBackends/ipcProtocol'

export interface PublishedTool {
  appId: string
  name: string
  presentedName: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
  validate: (input: unknown) => ValidationResult
}

const TOOL_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_PRESENTED_NAME_LENGTH = 64
const ALLOWED_ANNOTATIONS = ['readOnlyHint', 'destructiveHint']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function annotationError(annotations: unknown): string | null {
  if (annotations === undefined) {
    return null
  }
  if (!isPlainObject(annotations)) {
    return 'annotations must be an object'
  }
  for (const [key, value] of Object.entries(annotations)) {
    if (!ALLOWED_ANNOTATIONS.includes(key)) {
      return `unknown annotation "${key}"`
    }
    if (typeof value !== 'boolean') {
      return `annotation "${key}" must be a boolean`
    }
  }
  return null
}

function buildValidator(inputSchema: unknown): ((input: unknown) => ValidationResult) | string {
  if (!isPlainObject(inputSchema) || inputSchema.type !== 'object') {
    return 'inputSchema must be an object schema with type "object"'
  }
  try {
    const validator = new Validator(inputSchema as Schema, '2020-12')
    return (input: unknown) => validator.validate(input)
  } catch (error) {
    return `inputSchema is not a usable JSON Schema: ${error instanceof Error ? error.message : 'unknown error'}`
  }
}

function toPublishedTool(
  appId: string,
  declaration: ToolDeclaration,
  taken: Set<string>,
): PublishedTool | string {
  const { name, description, inputSchema, annotations } = declaration
  if (typeof name !== 'string' || !TOOL_NAME_PATTERN.test(name)) {
    return 'name must be non-empty and use only letters, digits, underscores, or hyphens'
  }
  const presentedName = `${appId}_${name}`
  if (presentedName.length > MAX_PRESENTED_NAME_LENGTH) {
    return `presented name "${presentedName}" exceeds ${MAX_PRESENTED_NAME_LENGTH} characters`
  }
  if (taken.has(name)) {
    return 'duplicate name'
  }
  if (typeof description !== 'string' || description.trim() === '') {
    return 'description must be a non-empty string'
  }
  const annotationProblem = annotationError(annotations)
  if (annotationProblem) {
    return annotationProblem
  }
  const validate = buildValidator(inputSchema)
  if (typeof validate === 'string') {
    return validate
  }

  const tool: PublishedTool = { appId, name, presentedName, description, inputSchema, validate }
  if (annotations !== undefined) {
    tool.annotations = annotations
  }
  return tool
}

export function validateToolDeclarations(
  appId: string,
  declarations: ToolDeclaration[],
): PublishedTool[] {
  const published: PublishedTool[] = []
  const taken = new Set<string>()
  for (const declaration of declarations) {
    const result = toPublishedTool(appId, declaration, taken)
    if (typeof result === 'string') {
      console.error(`Rejected tool "${declaration?.name ?? ''}" of app "${appId}": ${result}`)
      continue
    }
    taken.add(result.name)
    published.push(result)
  }
  return published
}
