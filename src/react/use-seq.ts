import { seq } from '../seq'
import { createSequencerHook } from './create-sequencer-hook'

export const useSeq = createSequencerHook(seq)
