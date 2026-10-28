import type { AppMount } from '../../frontend'

// @ts-expect-error - `root` must be a ShadowRoot, not a string
const wrongRootParamType: AppMount = (root: string, context) => {
  void root
  void context
}

const accessesUnknownContextField: AppMount = (root, context) => {
  void root
  // @ts-expect-error - `userId` does not exist on AppContext
  console.log(context.userId)
}

void wrongRootParamType
void accessesUnknownContextField
