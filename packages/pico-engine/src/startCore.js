var _ = require('lodash')
var fs = require('fs')
var path = require('path')
var async = require('async')
var fileUrl = require('file-url')
var leveldown = require('leveldown')
var krlStdlib = require('krl-stdlib')
var RulesetLoader = require('./RulesetLoader')
var PicoEngineCore = require('pico-engine-core')

var toKRLjson = function (val, indent) {
  var message = krlStdlib.encode({}, val, indent)
  if (message === '"[JSObject]"') {
    message = val + ''
  }
  return message
}

var setupRootPico = function (pe, callback) {
  pe.getRootECI(function (err, rootEci) {
    if (err) return callback(err)

    pe.runQuery({
      eci: rootEci,
      rid: 'io.picolabs.wrangler',
      name: 'myself'
    }, function (err, myself) {
      if (err) return callback(err)
      if (myself.eci === rootEci) {
        // already initialized
        return callback()
      }

      var signal = function (event) {
        return function (next) {
          pe.signalEvent(_.assign({ eci: rootEci }, event), next)
        }
      }

      async.series([
        signal({
          eid: '19',
          domain: 'wrangler',
          type: 'root_created',
          attrs: {
            eci: rootEci
          }
        }),
        signal({
          eid: '31',
          domain: 'visual',
          type: 'update',
          attrs: {
            dname: 'Root Pico',
            color: '#87cefa'
          }
        })
      ], callback)
    })
  })
}

var getSystemRulesets = function (callback) {
  var krlDir = path.resolve(__dirname, '../krl')
  fs.readdir(krlDir, function (err, files) {
    if (err) return callback(err)
    // .series b/c dependent modules must be registered in order
    async.map(files, function (filename, next) {
      var file = path.resolve(krlDir, filename)
      if (!/\.krl$/.test(file)) {
        // only auto-load krl files in the top level
        return next()
      }
      fs.readFile(file, 'utf8', function (err, src) {
        if (err) return next(err)
        next(null, {
          src: src,
          meta: { url: fileUrl(file, { resolve: false }) }
        })
      })
    }, function (err, systemRulesets) {
      callback(err, _.compact(systemRulesets))
    })
  })
}

