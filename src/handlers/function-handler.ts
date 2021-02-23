import {
  createHandler,
  isFunction,
  NextCallback,
  SequenceStep,
} from '../sequencer'

type Callback<V> = (next: NextCallback<V>) => any
function isCallback<V>(x: any): x is Callback<V> {
  return isFunction(x)
}

export const functionHandler = createHandler<Function>({
  test: isCallback,
  handle<C extends Callback<U>, U>(onCompleteCallback: C): SequenceStep<U> {
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
