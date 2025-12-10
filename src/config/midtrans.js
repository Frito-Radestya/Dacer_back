const midtransClient = require('midtrans-client')

let snapInstance = null

function getSnapClient () {
  if (snapInstance) return snapInstance

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  const serverKey = process.env.MIDTRANS_SERVER_KEY

  if (!serverKey) {
    console.warn('[Midtrans] MIDTRANS_SERVER_KEY is not set. Midtrans payments will not work.')
  }

  snapInstance = new midtransClient.Snap({
    isProduction,
    serverKey
  })

  return snapInstance
}

module.exports = {
  getSnapClient
}
