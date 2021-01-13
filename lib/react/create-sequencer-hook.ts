import { useState, useEffect } from 'react'
import {
  handlerKey,
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
  >(generatorFn: GennFunction, cacheKeys?: any[]) {
    let [effect, setProcess] = useState<GeneratorInterface<TYield>>(undefined)
    let [result, setResult] = useState(null as null | TYield | TResult)

    useEffect(() => {
      let effect = runSequence(generatorFn() as any, handlers)

      setProcess(effect)
      setResult(null)
      effect.finished().then((result) => setResult(result))

      return effect.stop
    }, cacheKeys)

    return [result, effect] as [typeof result, typeof effect]
  }
}
