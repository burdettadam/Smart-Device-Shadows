var _ = require('lodash')
var test = require('ava')
var http = require('http')
var khttp = require('../../src/modules/http')().def
var ktypes = require('krl-stdlib/types')
var testErr = require('../helpers/testErr')

test('http module', async function (t) {
  var server = http.createServer(function (req, res) {
    var body = ''
    req.on('data', function (buffer) {
      body += buffer.toString()
    })
    req.on('end', function () {
      var out
      if (req.url === '/not-json-resp') {
        out = 'this is not json'
        res.writeHead(200, {
          'Content-Length': Buffer.byteLength(out)
        })
        res.end(out)
        return
      }
      out = JSON.stringify({
        url: req.url,
        headers: req.headers,
        body: body
      }, false, 2)
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(out),
        'da-extra-header': 'wat?'
      })
      res.end(out)
    })
  })
  server.unref()
  await new Promise(function (resolve) {
    server.listen(0, resolve)
  })
  var url = 'http://localhost:' + server.address().port
  var terr = testErr(t, khttp)

  var resp

  var doHttp = async function (method, args) {
    var resp = await khttp[method]({}, args)
    if (ktypes.isAction(khttp[method])) {
      resp = resp[0]
    }
    t.truthy(_.isNumber(resp.content_length))
    t.truthy(!_.isNaN(resp.content_length))
    delete resp.content_length// windows can return off by 1 so it breaks tests
    delete resp.headers['content-length']// windows can return off by 1 so it breaks tests
    delete resp.headers['date']
    return resp
  }

  resp = await doHttp('get', [url, { a: 1 }])
  resp.content = JSON.parse(resp.content)
  t.deepEqual(resp, {
    content: {
      'url': '/?a=1',
      'headers': {
        'host': 'localhost:' + server.address().port,
        'connection': 'close'
      },
      body: ''
    },
    content_type: 'application/json',
    status_code: 200,
    status_line: 'OK',
    headers: {
      'content-type': 'application/json',
      'connection': 'close',
      'da-extra-header': 'wat?'
    }
  })

  // raw post body
  resp = await doHttp('post', {
    url: url,
    qs: { 'baz': 'qux' },
    headers: { 'some': 'header' },
    body: 'some post data',
    json: { 'json': "get's overriden by raw body" },
    form: { 'form': "get's overriden by raw body" },
    auth: {
      username: 'bob',
      password: 'nopass'
    }
  })
  resp.content = JSON.parse(resp.content)
  t.deepEqual(resp, {
    content: {
      'url': '/?baz=qux',
      'headers': {
        'some': 'header',
        'host': 'localhost:' + server.address().port,
        authorization: 'Basic Ym9iOm5vcGFzcw==',
        'content-length': '14',
        'connection': 'close'
      },
      body: 'some post data'
    },
    content_type: 'application/json',
    status_code: 200,
    status_line: 'OK',
    headers: {
      'content-type': 'application/json',
      'connection': 'close',
      'da-extra-header': 'wat?'
    }
  })

  // form body
  resp = await doHttp('post', {
    url: url,
    qs: { 'baz': 'qux' },
    headers: { 'some': 'header' },
    form: { formkey: 'formval', foo: ['bar', 'baz'] }
  })
  resp.content = JSON.parse(resp.content)
  t.deepEqual(resp, {
    content: {
      'url': '/?baz=qux',
      'headers': {
        'some': 'header',
        'host': 'localhost:' + server.address().port,
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': '45',
        'connection': 'close'
      },
      body: 'formkey=formval&foo%5B0%5D=bar&foo%5B1%5D=baz'
    },
    content_type: 'application/json',
    status_code: 200,
    status_line: 'OK',
    headers: {
      'content-type': 'application/json',
      'connection': 'close',
      'da-extra-header': 'wat?'
    }
  })

  // json body
  resp = await doHttp('post', {
    url: url,
    qs: { 'baz': 'qux' },
    headers: { 'some': 'header' },
    json: { formkey: 'formval', foo: ['bar', 'baz'] }
  })
  resp.content = JSON.parse(resp.content)
  t.deepEqual(resp, {
    content: {
      'url': '/?baz=qux',
      'headers': {
        'some': 'header',
        'host': 'localhost:' + server.address().port,
        'content-type': 'application/json',
        'content-length': '41',
        'connection': 'close'
      },
      body: '{"formkey":"formval","foo":["bar","baz"]}'
    },
    content_type: 'application/json',
    status_code: 200,
    status_line: 'OK',
    headers: {
      'content-type': 'application/json',
      'connection': 'close',
      'da-extra-header': 'wat?'
    }
  })

  // parseJSON
  resp = await doHttp('post', {
    url: url,
    parseJSON: true
  })
  t.deepEqual(resp, {
    content: {
      'url': '/',
      'headers': {
        'host': 'localhost:' + server.address().port,
        'content-length': '0',
        'connection': 'close'
      },
      body: ''
    },
    content_type: 'application/json',
    status_code: 200,
    status_line: 'OK',
    headers: {
      'content-type': 'application/json',
      'connection': 'close',
      'da-extra-header': 'wat?'
    }
  })

  // parseJSON when not actually a json response
  resp = await doHttp('post', {
    url: url + '/not-json-resp',
    parseJSON: true
  })
  t.deepEqual(resp, {
    content: 'this is not json',
    content_type: void 0,
    status_code: 200,
    status_line: 'OK',
    headers: {
      'connection': 'close'
    }
  })

  var methods = _.keys(khttp)
  var numMethods = _.size(methods)
  var errArg = { parseJSON: true }
  var typeErrArg = { url: NaN }

  var i
  for (i = 0; i < numMethods; i++) {
    var msgSubstring = 'Error: http:' + methods[i] + ' '
    await terr(methods[i], {}, errArg, msgSubstring + 'needs a url string')
    await terr(methods[i], {}, typeErrArg, 'Type' + msgSubstring + 'was given null instead of a url string')
  }
})
