import { createResolver, isNumber } from '../sequencer'

/* 
Yielded numbers will be resolved as timeout lengths. The task will wait for the timeout to complete before resuming
If it is cancelled the actual timeout will be cleared
*/
export const timeoutHandler = createResolver({
  test: isNumber,
  handle(time) {
    let tm
    return {
      finished: (next) => setTimeout(() => next(time), time),
      cancel: () => clearTimeout(tm),
    }
  },
})
