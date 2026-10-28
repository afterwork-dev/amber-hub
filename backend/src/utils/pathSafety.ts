import { resolve as resolvePath, sep } from 'node:path'

export function isPathWithin(baseDir: string, candidatePath: string): boolean {
  const resolvedBase = resolvePath(baseDir)
  const resolvedCandidate = resolvePath(candidatePath)
  return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(resolvedBase + sep)
}
