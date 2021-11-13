const fetchAndCheck = require('./utils/fia.js')
const Cron = require('cron')
const Runtime = require('./utils/runtime.js')
const Moment = require('moment')

// Run this job every minute
const job = new Cron.CronJob('1-29,31-59 * * * *', async () => {
  if (Runtime.cleaning) {
    const indicesToClean = []
    Runtime.lastDocs.forEach((item, idx) => {
      if (item.date < Moment.tz('Europe/Berlin').subtract(1, 'days')) {
        indicesToClean.push(idx)
      }
    })

    indicesToClean.forEach((index) => {
      Runtime.lastDocs.splice(index, 1)
    })
    console.log('Running Cleanup.')
    Runtime.cleaning = false
  }
  await fetchAndCheck()
})

const cleanJob = new Cron.CronJob('0 4 */1 * *', () => {
  Runtime.cleaning = true
})

console.log('Started FIA-Douments-Discord-Webhook.')
fetchAndCheck()
job.start()
cleanJob.start()