var setupLogging = function (pe, bunyanLog) {
  var logs = {}
  var logRID = 'io.picolabs.logging'

  var krlLevelToBunyanLevel = function (level) {
    if (/error/.test(level)) {
      return 'error'
    } else if (/warn/.test(level)) {
      return 'warn'
    } else if (/debug/.test(level)) {
      return 'debug'
    }
    return 'info'
  }

  var logEntry = function (level, message, context) {
    context = context || {}// "error" events may be missiong context, log it as far as possible

    var episodeId = context.txn_id
    var timestamp = (new Date()).toISOString()

    if (!_.isString(message)) {
      if (_.isError(message)) {
        message = message + ''
      } else {
        message = toKRLjson(message)
      }
    }

    bunyanLog[krlLevelToBunyanLevel(level)]({ krl_level: level, context: context }, message)

    // decide if we want to add the event attributes to the log message
    if (context.event && _.isString(message) && (false ||
            message.startsWith('event received:') ||
            message.startsWith('adding raised event to schedule:')
    )) {
      message += ' attributes ' + toKRLjson(context.event.attrs)
    }

    // decide if we want to add the query arguments to the log message
    if (context.query &&
            context.query.args &&
            _.isString(message) &&
            message.startsWith('query received:')
    ) {
      message += ' arguments ' + toKRLjson(context.query.args)
    }

    var shellLog = ''
    shellLog += '[' + level.toUpperCase() + '] '
    shellLog += episodeId + ' | '
    shellLog += message
    if (shellLog.length > 300) {
      shellLog = shellLog.substring(0, 300) + '...'
    }
    if (/error/i.test(level)) {
      console.error(shellLog)// use stderr
    } else {
      console.log(shellLog)
    }

    var episode = logs[episodeId]
    if (episode) {
      episode.logs.push(timestamp + ' [' + level.toUpperCase() + '] ' + message)
    } else {
      console.error('[ERROR]', 'no episode found for', episodeId)
    }
  }

  pe.emitter.on('episode_start', function (expression, context) {
    var episodeId = context.txn_id

    var shellLog = '[EPISODE_START] ' + episodeId + ' '
    if (context.event) {
      shellLog += 'event' +
                '/' + context.event.eci +
                '/' + context.event.eid +
                '/' + context.event.domain +
                '/' + context.event.type
    } else if (context.query) {
      shellLog += 'query' +
                '/' + context.query.eci +
                '/' + context.query.rid +
                '/' + context.query.name
    } else {
      shellLog += toKRLjson(context)
    }
    console.log(shellLog)

    var timestamp = (new Date()).toISOString()
    var episode = logs[episodeId]
    if (episode) {
      console.error('[ERROR]', 'episode already exists for', episodeId)
    } else {
      episode = {}
      episode.key = (
        timestamp + ' - ' + episodeId +
                    ' - ' + context.eci +
                    ' - ' + ((context.event) ? context.event.eid : 'query')
      ).replace(/[.]/g, '-')
      episode.logs = []
      logs[episodeId] = episode
    }
  })

  var logEntriesForLevel = function (level) {
    pe.emitter.on(level, function (expression, context) {
      logEntry(level, expression, context)
    })
  }

  logEntriesForLevel('log-info')
  logEntriesForLevel('log-debug')
  logEntriesForLevel('log-warn')
  logEntriesForLevel('log-error')
  logEntriesForLevel('debug')
  logEntriesForLevel('error')

  pe.emitter.on('klog', function (info, context) {
    var msg = toKRLjson(info && info.val)
    if (_.has(info, 'message')) {
      msg = info.message + ' ' + msg
    }
    logEntry('klog', msg, context)
  })

  pe.emitter.on('episode_stop', function (expression, context) {
    var picoId = context.pico_id
    var episodeId = context.txn_id

    console.log('[EPISODE_STOP]', episodeId)

    var episode = logs[episodeId]
    if (!episode) {
      console.error('[ERROR]', 'no episode found for', episodeId)
      return
    }

    var onRemoved = function (err) {
      delete logs[episodeId]
      if (err) {
        console.error('[ERROR] failed to remove episode', episodeId, err + '')
      }
    }

    pe.getEntVar(picoId, logRID, 'status', null, function (err, isLogsOn) {
      if (err) return onRemoved(err)
      if (!isLogsOn) {
        onRemoved()
        return
      }
      pe.putEntVar(picoId, logRID, 'logs', episode.key, episode.logs, onRemoved)
    })
  })
}

module.exports = function (conf, callback) {
  var pe = PicoEngineCore({

    host: conf.host,

    compileAndLoadRuleset: RulesetLoader({
      rulesets_dir: path.resolve(conf.home, 'rulesets'),
      onWarning: function (rid, w) {
        if (conf.no_logging) {
          return
        }
        var l = w.loc && w.loc.start && w.loc.start.line
        var c = w.loc && w.loc.start && w.loc.start.column
        console.warn('[COMPILER-WARNING]', rid, w.message, l + ':' + c)
      }
    }),

    db: {
      db: leveldown(path.join(conf.home, 'db'))
    },

    modules: conf.modules || {},

    // RIDs that will be automatically installed on the root pico
    rootRIDs: [
      'io.picolabs.wrangler',
      'io.picolabs.subscription',
      'io.picolabs.visual_params'
    ]
  })

  if (conf.no_logging) {
    // no setupLogging
  } else {
    setupLogging(pe, conf.bunyanLog)
  }

  // system rulesets should be registered/updated first
  getSystemRulesets(function (err, systemRulesets) {
    if (err) return callback(err)

    pe.start(systemRulesets, function (err) {
      if (err) return callback(err)

      setupRootPico(pe, function (err) {
        if (err) return callback(err)
        callback(null, pe)
      })
    })
  })
}
