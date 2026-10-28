export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: {
    errorCode: string
    errorMessage: string
    details?: string[]
  } | null
}
