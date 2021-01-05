import { createHandler, isFunction } from '../sequencer'

export const functionHandler = createHandler<Function, unknown>({
  test: isFunction,
  handle(onCompleteCallback) {
    let isCancelled = false
    return {
      finished: (next) => {
        onCompleteCallback((value) => {
          if (!isCancelled) {
            next(value)
          }
        })
      },
      cancel: () => {
        isCancelled = true
      },
    }
  },
})
