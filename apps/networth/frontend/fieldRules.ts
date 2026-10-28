export type Rule = (value: unknown) => true | string

const text = (value: unknown): string => String(value ?? '').trim()

export const optional =
  (rule: Rule): Rule =>
  (value) =>
    value ? rule(value) : true

const withinLength =
  (label: string, maxLength: number): Rule =>
  (value) =>
    text(value).length <= maxLength || `Keep the ${label} to ${maxLength} characters or fewer.`

export function requiredText(label: string, maxLength: number): Rule[] {
  return [
    (value) => text(value) !== '' || `A ${label} is required.`,
    withinLength(label, maxLength),
  ]
}

export function optionalText(label: string, maxLength: number): Rule[] {
  return [optional(withinLength(label, maxLength))]
}
