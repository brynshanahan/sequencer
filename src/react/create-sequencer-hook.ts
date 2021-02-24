import { useState, useEffect } from 'react'
import { handlerKey } from '../handler-key'
import {
  CreateSequenceType,
  runSequence,
  GeneratorInterface,
} from '../sequencer'

type ExtractYield<Type> = Type extends Generator<any, any, infer Yield>
  ? Yield
  : never
type ExtractResult<Type> = Type extends Generator<any, infer Result, any>
  ? Result
  : never

export function createSequencerHook<
  SequencerCallback extends ReturnType<SequencerFunction>,
  SequencerFunction extends CreateSequenceType = CreateSequenceType
>(sequencer: SequencerCallback) {
  let handlers = sequencer[handlerKey]
  return function useSequencer<
    GennFunction extends Parameters<SequencerCallback>[0],
    TGen = ReturnType<GennFunction>,
    TYield = ExtractYield<TGen>,
    TResult = ExtractResult<TGen>
  >(generatorFn: GennFunction, cacheKeys: any[] = []) {
    let [effect, setProcess] = useState<GeneratorInterface<TYield>>(undefined)
    let [result, setResult] = useState<undefined | TResult>(undefined)

    useEffect(() => {
      let effect = runSequence(generatorFn(), handlers)

      setProcess(() => effect)
      setResult(null)
      effect.finished().then((r) => setResult(r))

      return effect.stop
    }, cacheKeys)

    return [result, effect] as const
  }
}
