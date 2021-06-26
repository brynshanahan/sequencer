import { createHandler } from '../sequencer'
function isRaf(x: any): x is typeof requestAnimationFrame {
  return typeof window !== 'undefined' && x === window.requestAnimationFrame
}
export const frameHandler = createHandler<typeof requestAnimationFrame, number>(
  {
    test: isRaf,
    handle() {
      let frame: number
      let cancelled = false
      return {
        finished: (next) => {
          frame = requestAnimationFrame((now) => {
            if (cancelled) return
            next(now)
          })
        },
        cancel: () => {
          cancelled = true
          cancelAnimationFrame(frame)
        },
      }
    },
  }
)
