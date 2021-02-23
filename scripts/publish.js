const { execSync, exec } = require('child_process')
const { bump } = require('./general')

function execAsync(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

execSync(`npm run prod`)
bump(require('path').resolve(__dirname, '..'))
console.log('bumping')
execSync(`npm publish`)
