import { arrayHandler } from './handlers/array-handler'
import { timeoutHandler } from './handlers/number-handler'
import { promiseHandler } from './handlers/promise-handler'
import { createSequencer } from './sequencer'

/* Create the default sequence handler (called seq) */
export const seq = createSequencer([
  promiseHandler,
  timeoutHandler,
  arrayHandler,
])
