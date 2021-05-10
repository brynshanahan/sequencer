# Sequencer

Sequencer is a library that aims to simplify sequences of asyncronous tasks. It does that by using generators and user provided resolvers for values that are yielded from the generator

By default this library comes with a sequencer that is setup to resolve promises, numbers (which are resolved as timeouts), requestAnimationFrame, generic callbacks, and arrays (which are resolved by going through and resolves each value in parallel)

---

## Example usage

### Default Sequencer

In this example the button creates a new task every time it is clicked and any previous tasks are cancelled. So if you clicked the button twice in a row it would still only log "Done!" once. The benefit of using seq is that you dont have to worry about handling an isCancelled variable or managing your own timeouts because that is all handled by the sequencer.

```ts
import { seq } from 'seqe'
/* ... */

button.addEventListener(
  'click',
  seq(function* () {
    // Debounce for 300 milliseconds
    yield 300

    // Waits for both promises to resolve
    let [myProfileResponse, postsResponse] = yield [
      fetch('/me'),
      fetch('/posts'),
    ]

    // Waits until the next frame
    let now = yield requestAnimationFrame

    updateUI({
      profile: myProfileResponse,
      posts: postsResponse,
    })

    let complete = yield customUIHasBeenUpdatedCallback

    console.log('Done!')
  })
)
```

### Creating your own sequencer

_setup.ts_

```ts
import {
  createSequencer,
  createHandler,
  timeoutHandler,
  createSequencerHook,
} from 'seqe'

export const animSequencer = createSequencer([
  // Create a resolver that can handle instances of window.Animation (built in web animations)
  createHandler({
    test(value): value is Animation {
      return value instanceof window.Animation
    },
    handle(animation) {
      return {
        finished(next) {
          // When animation is finished it will notify the sequencer
          animation.finished.then(next)
        },
        cancel() {
          // Will stop the animation when cancelled
          animation.stop()
        },
      }
    },
  }),
  timeoutHandler,
])

export const useAnimSequencer = createSequencerHook(animSequencer)
```

_file.ts_

```ts
import { animSequencer } from './setup.ts'

let runAnimation = animSequencer(function* (element) {
  // Waits for animation to complete
  yield element.animate(
    {
      opacity: [0, 1],
      transform: [`translate3d(0px, 0px, 0px)`, `translate3d(0px, 10px, 0px)`],
    },
    {
      duration: 3000,
    }
  )

  // Waits for 1500 milliseconds
  yield 1500

  // Waits for animation to complete
  yield element.animate({
    opacity: [1, 0],
    transform: [`translate3d(0px, 10px, 0px)`, `translate3d(0px, 0px, 0px)`],
  })

  console.log('done')
})

let task = runAnimation(document.querySelector('[data-target]'))

task.pause()
task.play()
task.stop()

// Automatically cancels any previous runs
runAnimation()
runAnimation()
```

### React hook

```tsx
import { useSeq } from 'seqe'

export function Autocomplete () {
  let [input, setInput] = useState('')

  let [results, effect] = useSeq(
    function* () {
      /* Wait for 120 seconds after every input */
      yield 120

      let response = yield fetch(`get-results?q=${input}`)
      let json = yield response.json()

      let value = []

      let last = performance.now()
      for (let row of results) {
        /* Give oppotunity to break every thousand rows */
        if (performance.now() - last > framebudget) {
          last = yield requestAnimationFrame
        }

        value.push(heavyProcessingFunction(row))
      }

      return value
    },
    [input]
  )

  return (
    <div>
      <input type="text" onChange={e => setInput(e.target.value)} value={input}>
      {
        results && <ul>{results.map((item) => <li key={item.id}>{item.value}</li>)}</ul>
      }
    </div>
  )
}

```

### Contributing

The library uses Jest for testing, just run `npm run test`. If you find any issues feel free to submit an issue and send a pr if you have anything to contribute!

**Where to help:**
I would especially appreciate help around typing values returned from yield statements. Right now the yield statement returns a union of all the results from sequence handlers and because one of them is "`unknown`" (the callback handler) it results in them all being unknown
