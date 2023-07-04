const https = require('https')
const express = require('express')
const { DateTime } = require("luxon")
const app = express()
const port = 8080

const coinGeckoAPI = 'https://api.coingecko.com/api/v3/'
const priceUrl = 'simple/price'
const priceHistoryUrl = (coin) => {
  return `coins/${coin}/history`
}
const marketUrl = (coin) => {
  return `coins/${coin}/market_chart`
}

const encodeGetParams = p =>
    Object.entries(p).map(kv => kv.map(encodeURIComponent).join("=")).join("&")

const httpsGetRequest = (url, params) => {
  if (params) {
    url += '?' + encodeGetParams(params)
  }
  console.log('url', url)
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = ''

      resp.on('data', (chunk) => {
        data += chunk
      })

      resp.on('end', () => {
        console.log('data', data)
        resolve(data)
      })

    }).on("error", (err) => {
      console.log("Error: " + err.message)
      reject(err)
    })
  })
}

const getCoinPrice = async (coin) => {
  const url = coinGeckoAPI + priceUrl
  const params = {
    ids: coin,
    vs_currencies: 'usd',
  }

  const response = await httpsGetRequest(url, params)
  console.log('Response', response)
  return JSON.parse(response)
}

const getCoinHistoryPrice = async (coin, date) => {
  const url = coinGeckoAPI + priceHistoryUrl(coin)
  const params = {
    date: date,
    localization: false,
  }

  const response = await httpsGetRequest(url, params)
  return JSON.parse(response)
}

const getCoinMarketData = async (coin) => {
  const url = coinGeckoAPI + marketUrl(coin)
  const params = {
    vs_currency: 'usd',
    days: 15,
    interval: 'daily',
  }

  const response = await httpsGetRequest(url, params)
  return JSON.parse(response)
}

app.get('/v0/:coin', async (req, res) => {

  const coin = req.params.coin

  if (coin === undefined) {
    res.sendStatus(403)
    res.json({
      error: true,
      message: 'Invalid coin requested'
    })
  }

  const now = DateTime.now()
  const yesterday = now.minus({days: 1})
  const sevenDays = now.minus({days: 7})
  const month = now.minus({months: 1})

  const coinPrice = await getCoinPrice(coin)
  const currentPrice = coinPrice[coin]['usd']

  const yesterdayResult = await getCoinHistoryPrice(coin, yesterday.toFormat('dd-MM-yyyy'))
  const price24h = yesterdayResult['market_data']['current_price']['usd']
  const change24h = (currentPrice - price24h) / price24h * 100

  const sevenDaysResult = await getCoinHistoryPrice(coin, sevenDays.toFormat('dd-MM-yyyy'))
  const price7d = sevenDaysResult['market_data']['current_price']['usd']
  const change7d = (currentPrice - price7d) / price7d * 100

  const monthResult = await getCoinHistoryPrice(coin, month.toFormat('dd-MM-yyyy'))
  const price1m = monthResult['market_data']['current_price']['usd']
  const change1m = (currentPrice - price1m) / price1m * 100

  const marketResult = await getCoinMarketData(coin)

  const response = {
    error: false,
    data: {
      coinPrice: {
        currentPrice,
        change24H: change24h,
        change7D: change7d,
        change1M: change1m,
      },
      marketData: marketResult,
    }
  }

  res.send(JSON.stringify(response))
})

app.listen(port, () => {
  console.log(`CryptoGraph API listening on port ${port}`)
})


