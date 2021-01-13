import React, { useEffect, useState } from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { useSeq } from '../../lib/react/use-seq'
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
  let [result, setResult] = useState("Hasn't completed")
  useSeq(
    function* () {
      yield 100
      callback()
      setResult('Has completed')
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

  // @ts-ignore jsx issue
  return <div id='result'>{result}</div>
}

describe('Sequencer react hook', () => {
  it('Only completes once when component rerenders', async () => {
    let mockFn = jest.fn(() => {})

    await act(async () => {
      render(<DemoComponent callback={mockFn} />, container)

      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    expect(container.querySelector('#result').textContent).toEqual(
      'Has completed'
    )
    expect(mockFn).toBeCalledTimes(1)
  })
})
