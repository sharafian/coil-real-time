const { NodeMediaServer } = require('node-media-server');
const stream = require('stream')
const Koa = require('koa')
const httpProxy = require('http-proxy')
const http = require('http')
const router = require('koa-router')()
const serve = require('koa-static')
const { Monetizer } = require('web-monetization-receiver')
const path = require('path')
 
const config = {
  logType: 3,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 60,
    ping_timeout: 30
  },
  http: {
    port: 8000,
    allow_origin: '*'
  }
};
 
const nms = new NodeMediaServer(config)
const proxy = new httpProxy.createProxy({})
const app = new Koa()
const monetizer = new Monetizer()

router.get('/live/*', ctx => {
  const pass = new stream.PassThrough()
  const monetized = ctx.webMonetization.monetizeStream(pass)
  monetized.pipe(ctx.res)

  const reqProxy = new Proxy({}, {
    get: function (obj, prop) {
      console.log('GET PROPERTY', prop)
      return pass[prop] || ctx.res[prop]
    }
  })

  proxy.web(ctx.req, reqProxy, {
    target: 'http://localhost:8000'
  })

  ctx.status = 200
  return new Promise(resolve => {
    ctx.res.on('end', resolve)
  })
})

nms.run()

app
  .use(monetizer.koa())
  .use(router.routes())
  .use(router.allowedMethods())
  .use(serve(path.resolve(__dirname, 'static')))
  .listen(8080)
