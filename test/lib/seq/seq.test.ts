import { createHandler, createSequencer, seq } from '../../../lib/seq'

function timeout(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

describe('Sequence 2.0', () => {
  it('Cancels subsequent runs using timeouts', async () => {
    let mockFn = jest.fn(() => {})

    let effect = seq(function* () {
      yield 300
      mockFn()
    })

    effect()
    effect()
    await effect().finished()

    expect(mockFn).toBeCalledTimes(1)
  })
  it('Cancels subsequent runs with promises', async () => {
    let mockFn = jest.fn(() => {})

    let effect = seq(function* () {
      yield Promise.resolve()
      mockFn()
    })

    effect()
    effect()
    await effect().finished()

    expect(mockFn).toBeCalledTimes(1)
  })
  it('Runs code before initial yield immediately', async () => {
    let mockFn = jest.fn(() => {})

    let effect = seq(function* () {
      mockFn()
      yield Promise.resolve()
    })

    effect()
    effect()
    await effect().finished()

    expect(mockFn).toBeCalledTimes(3)
  })
  it('Can run multiple yields', async () => {
    let mockFn = jest.fn(() => {})

    let effect = seq(function* () {
      yield Promise.resolve()
      mockFn()
      yield Promise.resolve()
      mockFn()
      yield Promise.resolve()
      mockFn()
    })

    effect()
    await effect().finished()

    expect(mockFn).toBeCalledTimes(3)
  })
  it('Can run yields in sync', async () => {
    let mockFn = jest.fn(() => {})

    let effect = seq(function* () {
      yield [300, 400, Promise.resolve()]
      mockFn()
    })

    effect()
    effect()
    await effect().finished()

    expect(mockFn).toBeCalledTimes(1)
  })
  it('Can run nested arrays', async () => {
    let mockFn = jest.fn(() => {})

    let effect = seq(function* () {
      yield [400, [500, 600], [[Promise.resolve(true)]]]
      mockFn()
    })

    effect()
    await effect().finished()

    expect(mockFn).toBeCalledTimes(1)
  })

  it('Yielding resolves with the correct value', async () => {
    let mockFn = jest.fn()

    let effect = seq(function* () {
      let value = yield [16, Promise.resolve(true), Promise.resolve([false])]
      /* Here we check that the value returned from yield is in fact the resolved values */
      expect(value).toEqual([16, true, [false]])
      mockFn()
    })

    await effect().finished()
    expect(mockFn).toBeCalledTimes(1)
  })
  it('Yielding nested promises should all resolve in the same tick', async () => {
    let mockFn = jest.fn()

    let effect = seq(function* () {
      let value = yield [
        Promise.resolve({}),
        Promise.resolve(true),
        Promise.resolve([false]),
      ]
      expect(value).toEqual([{}, true, [false]])
      mockFn()
      return value
    })

    let run = effect()
    await Promise.resolve()
    expect(mockFn).toBeCalledTimes(1)
    let result = await run.finished()

    expect(result).toEqual([{}, true, [false]])
  })
  it('The resolved value to be the value from the return statement', async () => {
    let mockFn = jest.fn()

    let effect = seq(function* () {
      let value = yield [
        Promise.resolve({}),
        Promise.resolve(true),
        Promise.resolve([false]),
      ]
      expect(value).toEqual([{}, true, [false]])
      mockFn()
      return value
    })

    let run = effect()
    await Promise.resolve()
    expect(mockFn).toBeCalledTimes(1)
    let result = await run.finished()

    expect(result).toEqual([{}, true, [false]])
  })

  it('Can be paused and resumed', async () => {
    let mockFn = jest.fn()
    let test

    let effect = seq(function* () {
      /* The next two lines will be run *before* pause is called */
      mockFn()
      test = yield 100
      mockFn()
      yield 100
      mockFn()
      yield 100
      mockFn()
    })

    let sequence = effect()

    expect(mockFn).toBeCalledTimes(1)
    sequence.pause()
    /* Wait for 100ms */
    await timeout(150)

    /* 
    test = yield 100
    everything to the right of the equal sign will have been run by this point, but test will not yet have been assigned

    So test should be undefined becaused the yield has not yet been resolved
    mockFn() should only have been called once (because everything above the first yield runs in sync)
    */
    expect(test).toBeUndefined()
    expect(mockFn).toBeCalledTimes(1)
    expect(sequence.isPaused()).toBe(true)

    sequence.play()
    await timeout(75)
    expect(mockFn).toBeCalledTimes(2)
    await timeout(75)
    expect(mockFn).toBeCalledTimes(3)
    await timeout(75)
    expect(mockFn).toBeCalledTimes(4)

    return sequence.finished()
  })

  it('Can be used to create custom sequencers', async () => {
    const customSeq = createSequencer([
      createHandler<number>({
        test(x: any): x is number {
          return typeof x === 'number'
        },
        handle(time) {
          let tm
          return {
            finished: (next) => {
              tm = setTimeout(() => next(time), time)
            },
            cancel: () => clearTimeout(tm),
          }
        },
      }),
    ])
    let i = 0

    let effect = customSeq(function* () {
      i++
      // This sequencer doesnt handle promises so this is passed through in sync
      yield timeout(20)
      i++
      // It does handle timeouts though so this causes a set timeout
      yield 100
      i++
    })

    effect()
    await effect().finished()

    expect(i).toBe(5)
  })
})
