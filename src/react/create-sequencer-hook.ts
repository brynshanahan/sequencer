import { useState, useEffect } from 'react'
import { handlerKey } from '../handler-key'
import { runSequence, GeneratorInterface } from '../sequencer'
import type { createSequencer } from '../sequencer'

type ExtractYield<Type> = Type extends Generator<any, any, infer Yield>
  ? Yield
  : never
type ExtractResult<Type> = Type extends Generator<any, infer Result, any>
  ? Result
  : never

export function createSequencerHook<
  SequencerFunction extends typeof createSequencer,
  SequencerCallback extends ReturnType<SequencerFunction>
>(sequencer: SequencerCallback) {
  let handlers = sequencer[handlerKey]
  return function useSequencer<
    GennFunction extends Parameters<SequencerCallback>[0],
    TGen = ReturnType<GennFunction>,
    TYield = ExtractYield<TGen>,
    TResult = ExtractResult<TGen>
  >(generatorFn: GennFunction, cacheKeys: any[] = []) {
    let [process, setProcess] =
      useState<GeneratorInterface<TResult> | false>(undefined)
    let [result, setResult] = useState<undefined | TResult>(undefined)

    useEffect(() => {
      let currentProcess = runSequence(generatorFn(), handlers)

      setProcess(() => currentProcess)
      setResult(null)
      currentProcess.onComplete((r) => {
        setResult(() => r)
        setProcess(() => undefined)
      })

      return currentProcess.stop
    }, cacheKeys)

    return [result, process] as const
  }
}
