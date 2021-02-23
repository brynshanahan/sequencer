import {
  createHandler,
  isArray,
  runHandler,
  SequenceStep,
  stepComplete,
} from '../sequencer'

/* 
Yielding an array is essentially short hand for promise.all 
(it runs all the values that you can normally yield in "parallel" rather than in sequence)
*/
export const arrayHandler = createHandler({
  test: isArray,
  handle(arr, handlers) {
    let steps: Set<SequenceStep> = new Set()
    let results: any[] = []
    let onUpdate = () => {}
    let isCancelled = false

    arr.forEach((val, i) => {
      let step = runHandler(handlers, val)

      if (step) {
        steps.add(step)

        stepComplete(step, (value) => {
          /* 
          Would need to wrap this in another if type guard to make ts happy
          even though it's already in one technically
          */
          // @ts-ignore
          steps.delete(step)
          /* Notify that we have completed another step */
          results[i] = value

          onUpdate()
        })
      }
    })

    return {
      finished: (next) => {
        onUpdate = () => {
          if (!steps.size && !isCancelled) {
            next(results)
          }
        }
        /* Check if we are already complete (ie given an empty array) */
        onUpdate()
      },
      cancel: () => {
        isCancelled = true
        steps.forEach((step) => {
          step.cancel()
        })
      },
    }
  },
})
