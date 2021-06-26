import React, { createElement, Fragment, useEffect, useState } from 'react'
import { render, unmountComponentAtNode } from 'react-dom'
import { useSeq } from '../../../src/react/use-seq'
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

function TestComponent({ callback }) {
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

  return createElement(
    Fragment,
    {},
    createElement('div', { id: 'result' }, [result]),
    createElement('div', { id: 'value' }, [value])
  )
}

function TestUnmountComponent({ callback }) {
  let [state, set] = useState(0)
  useSeq(
    function* () {
      yield 50
      set((s) => s + 1)
      callback()
    },
    [callback]
  )
  return null
}

describe('Sequencer react hook', () => {
  it('Only completes once when component rerenders', async () => {
    let mockFn = jest.fn(() => {})

    await act(async () => {
      render(createElement(TestComponent, { callback: mockFn }), container)

      expect(container.querySelector('#result').textContent).toEqual('a')

      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    expect(container.querySelector('#result').textContent).toEqual('b')
    expect(container.querySelector('#value').textContent).toEqual('c')
    expect(mockFn).toBeCalledTimes(1)
  })
  it('Runs on mount', async () => {
    let callback = jest.fn(() => {})
    await act(async () => {
      render(createElement(TestUnmountComponent, { callback }), container)
      await new Promise((resolve) => setTimeout(resolve, 100))
      unmountComponentAtNode(container)
    })

    expect(callback).toBeCalledTimes(1)
  })
  it('Cleans up after unmount', async () => {
    let callback = jest.fn(() => {})
    await act(async () => {
      render(createElement(TestUnmountComponent, { callback }), container)
      unmountComponentAtNode(container)
    })

    expect(callback).toBeCalledTimes(0)
  })
})
