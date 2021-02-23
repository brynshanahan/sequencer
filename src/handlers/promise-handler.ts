import { createHandler, isPromise } from '../sequencer'

/* 
Yielded promises are handled here. 
If task is stopped the logic inside the promise will continue to run but the application will ignore
the fact that the promise is resolved or rejected
*/
export const promiseHandler = createHandler({
  test: isPromise,
  handle: (promise) => {
    let isCancelled = false
    return {
      finished: (next) =>
        promise
          .then((result) => {
            if (!isCancelled) {
              next(result)
            }
          })
          .catch((err) => {
            if (!isCancelled) {
              throw err
            }
          }),
      cancel: () => {
        isCancelled = true
      },
    }
  },
})
