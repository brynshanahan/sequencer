export function isGenerator(x: any): x is Generator<any> {
  return typeof x?.next === 'function'
}
export function isPromise(x: any): x is Promise<any> {
  return x && x.then && x.catch
}
export function isFunction(x: any): x is Function {
  return typeof x === 'function'
}

export function isNumber(x: any): x is number {
  return typeof x == 'number'
}

export function isArray(x: any): x is any[] {
  return Array.isArray(x)
}

export type NextCallback<T> = (value: T) => any
type CancelCallback = () => any

export interface SequenceStep<TResult = any> {
  cancel: CancelCallback
  finished: (next: NextCallback<TResult>) => any
}
export interface GeneratorValueHandler<TYield, TResult = TYield> {
  test(arg: any): arg is TYield
  handle(
    arg: TYield,
    handlers: GeneratorValueHandler<any>[]
  ): SequenceStep<TResult>
}

export interface GeneratorInterface<TResult> {
  pause(): any
  play(): any
  stop(): any
  finished(): Promise<TResult>
  onComplete(callback: (param?: TResult) => any)
  isPaused(): boolean
  isComplete(): boolean
}

export const handlerKey = Symbol('handlers')

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

/* 
This function is passed a Generator (rather than a generator factory)
and is responsible for running through each step in the generator
it is also responsible for returning the task api (pause, play, stop)
*/
export function runSequence<
  Genny extends Generator<TYield, TResult>,
  TYield = any,
  TResult = any
>(
  generator: Genny,
  handlers
): GeneratorInterface<TYield | TResult | undefined> {
  /* Bail early if we don't have a generator */
  if (!isGenerator(generator)) {
    return createEmptyGeneratorInterface(generator)
  }

  let currentProcess: SequenceStep | undefined

  let isPaused = false
  let isComplete = false

  /* This will be a nextStep function when the sequence is paused */
  let unpauseCallback: undefined | (() => any)
  let onCompleteCallbacks: ((
    param?: TYield | TResult | undefined
  ) => any)[] = []

  let complete = new Promise<TYield | TResult | undefined>((resolve) => {
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

export type ExtractGeneric<Type> = Type extends GeneratorValueHandler<infer X>[]
  ? X
  : never

export type ExtractSecondGeneric<
  TYield,
  Type
> = Type extends GeneratorValueHandler<TYield, infer X> ? X : never

export type CreateSequenceType = <
  Handlers extends GeneratorValueHandler<any>[],
  TYield = ExtractGeneric<Handlers>,
  TValue = ExtractSecondGeneric<TYield, GeneratorValueHandler<TYield>>
>(
  handlers: Handlers
) => {
  [handlerKey]: Handlers
  /* Sequence callback */
  <T extends (...args: any[]) => Generator<TYield, any, TValue>>(
    generator: T
  ): {
    /* Returns function that creates the generator interface */
    (...args: any[]): GeneratorInterface<TYield>
  }
}

export const createSequencer: CreateSequenceType = <Handlers, TYield, TValue>(
  handlers: Handlers
) => {
  /* Create the  */
  let sequenceCallback = Object.assign(
    function <T extends (...args: any[]) => Generator<TYield, any, TValue>>(
      generator: T
    ) {
      let prevSequence: GeneratorInterface<TYield>
      return (...args) => {
        /* Cancel the previously running sequence */
        if (prevSequence) {
          prevSequence.stop()
        }

        /* Run the sequence */
        prevSequence = runSequence(generator(...args), handlers)
        return prevSequence
      }
    },
    { [handlerKey]: handlers }
  )

  return sequenceCallback
}

/* Add a handler that all sequences will use by default */
export function createHandler<T, TResult extends any = T>(
  handler: GeneratorValueHandler<T, TResult>
) {
  return handler
}
