import React, { useEffect, useState } from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { useSeq } from '../../src/react/use-seq'
import { act } from 'react-dom/test-utils'
let container: HTMLDivElement = null
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container)
  container.remove()
  container = null
})

function DemoComponent({ callback }) {
  let [run, setRun] = useState(0)
  let [result, setResult] = useState('a')
  let [value] = useSeq(
    function* () {
      yield 100
      callback()
      setResult('b')
      return 'c'
    },
    [run]
  )
  useEffect(() => {
    if (run < 1) {
      let tm = setTimeout(() => {
        setRun((i) => i + 1)
      }, 50)
      return () => clearTimeout(tm)
    }
  }, [])

  return (
    // @ts-ignore jsx issue
    <>
      <div id='result'>{result}</div>
      <div id='value'>{value}</div>
    </>
  )
}

describe('Sequencer react hook', () => {
  it('Only completes once when component rerenders', async () => {
    let mockFn = jest.fn(() => {})

    await act(async () => {
      render(<DemoComponent callback={mockFn} />, container)

      expect(container.querySelector('#result').textContent).toEqual('a')

      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    expect(container.querySelector('#result').textContent).toEqual('b')
    expect(container.querySelector('#value').textContent).toEqual('c')
    expect(mockFn).toBeCalledTimes(1)
  })
})
