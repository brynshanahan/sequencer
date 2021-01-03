function isGenerator(x: any): x is Generator<any> {
  return typeof x?.next === 'function'
}
function isPromise(x: any): x is Promise<any> {
  return x && x.then && x.catch
}
function isFunction(x: any): x is Function {
  return typeof x === 'function'
}

function isNumber(x: any): x is number {
  return typeof x == 'number'
}

function isArray(x: any): x is any[] {
  return Array.isArray(x)
}

type NextCallback<T> = (value: T) => any
type CancelCallback = () => any

export interface SequenceStep<TResult = any> {
  cancel: CancelCallback
  finished: (next: NextCallback<TResult>) => any
}
interface GeneratorValueHandler<T, TResult = T> {
  test(arg: any): arg is T
  handle(arg: T, handlers: GeneratorValueHandler<any>[]): SequenceStep<TResult>
}

interface GeneratorInterface<T = any> {
  pause(): any
  play(): any
  stop(): any
  finished(): Promise<T>
  onComplete(callback: (param?: T) => any)
  isPaused(): boolean
  isComplete(): boolean
}

export const createEmptyGeneratorInterface = (value) => ({
  pause() {},
  play() {},
  isPaused() {
    return false
  },
  stop() {},
  onComplete() {},
  isComplete() {
    return true
  },
  finished() {
    return Promise.resolve(value)
  },
})

export function runHandler<T>(
  handlers: GeneratorValueHandler<any>[],
  value: T
) {
  let handler = handlers.find((handler) => handler.test(value))

  if (handler) {
    return handler.handle(value, handlers)
  } else {
    console.warn(`Could not find a handler for`, value)
  }
}

export function stepComplete<T>(
  step: SequenceStep | undefined,
  onComplete: (yieldedResult?: any) => any,
  yieldedValue: T | undefined = undefined
) {
  if (step) {
    if (isPromise(step.finished)) {
      /* 
      Wait for the promise to finish. Important to note that running Promise.then
      creates a new microtask instead of running in sync. (So anything after yield promise will run at the end of the current tick or later)
      */
      step.finished.then(onComplete)
    } else if (isFunction(step.finished)) {
      /* 
      If the finished property is a function call it immediately with a callback 
      to notify when to go to the next step 
      */
      step.finished(onComplete)
    } else {
      onComplete(yieldedValue)
    }
  } else {
    onComplete(yieldedValue)
  }
}

export function runSequence<Genny extends Generator<TYield>, TYield>(
  generator: Genny,
  handlers
): GeneratorInterface<TYield | undefined> {
  /* Bail early if we don't have a generator */
  if (!isGenerator(generator)) {
    return createEmptyGeneratorInterface(generator)
  }

  let currentProcess: SequenceStep | undefined

  let isPaused = false
  let isComplete = false

  /* This will be a nextStep function when the sequence is paused */
  let unpauseCallback: undefined | (() => any)
  let onCompleteCallbacks: ((param?: TYield | TYield) => any)[] = []

  let complete = new Promise<TYield | undefined>((resolve) => {
    function nextStep(param?: any) {
      /* Bail early if we are paused (and set unpause to a callback that continues this process) */
      if (isPaused) {
        unpauseCallback = () => nextStep(param)
        return
      }

      let iterResult = generator.next(param)

      if (iterResult.done) {
        let onCompletes = onCompleteCallbacks
        onCompleteCallbacks = []
        onCompletes.forEach((fn) => fn(iterResult.value))
        return resolve(iterResult.value)
      }

      /* This is the actual value that comes from the yield statement
        eg 
          *genny () {
            yield 300
          }

          yieldedValue = 300
      */
      let yieldedValue = iterResult.value

      currentProcess = runHandler(handlers, yieldedValue)
      /* When the step has finished continue onto the next step */
      stepComplete(currentProcess, nextStep, yieldedValue)
    }
    nextStep()
  })

  return {
    play: () => {
      isPaused = false

      if (unpauseCallback) {
        unpauseCallback()
        unpauseCallback = undefined
      }
    },
    pause: () => {
      isPaused = true
    },
    stop() {
      if (currentProcess) {
        currentProcess.cancel()
        currentProcess = undefined
      }
      generator.return(undefined)
      unpauseCallback = undefined
    },
    onComplete(callback: (param?: TYield) => any) {
      onCompleteCallbacks.push(callback)
    },
    finished: () => complete,
    isPaused: () => isPaused,
    isComplete: () => isComplete,
  }
}

type ExtractGeneric<Type> = Type extends GeneratorValueHandler<infer X>
  ? X
  : never

export function createSequencer<Handlers extends GeneratorValueHandler<T>[], T>(
  handlers: Handlers
) {
  return function <T extends (...args: any[]) => Generator<any, any, T>>(
    generator: T
  ) {
    let prevSequence: GeneratorInterface<T | undefined>
    return (...args) => {
      /* Cancel the previously running sequence */
      if (prevSequence) {
        prevSequence.stop()
      }

      /* Run the sequence */
      prevSequence = runSequence(generator(...args), handlers)
      return prevSequence
    }
  }
}

export function runGenerator(
  generatorFunction: GeneratorFunction,
  handlers: GeneratorValueHandler<any>[]
) {
  return runSequence(generatorFunction(), handlers)
}

/* Add a handler that all sequences will use by default */
export function createHandler<T, TResult = T>(
  handler: GeneratorValueHandler<T, TResult>
) {
  return handler
}

/* Creates timeouts from yielded numbers */
export const timeoutHandler = createHandler({
  test: isNumber,
  handle(time) {
    let tm
    return {
      cancel: () => clearTimeout(tm),
      finished: (next) => setTimeout(() => next(time), time),
    }
  },
})

/* Handles yielded promises */
export const promiseHandler = createHandler({
  test: isPromise,
  handle: (promise) => {
    let isCancelled = false
    return {
      finished: (next) =>
        promise.then((result) => {
          if (!isCancelled) {
            next(result)
          }
        }),
      cancel: () => {
        isCancelled = true
      },
    }
  },
})

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

export const seq = createSequencer([
  promiseHandler,
  timeoutHandler,
  arrayHandler,
])

seq(function* () {
  let a = yield 1
  yield 'a'

  a + 2
})
