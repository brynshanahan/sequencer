import { createHandler } from '../sequencer'
function isRaf(x: any): x is typeof requestAnimationFrame {
  return x === window.requestAnimationFrame
}
export const frameHandler = createHandler<typeof requestAnimationFrame, number>(
  {
    test: isRaf,
    handle(callback) {
      let frame
      return {
        finished: (next) => {
          frame = requestAnimationFrame(next)
        },
        cancel: () => {
          cancelAnimationFrame(frame)
        },
      }
    },
  }
)
