var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// server/streamProxy.mjs
var ALLOWED_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
var UPSTREAM_FETCH_TIMEOUT_MS = 2e4;
var DIGITALSUN_PROBE_TIMEOUT_MS = 8e3;
var DIGITALSUN_NESTED_SEGMENT_ATTEMPTS = 4;
var PROGRESSIVE_MEDIA_RE = /\.(mp4|m4s|webm|mkv|mov|m4v|ts)(\?|$)/i;
var FETCH_HEADERS = {
  Accept: "*/*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};
var LORDFLIX_CDN_HEADERS = {
  Referer: "https://lordflix.org/",
  Origin: "https://lordflix.org"
};
var LORDFLIX_CDN_HOST_MARKERS = [
  "lordflix",
  "snowhouse",
  "shegu.net",
  "nebulanovanature"
];
var LEG_CDN_HEADERS = {
  Referer: "https://hexa.su/",
  Origin: "https://hexa.su"
};
var LEG_CDN_HOST_MARKERS = [
  "tylerfisher55.workers.dev",
  "ironwallnet.com",
  "typhoontigertribe.net",
  "skywardslothnetwork.net",
  "workers.dev"
];
var VIDLINK_CDN_HEADERS = {
  Referer: "https://vidlink.pro/",
  Origin: "https://vidlink.pro"
};
var VIDLINK_CDN_HOST_MARKERS = [
  "vidlink",
  "costicritterbear",
  "watchiknow",
  "fingstmpserv",
  "vodvidl",
  "videosstr"
];
var VIDFAST_CDN_HEADERS = {
  Referer: "https://vidfast.vc/",
  Origin: "https://vidfast.vc"
};
var VIDFAST_CDN_HOST_MARKERS = [
  "vidfast.pro",
  "vidfast.vc",
  "quietridge.top",
  "quietridge",
  "grandpeak.top",
  "grandpeak"
];
var CDN_REFERER_PROFILES = [
  { id: "vidfast", Referer: "https://vidfast.vc/", Origin: "https://vidfast.vc" },
  { id: "vidfast-pro", Referer: "https://vidfast.pro/", Origin: "https://vidfast.pro" },
  { id: "movy", Referer: "https://www.movy.sx/", Origin: "https://www.movy.sx" },
  { id: "vixsrc", Referer: "https://vixsrc.to/", Origin: "https://vixsrc.to" },
  { id: "vidlink", Referer: "https://vidlink.pro/", Origin: "https://vidlink.pro" },
  { id: "videasy", Referer: "https://player.videasy.to/", Origin: "https://player.videasy.to" },
  { id: "lordflix", Referer: "https://lordflix.org/", Origin: "https://lordflix.org" },
  { id: "hexa", Referer: "https://hexa.su/", Origin: "https://hexa.su" },
  { id: "icefy", Referer: "https://streams.icefy.top/", Origin: "https://streams.icefy.top" },
  { id: "sportits", Referer: "https://media.sportits.com/", Origin: "https://media.sportits.com" }
];
var learnedRefererByHost = /* @__PURE__ */ new Map();
function isVidfastCdnUrl(target) {
  const host = String(target?.hostname || "").toLowerCase();
  if (VIDFAST_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) return true;
  return /^\/vd\//i.test(String(target?.pathname || ""));
}
__name(isVidfastCdnUrl, "isVidfastCdnUrl");
function rememberHostReferer(hostname, headers) {
  const host = String(hostname || "").toLowerCase();
  const referer = headers?.Referer;
  if (!host || !referer) return;
  learnedRefererByHost.set(host, {
    Referer: String(referer),
    ...headers.Origin ? { Origin: String(headers.Origin) } : {}
  });
}
__name(rememberHostReferer, "rememberHostReferer");
function refererKey(headers) {
  return `${headers?.Referer || ""}|${headers?.Origin || ""}`;
}
__name(refererKey, "refererKey");
function buildRefererAttempts(target, baseHeaders) {
  const attempts = [];
  const seen = /* @__PURE__ */ new Set();
  const push = /* @__PURE__ */ __name((referer, origin) => {
    const next = { ...baseHeaders };
    if (referer) {
      next.Referer = referer;
      if (origin) next.Origin = origin;
      else delete next.Origin;
    } else {
      delete next.Referer;
      delete next.Origin;
    }
    const key = refererKey(next);
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push(next);
  }, "push");
  if (baseHeaders.Referer) {
    push(baseHeaders.Referer, baseHeaders.Origin);
  }
  const learned = learnedRefererByHost.get(String(target.hostname || "").toLowerCase());
  if (learned?.Referer) push(learned.Referer, learned.Origin);
  for (const profile3 of CDN_REFERER_PROFILES) {
    push(profile3.Referer, profile3.Origin);
  }
  push(null, null);
  return attempts;
}
__name(buildRefererAttempts, "buildRefererAttempts");
function isBlockedUpstreamResponse(status, bodyHead, contentType = "") {
  if (status === 401 || status === 403 || status === 407) return true;
  if (status >= 200 && status < 300) {
    if (isProbablyHtml(bodyHead) && /forbidden|access denied|attention required|just a moment/i.test(bodyHead)) {
      return true;
    }
    if (/text\/html/i.test(contentType) && isProbablyHtml(bodyHead)) return true;
  }
  return false;
}
__name(isBlockedUpstreamResponse, "isBlockedUpstreamResponse");
async function fetchUpstreamAuto(url, baseHeaders, timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS) {
  let target;
  try {
    target = new URL(url);
  } catch {
    const upstream = await fetchUpstream(url, baseHeaders, timeoutMs);
    const bodyBuffer = Buffer.from(await upstream.arrayBuffer());
    return { upstream, bodyBuffer, headers: baseHeaders };
  }
  const attempts = buildRefererAttempts(target, baseHeaders);
  let last = null;
  for (const headers of attempts) {
    try {
      const upstream = await fetchUpstream(url, headers, timeoutMs);
      const bodyBuffer = Buffer.from(await upstream.arrayBuffer());
      const bodyHead = bodyBuffer.toString("utf8", 0, Math.min(bodyBuffer.length, 2048));
      const contentType = upstream.headers.get("content-type") || "";
      if (isBlockedUpstreamResponse(upstream.status, bodyHead, contentType)) {
        last = { upstream, bodyBuffer, headers };
        continue;
      }
      if (headers.Referer) rememberHostReferer(target.hostname, headers);
      return { upstream, bodyBuffer, headers };
    } catch (err) {
      last = last || { upstream: null, bodyBuffer: Buffer.alloc(0), headers, error: err };
    }
  }
  if (last?.upstream) return last;
  throw last?.error || new Error("Upstream fetch failed");
}
__name(fetchUpstreamAuto, "fetchUpstreamAuto");
async function fetchProgressiveAuto(target, baseHeaders) {
  const attempts = buildRefererAttempts(target, baseHeaders);
  let last = null;
  for (const headers of attempts) {
    try {
      const upstream = await fetch(target.toString(), {
        headers,
        redirect: "follow",
        signal: createFetchSignal()
      });
      if (upstream.status === 401 || upstream.status === 403 || upstream.status === 407) {
        await upstream.arrayBuffer().catch(() => void 0);
        last = { upstream, headers };
        continue;
      }
      const contentType = upstream.headers.get("content-type") || "";
      if (/text\/html/i.test(contentType) && upstream.status >= 400) {
        await upstream.arrayBuffer().catch(() => void 0);
        last = { upstream, headers };
        continue;
      }
      if (headers.Referer) rememberHostReferer(target.hostname, headers);
      return { upstream, headers };
    } catch (err) {
      last = last || { upstream: null, headers, error: err };
    }
  }
  if (last?.upstream) return last;
  throw last?.error || new Error("Upstream fetch failed");
}
__name(fetchProgressiveAuto, "fetchProgressiveAuto");
function refererHeadersForRewrite(headers) {
  if (!headers?.Referer) return null;
  return {
    Referer: headers.Referer,
    ...headers.Origin ? { Origin: headers.Origin } : {}
  };
}
__name(refererHeadersForRewrite, "refererHeadersForRewrite");
function attachRefererToDestination(destination, refererHeaders) {
  if (!refererHeaders?.Referer) return destination;
  try {
    const parsed = new URL(destination);
    if (parsed.searchParams.has("headers")) return destination;
    parsed.searchParams.set(
      "headers",
      JSON.stringify({
        referer: refererHeaders.Referer,
        ...refererHeaders.Origin ? { origin: refererHeaders.Origin } : {}
      })
    );
    return parsed.toString();
  } catch {
    return destination;
  }
}
__name(attachRefererToDestination, "attachRefererToDestination");
var ICIFY_CDN_HEADERS = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://streams.icefy.top/",
  Origin: "https://streams.icefy.top",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site"
};
var ICIFY_CDN_HOST_MARKERS = ["icefy.top", "streams.icefy.top", "aurorioncreative.site"];
var YTHD_CDN_HEADERS = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://ythd.org/",
  Origin: "https://ythd.org"
};
var YTHD_STREAM_CDN_HEADERS = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://cloudorchestranova.com/",
  Origin: "https://cloudorchestranova.com"
};
var YTHD_CDN_HOST_MARKERS = ["ythd.org", "cloudorchestranova.com", "cloudnestra.com", "vidsrc.sh"];
var YTHD_STREAM_CDN_HOST_MARKERS = [
  "penumbrapalimpsest.space",
  "palimpsest.space",
  "antilogarithm-atlas.site",
  "atlas.site"
];
var VIDEASY_CDN_HEADERS = {
  Accept: "*/*",
  Referer: "https://player.videasy.to/",
  Origin: "https://player.videasy.to"
};
var VIDEASY_CDN_HOST_MARKERS = [
  "itsdeskmate.com",
  "digitalsun.app",
  "videasy.to",
  "vidking.net",
  "api.videasy.to",
  "api2.videasy.to"
];
var VIXSRC_CDN_HEADERS = {
  Accept: "*/*",
  Referer: "https://vixsrc.to/",
  Origin: "https://vixsrc.to"
};
var VIXSRC_CDN_HOST_MARKERS = [
  "vixsrc.to",
  "vix-content.net",
  "vixcloud.co",
  "mistyreef"
];
function createFetchSignal(timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS) {
  return AbortSignal.timeout(timeoutMs);
}
__name(createFetchSignal, "createFetchSignal");
async function fetchUpstream(url, headers, timeoutMs = UPSTREAM_FETCH_TIMEOUT_MS) {
  return fetch(url, {
    headers,
    redirect: "follow",
    signal: createFetchSignal(timeoutMs)
  });
}
__name(fetchUpstream, "fetchUpstream");
function upstreamHeadersForUrl(target) {
  const headers = { ...FETCH_HEADERS };
  const host = target.hostname.toLowerCase();
  Object.assign(headers, embeddedHeadersForUrl(target));
  const learned = learnedRefererByHost.get(host);
  if (learned?.Referer) {
    Object.assign(headers, learned);
  }
  if (LORDFLIX_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, LORDFLIX_CDN_HEADERS);
  }
  if (LEG_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, LEG_CDN_HEADERS);
  }
  if (VIDLINK_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, VIDLINK_CDN_HEADERS);
  }
  if (isVidfastCdnUrl(target)) {
    Object.assign(headers, VIDFAST_CDN_HEADERS);
  }
  if (ICIFY_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, ICIFY_CDN_HEADERS);
  }
  if (YTHD_STREAM_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, YTHD_STREAM_CDN_HEADERS);
  } else if (YTHD_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, YTHD_CDN_HEADERS);
  }
  if (VIDEASY_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, VIDEASY_CDN_HEADERS);
  }
  if (VIXSRC_CDN_HOST_MARKERS.some((marker) => host.includes(marker))) {
    Object.assign(headers, VIXSRC_CDN_HEADERS);
  }
  if (host.includes("streamain.com")) {
    Object.assign(headers, {
      Accept: "video/mp4,video/*,*/*",
      Referer: "https://streamain.com/",
      Origin: "https://streamain.com"
    });
  }
  if (host.includes("sportits.com")) {
    Object.assign(headers, {
      Accept: "video/mp4,video/*,*/*",
      Referer: "https://media.sportits.com/",
      Origin: "https://media.sportits.com"
    });
  }
  return headers;
}
__name(upstreamHeadersForUrl, "upstreamHeadersForUrl");
function getProxyRewriteBase(options = {}) {
  if (options.proxyPublicBase?.trim()) {
    return options.proxyPublicBase.trim().replace(/\/$/, "");
  }
  return (options.proxyBasePath ?? "/api/stream-proxy").replace(/\/$/, "");
}
__name(getProxyRewriteBase, "getProxyRewriteBase");
function getClientRangeHeader(options = {}) {
  const headers = options.requestHeaders || {};
  return options.range || headers.range || headers.Range || "";
}
__name(getClientRangeHeader, "getClientRangeHeader");
function passThroughUpstreamHeader(upstream, name) {
  if (!upstream?.headers?.get) return void 0;
  return upstream.headers.get(name) || upstream.headers.get(name.toLowerCase());
}
__name(passThroughUpstreamHeader, "passThroughUpstreamHeader");
async function handleStreamProxyRequest(destination, options = {}) {
  const resolvedDestination = resolveStreamProxyDestination(destination, options.encodedDestination);
  if (!resolvedDestination?.trim()) {
    return proxyError(400, "Missing destination");
  }
  let target;
  try {
    target = new URL(resolvedDestination.trim());
    const unwrapped = unwrapEmbeddedStreamProxyUrl(target);
    if (unwrapped) target = new URL(unwrapped);
    target = normalizeDigitalsunStreamUrl(target);
  } catch {
    return proxyError(400, "Invalid destination URL");
  }
  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    return proxyError(400, "Only http(s) destinations are allowed");
  }
  try {
    const upstreamHeaders = upstreamHeadersForUrl(target);
    const clientRange = getClientRangeHeader(options);
    if (clientRange) {
      upstreamHeaders.Range = String(clientRange);
    }
    const playlistRewriteSourceUrl = target.toString();
    if (target.searchParams.has("headers")) {
      try {
        JSON.parse(target.searchParams.get("headers") || "{}");
        target.searchParams.delete("headers");
      } catch {
      }
    }
    if (isProgressiveMediaUrl(target)) {
      return proxyProgressiveMedia(target, upstreamHeaders);
    }
    const {
      upstream,
      bodyBuffer,
      headers: usedHeaders
    } = await fetchUpstreamAuto(target.toString(), upstreamHeaders);
    const contentType = passThroughUpstreamHeader(upstream, "content-type") || "application/octet-stream";
    const pathHaystack = `${target.pathname}${target.search}`.toLowerCase();
    const bodyHead = bodyBuffer.toString("utf8", 0, Math.min(bodyBuffer.length, 2048));
    const isPlaylist = bodyHead.includes("#EXTM3U") && !isProbablyHtml(bodyHead) && (contentType.toLowerCase().includes("mpegurl") || contentType.toLowerCase().includes("application/vnd.apple") || pathHaystack.includes(".m3u8") || pathHaystack.includes("/playlist/"));
    const proxyRewriteBase = getProxyRewriteBase(options);
    const rewriteReferer = refererHeadersForRewrite(usedHeaders);
    let body = bodyBuffer;
    if (isPlaylist) {
      body = rewriteM3u8Playlist(
        bodyBuffer.toString("utf8"),
        playlistRewriteSourceUrl,
        proxyRewriteBase,
        rewriteReferer
      );
    } else if (isDigitalsunHost(target.hostname) && isDigitalsunUrlListBuffer(bodyBuffer)) {
      body = await resolveDigitalsunUrlListSegment(bodyBuffer, usedHeaders);
    }
    const responseContentType = isPlaylist ? "application/vnd.apple.mpegurl" : normalizeMediaContentType(contentType, bodyBuffer);
    const isSuccess = upstream.status >= 200 && upstream.status < 400;
    const looksLikeHtml = isProbablyHtml(bodyHead);
    const cacheControl = !isSuccess || looksLikeHtml ? "no-store, no-cache, must-revalidate" : isPlaylist ? "no-store" : "private, max-age=3600, stale-while-revalidate=300";
    const responseHeaders = {
      "Content-Type": responseContentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": cacheControl
    };
    if (!isSuccess || looksLikeHtml) {
      responseHeaders.Pragma = "no-cache";
      responseHeaders.Expires = "0";
    }
    if (!isPlaylist && isSuccess && !looksLikeHtml) {
      const contentLength = passThroughUpstreamHeader(upstream, "content-length");
      const contentRange = passThroughUpstreamHeader(upstream, "content-range");
      const acceptRanges = passThroughUpstreamHeader(upstream, "accept-ranges");
      if (contentLength) responseHeaders["Content-Length"] = contentLength;
      if (contentRange) responseHeaders["Content-Range"] = contentRange;
      if (acceptRanges) {
        responseHeaders["Accept-Ranges"] = acceptRanges;
      } else if (upstream.status === 200 || upstream.status === 206) {
        responseHeaders["Accept-Ranges"] = "bytes";
      }
    }
    return {
      statusCode: upstream.status,
      headers: responseHeaders,
      body
    };
  } catch (err) {
    return proxyError(502, err?.message ?? "Stream proxy fetch failed");
  }
}
__name(handleStreamProxyRequest, "handleStreamProxyRequest");
function isProgressiveMediaUrl(target) {
  return PROGRESSIVE_MEDIA_RE.test(target.pathname);
}
__name(isProgressiveMediaUrl, "isProgressiveMediaUrl");
function progressiveMediaHeaders(upstream) {
  const contentType = passThroughUpstreamHeader(upstream, "content-type") || "video/mp4";
  const headers = {
    "Content-Type": /html|text\//i.test(contentType) ? "video/mp4" : contentType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "private, max-age=3600, stale-while-revalidate=300"
  };
  const contentLength = passThroughUpstreamHeader(upstream, "content-length");
  const contentRange = passThroughUpstreamHeader(upstream, "content-range");
  const acceptRanges = passThroughUpstreamHeader(upstream, "accept-ranges");
  if (contentLength) headers["Content-Length"] = contentLength;
  if (contentRange) headers["Content-Range"] = contentRange;
  if (acceptRanges) {
    headers["Accept-Ranges"] = acceptRanges;
  } else if (upstream.status === 200 || upstream.status === 206) {
    headers["Accept-Ranges"] = "bytes";
  }
  return headers;
}
__name(progressiveMediaHeaders, "progressiveMediaHeaders");
async function proxyProgressiveMedia(target, upstreamHeaders) {
  const { upstream, headers: usedHeaders } = await fetchProgressiveAuto(target, upstreamHeaders);
  const headers = progressiveMediaHeaders(upstream);
  if (upstream.status >= 400) {
    headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    headers.Pragma = "no-cache";
    headers.Expires = "0";
  }
  if (!upstream.body) {
    return {
      statusCode: upstream.status,
      headers,
      body: Buffer.from(await upstream.arrayBuffer())
    };
  }
  return {
    statusCode: upstream.status,
    headers,
    stream: upstream.body,
    // usedHeaders kept for debugging; unused by pipe
    _usedReferer: usedHeaders?.Referer
  };
}
__name(proxyProgressiveMedia, "proxyProgressiveMedia");
function proxyError(statusCode, message) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ error: message })
  };
}
__name(proxyError, "proxyError");
function embeddedHeadersForUrl(target) {
  const headersParam = target.searchParams.get("headers");
  if (!headersParam) return {};
  try {
    const parsed = JSON.parse(headersParam);
    const headers = {};
    for (const [key, value] of Object.entries(parsed)) {
      const normalizedKey = String(key).toLowerCase();
      if (normalizedKey === "referer" || normalizedKey === "referrer") {
        headers.Referer = String(value);
      } else if (normalizedKey === "origin") {
        headers.Origin = String(value);
      } else if (normalizedKey === "user-agent") {
        headers["User-Agent"] = String(value);
      }
    }
    return headers;
  } catch {
    return {};
  }
}
__name(embeddedHeadersForUrl, "embeddedHeadersForUrl");
function isProbablyHtml(text) {
  const lower = String(text || "").trimStart().slice(0, 2048).toLowerCase();
  return lower.startsWith("<!doctype html") || lower.startsWith("<html") || lower.includes("<title>attention required") || lower.includes("cloudflare ray id") || lower.includes("you have been blocked");
}
__name(isProbablyHtml, "isProbablyHtml");
function normalizeMediaContentType(contentType, bodyBuffer) {
  const lower = String(contentType || "").toLowerCase();
  if (isLikelyMpegTsSegment(bodyBuffer)) {
    return "video/mp2t";
  }
  if ((lower.includes("image/") || lower.includes("octet-stream") || lower.includes("text/html")) && isLikelyMp4Segment(bodyBuffer)) {
    return "video/mp4";
  }
  if (lower.includes("text/html") || lower.includes("text/plain")) {
    const head = Buffer.isBuffer(bodyBuffer) ? bodyBuffer.toString("utf8", 0, Math.min(bodyBuffer.length, 64)) : "";
    if (!isProbablyHtml(head)) {
      return "application/octet-stream";
    }
  }
  return contentType || "application/octet-stream";
}
__name(normalizeMediaContentType, "normalizeMediaContentType");
function isLikelyMpegTsSegment(bodyBuffer) {
  if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 188) return false;
  if (bodyBuffer[0] !== 71) return false;
  const packetOffsets = [188, 376, 564].filter((offset) => offset < bodyBuffer.length);
  return packetOffsets.length === 0 || packetOffsets.some((offset) => bodyBuffer[offset] === 71);
}
__name(isLikelyMpegTsSegment, "isLikelyMpegTsSegment");
function isLikelyMp4Segment(bodyBuffer) {
  if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 12) return false;
  const boxType = bodyBuffer.toString("ascii", 4, 8);
  return boxType === "ftyp" || boxType === "styp" || boxType === "moof";
}
__name(isLikelyMp4Segment, "isLikelyMp4Segment");
function resolveStreamProxyDestination(destination, encodedDestination) {
  if (destination?.trim()) return destination.trim();
  if (!encodedDestination?.trim()) return null;
  try {
    return Buffer.from(decodeURIComponent(encodedDestination.trim()), "base64").toString("utf8");
  } catch {
    return null;
  }
}
__name(resolveStreamProxyDestination, "resolveStreamProxyDestination");
function encodeProxyDestination(destination, proxyRewriteBase, refererHeaders = null) {
  const withReferer = attachRefererToDestination(destination, refererHeaders);
  return `${proxyRewriteBase}/${encodeURIComponent(
    Buffer.from(withReferer, "utf8").toString("base64")
  )}?sp=2`;
}
__name(encodeProxyDestination, "encodeProxyDestination");
function isDigitalsunHost(hostname) {
  return String(hostname || "").toLowerCase().includes("digitalsun.app");
}
__name(isDigitalsunHost, "isDigitalsunHost");
function normalizeDigitalsunStreamUrl(url) {
  try {
    const parsed = new URL(url.toString());
    if (!isDigitalsunHost(parsed.hostname)) return parsed;
    if (parsed.pathname === "/video.m3u8" && !parsed.searchParams.has("type")) {
      parsed.searchParams.set("type", "hls");
    }
    return parsed;
  } catch {
    return url;
  }
}
__name(normalizeDigitalsunStreamUrl, "normalizeDigitalsunStreamUrl");
function isDigitalsunUrlListBuffer(bodyBuffer) {
  if (!Buffer.isBuffer(bodyBuffer) || bodyBuffer.length < 64) return false;
  if (isLikelyMpegTsSegment(bodyBuffer) || isLikelyMp4Segment(bodyBuffer)) return false;
  const head = bodyBuffer.toString("utf8", 0, Math.min(bodyBuffer.length, 4096));
  if (head.includes("#EXTM3U") || isProbablyHtml(head)) return false;
  const lines = head.split(/\r?\n/).filter((line) => line.startsWith("https://"));
  return lines.length >= 2 && lines.every((line) => isDigitalsunHost(new URL(line).hostname));
}
__name(isDigitalsunUrlListBuffer, "isDigitalsunUrlListBuffer");
async function resolveDigitalsunUrlListSegment(bodyBuffer, upstreamHeaders) {
  const lines = bodyBuffer.toString("utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("https://") && isDigitalsunHost(new URL(line).hostname));
  const maxAttempts = Math.min(lines.length, DIGITALSUN_NESTED_SEGMENT_ATTEMPTS);
  for (let index = 0; index < maxAttempts; index += 1) {
    const candidate = lines[index];
    try {
      const nested = await fetchUpstream(
        candidate,
        upstreamHeaders,
        DIGITALSUN_PROBE_TIMEOUT_MS
      );
      if (!nested.ok) continue;
      const nestedBuffer = Buffer.from(await nested.arrayBuffer());
      if (isLikelyMpegTsSegment(nestedBuffer) || isLikelyMp4Segment(nestedBuffer)) {
        return nestedBuffer;
      }
    } catch {
    }
  }
  throw new Error("Digitalsun segment returned a URL list without a playable media chunk");
}
__name(resolveDigitalsunUrlListSegment, "resolveDigitalsunUrlListSegment");
async function probeDigitalsunSegment(segUrl, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIGITALSUN_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(segUrl, {
      headers: { ...headers, Range: "bytes=0-2047" },
      redirect: "follow",
      signal: controller.signal
    });
    if (!res.ok || !res.body) return false;
    const reader = res.body.getReader();
    const { value } = await reader.read();
    await reader.cancel().catch(() => void 0);
    if (!value?.length) return false;
    return value[0] === 71;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
__name(probeDigitalsunSegment, "probeDigitalsunSegment");
async function probeDigitalsunHlsPlayback(playlistUrl, mergedHeaders = {}) {
  try {
    let target = new URL(playlistUrl);
    target = normalizeDigitalsunStreamUrl(target);
    const headers = { ...upstreamHeadersForUrl(target), ...mergedHeaders };
    const playlistRes = await fetchUpstream(
      target.toString(),
      {
        ...headers,
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*"
      },
      DIGITALSUN_PROBE_TIMEOUT_MS
    );
    if (!playlistRes.ok) return false;
    const text = await playlistRes.text();
    if (!text.includes("#EXTM3U") || isProbablyHtml(text)) return false;
    const segUrl = text.split(/\r?\n/).map((line) => line.trim()).find((line) => line.startsWith("https://"));
    if (!segUrl) return false;
    return probeDigitalsunSegment(segUrl, headers);
  } catch {
    return false;
  }
}
__name(probeDigitalsunHlsPlayback, "probeDigitalsunHlsPlayback");
function resolvePlaylistUri(uri, playlistUrl) {
  if (!uri || uri.startsWith("data:") || uri.startsWith("skd:")) return uri;
  try {
    const resolved = new URL(uri, playlistUrl);
    const unwrapped = unwrapEmbeddedStreamProxyUrl(resolved);
    const destination = unwrapped || resolved.toString();
    const withHeaders = inheritEmbeddedHeaders(destination, playlistUrl);
    return withHeaders.toString();
  } catch {
    return uri;
  }
}
__name(resolvePlaylistUri, "resolvePlaylistUri");
function inheritEmbeddedHeaders(destination, playlistUrl) {
  try {
    const inheritedHeaders = new URL(playlistUrl).searchParams.get("headers");
    if (!inheritedHeaders) return destination;
    const parsed = new URL(destination);
    if (!parsed.searchParams.has("headers")) {
      parsed.searchParams.set("headers", inheritedHeaders);
    }
    return parsed.toString();
  } catch {
    return destination;
  }
}
__name(inheritEmbeddedHeaders, "inheritEmbeddedHeaders");
function unwrapEmbeddedStreamProxyUrl(url) {
  const marker = "/api/stream-proxy/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;
  const encodedDestination = url.pathname.slice(markerIndex + marker.length);
  if (!encodedDestination) return null;
  try {
    const destination = Buffer.from(decodeURIComponent(encodedDestination), "base64").toString("utf8");
    return /^https?:\/\//i.test(destination) ? destination : null;
  } catch {
    return null;
  }
}
__name(unwrapEmbeddedStreamProxyUrl, "unwrapEmbeddedStreamProxyUrl");
function rewriteUriAttributes(line, playlistUrl, proxyRewriteBase, refererHeaders = null) {
  return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
    const resolved = resolvePlaylistUri(uri, playlistUrl);
    if (resolved === uri && (uri.startsWith("data:") || uri.startsWith("skd:"))) {
      return `URI="${uri}"`;
    }
    return `URI="${encodeProxyDestination(resolved, proxyRewriteBase, refererHeaders)}"`;
  });
}
__name(rewriteUriAttributes, "rewriteUriAttributes");
function rewriteM3u8Playlist(text, playlistUrl, proxyRewriteBase, refererHeaders = null) {
  return text.replace(/\r/g, "").split("\n").map((rawLine) => {
    const line = rawLine.trim();
    if (!line) return rawLine;
    if (line.startsWith("#")) {
      return line.includes('URI="') ? rewriteUriAttributes(rawLine, playlistUrl, proxyRewriteBase, refererHeaders) : rawLine;
    }
    return encodeProxyDestination(
      resolvePlaylistUri(line, playlistUrl),
      proxyRewriteBase,
      refererHeaders
    );
  }).join("\n");
}
__name(rewriteM3u8Playlist, "rewriteM3u8Playlist");

// server/movyDecrypt.mjs
var MAGIC = [109, 118, 109, 49];
var TABLE = [
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580
];
function isEvenTriangle(n) {
  return (n * (n + 1) & 1) === 0;
}
__name(isEvenTriangle, "isEvenTriangle");
function mix(value) {
  let e = value >>> 0;
  e ^= e >>> 16;
  e = Math.imul(e, 2246822507) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 3266489909) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}
__name(mix, "mix");
function rotl(value, bits) {
  const e = value >>> 0;
  const a = bits & 31;
  return a === 0 ? e >>> 0 : (e << a | e >>> 32 - a) >>> 0;
}
__name(rotl, "rotl");
function fnv1a(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return mix(hash);
}
__name(fnv1a, "fnv1a");
function makeState(seed, mediaId) {
  const S = Array(61);
  let n = mix(fnv1a(seed) ^ mix(Number(mediaId) >>> 0 ^ 2654435769)) >>> 0;
  for (let i = 0; i < 8; i += 1) {
    if (isEvenTriangle(i)) {
      const slot = n % 61;
      n = rotl(n + 2654435769 >>> 0, 7 + (7 & i));
      S[slot] = (n ^ mix(n)) >>> 0;
      n = mix(n + slot >>> 0);
    } else {
      S[i] = TABLE[15 & i];
    }
  }
  return { S, acc: mix(2779096485 ^ n) >>> 0 };
}
__name(makeState, "makeState");
function nextWord(state, index) {
  const table3 = state.S;
  let acc = state.acc;
  const slot = acc % 61;
  const present = 0 - Number(slot in table3);
  const cell = table3[slot] >>> 0;
  const counter = Math.imul(2654435769, index + 1) >>> 0;
  const mixed = (cell ^ counter) >>> 0;
  let word = ((acc ^ mixed) >>> 0 | (acc & mixed & present) >>> 0) >>> 0;
  word = (rotl(word + acc >>> 0, 31 & slot) ^ rotl(acc, 31 & Math.imul(slot, 7))) >>> 0;
  acc = mix(word + 2654435769 >>> 0);
  table3[slot] = acc >>> 0;
  state.acc = acc;
  return acc >>> 0;
}
__name(nextWord, "nextWord");
function keystream(seed, mediaId, length) {
  const state = makeState(seed, mediaId);
  const out = new Uint8Array(length);
  let offset = 0;
  let wordIndex = 0;
  while (offset < length) {
    const word = nextWord(state, wordIndex);
    wordIndex += 1;
    out[offset++] = word & 255;
    if (offset < length) out[offset++] = word >>> 8 & 255;
    if (offset < length) out[offset++] = word >>> 16 & 255;
    if (offset < length) out[offset++] = word >>> 24 & 255;
  }
  return out;
}
__name(keystream, "keystream");
function decryptMovySources(ciphertext, seed, mediaId) {
  const padded = String(ciphertext || "").replace(/-/g, "+").replace(/_/g, "/").padEnd(4 * Math.ceil(String(ciphertext || "").length / 4), "=");
  const bytes = Uint8Array.from(Buffer.from(padded, "base64"));
  const stream = keystream(String(seed || ""), Number(mediaId), bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] ^= stream[i];
  }
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error("Movy decrypt failed: bad seed or tampered payload");
    }
  }
  return Buffer.from(bytes.subarray(MAGIC.length)).toString("utf8");
}
__name(decryptMovySources, "decryptMovySources");

// server/fingerResolve.mjs
var ENC_BASE = "https://enc-dec.app/api";
var VIDLINK_BASE = "https://vidlink.pro/api/b";
var VIDFAST_BASE = "https://vidfast.vc";
var VIDFAST_VERSION = "1";
var MOVY_STREAM_API = "https://api.wecollege.net";
var MOVY_ORIGIN = "https://www.movy.sx";
var LORDFLIX_SNOWHOUSE = "https://snowhouse.lordflix.club";
var LEG_FLIXER_EXTRACT = "https://media-proxy.vynx-3b3.workers.dev/flixer/extract-all";
var ICIFY_BASE = "https://streams.icefy.top";
var YTHD_BASE = "https://ythd.org";
var YTHD_STREAM_API = "https://data.vidsrc.sh/api.php";
var YTHD_PLAYER_ORIGIN = "https://cloudorchestranova.com";
var VIDEASY_BASE = "https://api.videasy.to";
var VIXSRC_BASE = "https://vixsrc.to";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
var VIDLINK_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": USER_AGENT,
  Connection: "keep-alive",
  Referer: "https://vidlink.pro/",
  Origin: "https://vidlink.pro"
};
var VIDFAST_HEADERS = {
  Accept: "*/*",
  "User-Agent": USER_AGENT,
  Referer: `${VIDFAST_BASE}/`,
  "X-Requested-With": "XMLHttpRequest"
};
var LORDFLIX_HEADERS = {
  Accept: "*/*",
  Origin: "https://lordflix.org",
  Referer: "https://lordflix.org/",
  "User-Agent": USER_AGENT
};
var ICIFY_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: ICIFY_BASE,
  Origin: ICIFY_BASE
};
var YTHD_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${YTHD_BASE}/`,
  Origin: YTHD_BASE
};
var YTHD_STREAM_API_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${YTHD_PLAYER_ORIGIN}/`,
  Origin: YTHD_PLAYER_ORIGIN
};
var YTHD_STREAM_CDN_HEADERS2 = {
  "User-Agent": USER_AGENT,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${YTHD_PLAYER_ORIGIN}/`,
  Origin: YTHD_PLAYER_ORIGIN
};
var YTHD_STREAM_CDN_HOST_MARKERS2 = [
  "penumbrapalimpsest.space",
  "palimpsest.space",
  "antilogarithm-atlas.site",
  "atlas.site"
];
var ythdWasmModuleCache = /* @__PURE__ */ new Map();
var VIDEASY_HEADERS = {
  Accept: "*/*",
  Origin: "https://player.videasy.to",
  Referer: "https://player.videasy.to/",
  "User-Agent": USER_AGENT
};
var VIXSRC_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${VIXSRC_BASE}/`,
  Origin: VIXSRC_BASE
};
var VIDEASY_PROVIDERS = {
  "videasy-neon": { server: "mb-flix", label: "Neon" },
  "videasy-yoru": { server: "cdn", label: "Yoru" },
  "videasy-cypher": { server: "downloader2", label: "Cypher" },
  "videasy-sage": { server: "1movies", label: "Sage" },
  "videasy-breach": { server: "m4uhd", label: "Breach" },
  "videasy-vyse": { server: "hdmovie", label: "Vyse", quality: "English" },
  "videasy-killjoy": {
    server: "meine",
    label: "Killjoy",
    language: "german"
  },
  "videasy-fade": { server: "hdmovie", label: "Fade", quality: "Hindi" },
  "videasy-omen": { server: "lamovie", label: "Omen" },
  "videasy-raze": { server: "superflix", label: "Raze" }
};
var LORDFLIX_FALLBACK_SERVERS = [
  "Berlin",
  "Backrooms",
  "Marseille",
  "Phoenix",
  "Oslo",
  "Luna"
];
var PROVIDER_LABELS = {
  fingerapi: "Finger",
  lordflix: "Toe",
  vidfast: "Vidfast",
  movy: "Movy",
  vixsrc: "VixSrc",
  leg: "Leg",
  icefy: "Eye",
  ythd: "YTHD",
  ...Object.fromEntries(
    Object.entries(VIDEASY_PROVIDERS).map(([providerId, provider]) => [
      providerId,
      provider.label
    ])
  )
};
function parseFingerPath(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  const match = normalized.match(/^(movie|tv)\/(\d+)(?:\/(\d+)\/(\d+))?$/);
  if (!match) {
    const err = new Error("Invalid Finger API path");
    err.statusCode = 400;
    throw err;
  }
  const [, mediaType, tmdbId, season, episode] = match;
  return { mediaType, tmdbId, season, episode };
}
__name(parseFingerPath, "parseFingerPath");
function assertPlayableStreams(streams) {
  if (Object.keys(streams).length === 0) {
    const err = new Error("Stream payload contained no playable URLs");
    err.statusCode = 404;
    throw err;
  }
}
__name(assertPlayableStreams, "assertPlayableStreams");
function isProbablyHtml2(text) {
  const trimmed = String(text || "").trimStart().slice(0, 2048).toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || trimmed.includes("<title>attention required") || trimmed.includes("cloudflare ray id") || trimmed.includes("you have been blocked");
}
__name(isProbablyHtml2, "isProbablyHtml");
function isPotentialPlayableUrl(url) {
  const value = String(url || "");
  if (/^https?:\/\/.+\.(m3u8|mp4)(\?|$)/i.test(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase().includes("vixsrc.to") && parsed.pathname.includes("/playlist/");
  } catch {
    return false;
  }
}
__name(isPotentialPlayableUrl, "isPotentialPlayableUrl");
async function readJsonResponse(res, name) {
  try {
    return await res.json();
  } catch {
    const err = new Error(`Invalid JSON from ${name}`);
    err.statusCode = 502;
    throw err;
  }
}
__name(readJsonResponse, "readJsonResponse");
function validateEncDecPayload(payload, name) {
  if (payload?.status && payload.status !== 200) {
    const err = new Error(payload.error || `${name} returned status ${payload.status}`);
    err.statusCode = payload.status === 404 ? 404 : 502;
    throw err;
  }
  if (!payload?.result) {
    const err = new Error(`${name} returned no result`);
    err.statusCode = 502;
    throw err;
  }
  return payload.result;
}
__name(validateEncDecPayload, "validateEncDecPayload");
function getTmdbApiKey(options = {}) {
  return options?.env?.TMDB_API_KEY || options?.env?.VITE_TMDB_API_KEY || (typeof process !== "undefined" ? process.env?.TMDB_API_KEY || process.env?.VITE_TMDB_API_KEY : "") || "";
}
__name(getTmdbApiKey, "getTmdbApiKey");
async function resolveImdbId(mediaType, tmdbId, provided) {
  const trimmed = String(provided || "").trim();
  if (trimmed) return trimmed;
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    const err = new Error("Toe requires an IMDB id (pass imdbId or configure TMDB_API_KEY)");
    err.statusCode = 400;
    throw err;
  }
  const detailPath = mediaType === "movie" ? "movie" : "tv";
  const detailRes = await fetch(
    `https://api.themoviedb.org/3/${detailPath}/${tmdbId}?api_key=${encodeURIComponent(apiKey)}`
  );
  if (!detailRes.ok) {
    const err = new Error(`TMDB lookup returned ${detailRes.status}`);
    err.statusCode = 502;
    throw err;
  }
  const detail = await readJsonResponse(detailRes, "TMDB");
  if (detail?.imdb_id) return detail.imdb_id;
  const externalRes = await fetch(
    `https://api.themoviedb.org/3/${detailPath}/${tmdbId}/external_ids?api_key=${encodeURIComponent(apiKey)}`
  );
  if (!externalRes.ok) {
    const err = new Error(`TMDB external ids returned ${externalRes.status}`);
    err.statusCode = 502;
    throw err;
  }
  const external = await readJsonResponse(externalRes, "TMDB external ids");
  const imdbId = external?.imdb_id;
  if (!imdbId) {
    const err = new Error("No IMDB id found for this title");
    err.statusCode = 404;
    throw err;
  }
  return imdbId;
}
__name(resolveImdbId, "resolveImdbId");
async function fetchLordflixServers() {
  try {
    const res = await fetch(`${LORDFLIX_SNOWHOUSE}/servers`, {
      headers: LORDFLIX_HEADERS
    });
    if (!res.ok) return LORDFLIX_FALLBACK_SERVERS;
    const payload = await readJsonResponse(res, "Toe servers");
    const names = Array.isArray(payload?.servers) ? payload.servers.filter((server) => server?.status === "ok" && server?.name).map((server) => server.name) : [];
    return names.length > 0 ? names : LORDFLIX_FALLBACK_SERVERS;
  } catch {
    return LORDFLIX_FALLBACK_SERVERS;
  }
}
__name(fetchLordflixServers, "fetchLordflixServers");
function qualityKey(quality) {
  const value = String(quality || "").trim();
  const match = value.match(/(\d{3,4})p?/i);
  return match?.[1] ?? (value || "hls");
}
__name(qualityKey, "qualityKey");
function normalizeKnownSources(result) {
  const streams = {};
  const sources = Array.isArray(result?.sources) ? result.sources : [];
  for (const source of sources) {
    const url = source?.url || source?.file || source?.playlist;
    if (!url || typeof url !== "string") continue;
    const key = qualityKey(source?.quality || source?.label || source?.name);
    if (!streams[key]) streams[key] = url;
  }
  if (sources.length === 1 && !streams.hls) {
    const only = sources[0]?.url || sources[0]?.file;
    if (only) streams.hls = only;
  }
  return streams;
}
__name(normalizeKnownSources, "normalizeKnownSources");
function collectPlayableUrls(value, found = []) {
  if (!value) return found;
  if (typeof value === "string") {
    if (isPotentialPlayableUrl(value)) {
      found.push(value);
    }
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectPlayableUrls(item, found));
    return found;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectPlayableUrls(item, found));
  }
  return found;
}
__name(collectPlayableUrls, "collectPlayableUrls");
async function decryptVidfastText(text) {
  const res = await fetch(`${ENC_BASE}/dec-vidfast`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, version: VIDFAST_VERSION })
  });
  if (!res.ok) {
    const err = new Error(`Vidfast decrypt returned ${res.status}`);
    err.statusCode = 502;
    throw err;
  }
  return validateEncDecPayload(await readJsonResponse(res, "Vidfast decrypt"), "Vidfast decrypt");
}
__name(decryptVidfastText, "decryptVidfastText");
async function verifyHlsManifest(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
        "User-Agent": USER_AGENT,
        ...headers
      },
      redirect: "follow"
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes("#EXTM3U") && !isProbablyHtml2(text);
  } catch {
    return false;
  }
}
__name(verifyHlsManifest, "verifyHlsManifest");
function headersFromStreamUrl(url) {
  try {
    const parsed = new URL(url);
    const headersParam = parsed.searchParams.get("headers");
    if (!headersParam) return {};
    const embedded = JSON.parse(headersParam);
    const headers = {};
    const referer = embedded.referer || embedded.referrer;
    if (referer) headers.Referer = String(referer);
    if (embedded.origin) headers.Origin = String(embedded.origin);
    if (embedded["user-agent"]) headers["User-Agent"] = String(embedded["user-agent"]);
    return headers;
  } catch {
    return {};
  }
}
__name(headersFromStreamUrl, "headersFromStreamUrl");
async function filterYoruPlayableStreams(streams) {
  const entries = Object.entries(streams).filter(([, url]) => /\.m3u8(\?|$)/i.test(url));
  if (entries.length <= 1) return streams;
  const results = await Promise.all(
    entries.map(async ([key, url]) => {
      const merged = { ...headersFromStreamUrl(url), ...VIDEASY_HEADERS };
      const playable = await probeDigitalsunHlsPlayback(url, merged);
      return playable ? key : null;
    })
  );
  const filtered = {};
  for (let index = 0; index < entries.length; index += 1) {
    if (results[index]) {
      filtered[entries[index][0]] = entries[index][1];
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : streams;
}
__name(filterYoruPlayableStreams, "filterYoruPlayableStreams");
async function filterReachableStreams(streams, headers = {}) {
  const reachable = {};
  for (const [key, url] of Object.entries(streams)) {
    if (!isPotentialPlayableUrl(url)) continue;
    if (/\.m3u8(\?|$)/i.test(url)) {
      const merged = { ...headersFromStreamUrl(url), ...headers };
      if (await verifyHlsManifest(url, merged)) {
        reachable[key] = url;
      }
      continue;
    }
    reachable[key] = url;
  }
  return reachable;
}
__name(filterReachableStreams, "filterReachableStreams");
function normalizeProviderStreams(result) {
  const streams = normalizeKnownSources(result);
  if (Array.isArray(result?.stream)) {
    for (const entry of result.stream) {
      const playlist = entry?.playlist;
      if (!playlist || typeof playlist !== "string") continue;
      if (!streams.hls || entry?.id === "primary") {
        streams.hls = playlist;
      } else if (entry?.id && !streams[entry.id]) {
        streams[entry.id] = playlist;
      }
    }
  }
  const directUrl = result?.url || result?.file || result?.playlist;
  if (directUrl && typeof directUrl === "string" && !streams.hls) {
    streams.hls = directUrl;
  }
  for (const url of collectPlayableUrls(result)) {
    if (!streams.hls && /\.m3u8(\?|$)/i.test(url)) {
      streams.hls = url;
      continue;
    }
    const alreadyListed = Object.values(streams).includes(url);
    if (!alreadyListed && !streams.unknown) {
      streams.unknown = url;
    }
  }
  return streams;
}
__name(normalizeProviderStreams, "normalizeProviderStreams");
function normalizeVideasyStreams(result, provider) {
  const qualityFilter = String(provider?.quality || "").toLowerCase();
  if (!qualityFilter) return normalizeProviderStreams(result);
  const sources = Array.isArray(result?.sources) ? result.sources.filter(
    (source) => String(source?.quality || source?.label || source?.name || "").toLowerCase().includes(qualityFilter)
  ) : [];
  return normalizeKnownSources({ sources });
}
__name(normalizeVideasyStreams, "normalizeVideasyStreams");
function encodeVideasyTitle(title2) {
  return encodeURIComponent(String(title2 || "").trim());
}
__name(encodeVideasyTitle, "encodeVideasyTitle");
function addEmbeddedHeaders(url, headers) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(
      "headers",
      JSON.stringify({
        referer: headers.Referer,
        origin: headers.Origin,
        "user-agent": headers["User-Agent"]
      })
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
__name(addEmbeddedHeaders, "addEmbeddedHeaders");
function addEmbeddedHeadersToStreams(streams, headers) {
  return Object.fromEntries(
    Object.entries(streams).map(([key, url]) => [key, addEmbeddedHeaders(url, headers)])
  );
}
__name(addEmbeddedHeadersToStreams, "addEmbeddedHeadersToStreams");
function absoluteUrl(value, baseUrl) {
  const src = String(value || "").trim();
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return "";
  }
}
__name(absoluteUrl, "absoluteUrl");
function streamsFromUrls(urls) {
  const streams = {};
  for (const url of urls) {
    if (!isPotentialPlayableUrl(url)) continue;
    if (/\.m3u8(\?|$)/i.test(url) || /vixsrc\.to\/playlist\//i.test(url)) {
      if (!streams.hls) streams.hls = url;
      continue;
    }
    const key = qualityKey(url);
    if (!streams[key]) {
      streams[key] = url;
    } else if (!streams.unknown) {
      streams.unknown = url;
    }
  }
  return streams;
}
__name(streamsFromUrls, "streamsFromUrls");
function ythdCdnHeadersForUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (YTHD_STREAM_CDN_HOST_MARKERS2.some((marker) => host.includes(marker))) {
      return YTHD_STREAM_CDN_HEADERS2;
    }
  } catch {
  }
  return YTHD_HEADERS;
}
__name(ythdCdnHeadersForUrl, "ythdCdnHeadersForUrl");
function buildYthdStreamApiUrl(mediaType, tmdbId, season, episode) {
  const type = mediaType === "tv" ? "tv" : "movie";
  let url = `${YTHD_STREAM_API}?type=${encodeURIComponent(type)}&tmdb=${encodeURIComponent(tmdbId)}`;
  if (mediaType === "tv") {
    url += `&season=${encodeURIComponent(season)}&episode=${encodeURIComponent(episode)}`;
  }
  return `${url}&stream_urls`;
}
__name(buildYthdStreamApiUrl, "buildYthdStreamApiUrl");
function parseYthdTokenPayload(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      if (typeof json === "string") return json;
      if (json && typeof json === "object") {
        return String(json.token || json.data || json.string || json.result || "");
      }
    } catch {
    }
  }
  return trimmed;
}
__name(parseYthdTokenPayload, "parseYthdTokenPayload");
function applyYthdStreamToken(url, token) {
  if (!token) return url;
  if (url.includes("__TOKEN__")) return url.split("__TOKEN__").join(token);
  return `${url}${url.includes("?") ? "&" : "?"}token=${token}`;
}
__name(applyYthdStreamToken, "applyYthdStreamToken");
async function loadYthdWasmModule(windowId, wasmUrl) {
  const cacheKey = windowId == null ? `url:${wasmUrl}` : `w:${windowId}`;
  const cached = ythdWasmModuleCache.get(cacheKey);
  if (cached) return cached;
  const pending = (async () => {
    const res = await fetch(wasmUrl, {
      headers: YTHD_STREAM_API_HEADERS,
      credentials: "omit"
    });
    if (!res.ok) {
      const err = new Error(`YTHD wasm returned ${res.status}`);
      err.statusCode = 502;
      throw err;
    }
    return WebAssembly.compile(await res.arrayBuffer());
  })();
  ythdWasmModuleCache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (err) {
    ythdWasmModuleCache.delete(cacheKey);
    throw err;
  }
}
__name(loadYthdWasmModule, "loadYthdWasmModule");
async function decryptYthdStreamUrls(encryptedB64, vsMeta) {
  if (!encryptedB64 || !vsMeta?.wasm_url) {
    const err = new Error("YTHD stream payload missing decryptor");
    err.statusCode = 502;
    throw err;
  }
  const mod = await loadYthdWasmModule(vsMeta.w, vsMeta.wasm_url);
  const instance = await WebAssembly.instantiate(mod, {});
  const exports = instance.exports;
  if (typeof exports.alloc !== "function" || typeof exports.decrypt !== "function" || !exports.memory) {
    const err = new Error("YTHD decryptor exports are incomplete");
    err.statusCode = 502;
    throw err;
  }
  const encrypted = typeof Buffer !== "undefined" ? Buffer.from(String(encryptedB64), "base64") : Uint8Array.from(atob(String(encryptedB64)), (c) => c.charCodeAt(0));
  const ptr = exports.alloc(encrypted.length);
  new Uint8Array(exports.memory.buffer, ptr, encrypted.length).set(encrypted);
  const outLen = exports.decrypt(ptr, encrypted.length);
  const decoded = new TextDecoder().decode(
    new Uint8Array(exports.memory.buffer, ptr + 12, outLen)
  );
  return decoded.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^https?:\/\//i.test(line));
}
__name(decryptYthdStreamUrls, "decryptYthdStreamUrls");
async function fetchYthdHostToken(streamUrl) {
  let origin = "";
  try {
    origin = new URL(streamUrl).origin;
  } catch {
    return "";
  }
  if (!origin) return "";
  try {
    const res = await fetch(`${origin}/generate.php`, {
      headers: {
        ...YTHD_STREAM_CDN_HEADERS2,
        Accept: "*/*"
      },
      credentials: "omit"
    });
    if (!res.ok) return "";
    return parseYthdTokenPayload(await res.text());
  } catch {
    return "";
  }
}
__name(fetchYthdHostToken, "fetchYthdHostToken");
async function resolveVidlinkStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const encRes = await fetch(`${ENC_BASE}/enc-vidlink?text=${encodeURIComponent(tmdbId)}`);
  if (!encRes.ok) {
    const err = new Error(`Encrypt service returned ${encRes.status}`);
    err.statusCode = 502;
    throw err;
  }
  const encData = await readJsonResponse(encRes, "encrypt service");
  if (!encData?.result) {
    const err = new Error("Failed to encrypt TMDB id");
    err.statusCode = 502;
    throw err;
  }
  const vidlinkUrl = mediaType === "movie" ? `${VIDLINK_BASE}/movie/${encData.result}` : `${VIDLINK_BASE}/tv/${encData.result}/${season}/${episode}`;
  const vidRes = await fetch(vidlinkUrl, { headers: VIDLINK_HEADERS });
  if (!vidRes.ok) {
    const err = new Error(`VidLink API returned ${vidRes.status}`);
    err.statusCode = vidRes.status === 404 ? 404 : 502;
    throw err;
  }
  const payload = await readJsonResponse(vidRes, "VidLink API");
  const stream = payload?.stream;
  if (!stream) {
    const err = new Error("No stream returned for this title");
    err.statusCode = 404;
    throw err;
  }
  const streams = {};
  if (stream.type === "hls" && stream.playlist) {
    streams.hls = stream.playlist;
  } else if (stream.qualities && typeof stream.qualities === "object") {
    for (const [quality, file] of Object.entries(stream.qualities)) {
      if (file?.url) streams[quality] = file.url;
    }
  } else if (stream.playlist) {
    streams.hls = stream.playlist;
  }
  const reachable = await filterReachableStreams(streams, VIDLINK_HEADERS);
  if (Object.keys(reachable).length === 0) {
    try {
      const fallback = await resolveVidfastStream(path);
      return {
        ...fallback,
        source: "fingerapi",
        sourceId: `${PROVIDER_LABELS.fingerapi} (Vidfast fallback)`
      };
    } catch {
      const err = new Error("VidLink stream blocked or unreachable");
      err.statusCode = 502;
      throw err;
    }
  }
  assertPlayableStreams(reachable);
  return {
    source: "fingerapi",
    sourceId: PROVIDER_LABELS.fingerapi,
    streams: reachable
  };
}
__name(resolveVidlinkStream, "resolveVidlinkStream");
function isVidfastHost(hostname) {
  return String(hostname || "").toLowerCase().includes("vidfast.");
}
__name(isVidfastHost, "isVidfastHost");
async function resolveVidfastPage(pageUrl, meta = {}) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    const err2 = new Error("Invalid Vidfast URL");
    err2.statusCode = 400;
    throw err2;
  }
  const origin = parsed.origin;
  const pageRes = await fetch(parsed.toString(), {
    headers: {
      Accept: "text/html,*/*",
      "User-Agent": USER_AGENT,
      Referer: `${origin}/`
    }
  });
  if (!pageRes.ok) {
    const err2 = new Error(`Vidfast page returned ${pageRes.status}`);
    err2.statusCode = pageRes.status === 404 ? 404 : 502;
    throw err2;
  }
  const pageText = await pageRes.text();
  const textMatch = pageText.match(/\\"en\\":\\"(.*?)\\"/) ?? pageText.match(/"en":"([^"]+)"/);
  const text = textMatch?.[1];
  if (!text) {
    const err2 = new Error("Vidfast page did not contain encrypted stream data");
    err2.statusCode = 502;
    throw err2;
  }
  const encRes = await fetch(
    `${ENC_BASE}/enc-vidfast?text=${encodeURIComponent(text)}&version=${encodeURIComponent(VIDFAST_VERSION)}`
  );
  if (!encRes.ok) {
    const err2 = new Error(`Vidfast encrypt returned ${encRes.status}`);
    err2.statusCode = 502;
    throw err2;
  }
  const parts = validateEncDecPayload(await readJsonResponse(encRes, "Vidfast encrypt"), "Vidfast encrypt");
  if (!parts?.servers || !parts?.stream || !parts?.token) {
    const err2 = new Error("Vidfast encrypt returned incomplete stream parts");
    err2.statusCode = 502;
    throw err2;
  }
  const vidfastHeaders = {
    ...VIDFAST_HEADERS,
    Referer: `${origin}/`,
    "X-CSRF-Token": parts.token
  };
  const serversRes = await fetch(parts.servers, {
    method: "POST",
    headers: vidfastHeaders
  });
  if (!serversRes.ok) {
    const err2 = new Error(`Vidfast servers returned ${serversRes.status}`);
    err2.statusCode = 502;
    throw err2;
  }
  const servers = await decryptVidfastText(await serversRes.text());
  const candidates = Array.isArray(servers) ? servers : [];
  if (candidates.length === 0) {
    const err2 = new Error("Vidfast returned no servers");
    err2.statusCode = 404;
    throw err2;
  }
  const source = meta.source || "vidfast";
  const sourceIdPrefix = meta.sourceIdPrefix || PROVIDER_LABELS.vidfast;
  let lastError;
  for (const server of candidates) {
    const data = server?.data;
    if (!data || typeof data !== "string") continue;
    try {
      const streamRes = await fetch(`${parts.stream}/${data}`, {
        method: "POST",
        headers: vidfastHeaders
      });
      if (!streamRes.ok) {
        throw new Error(`Vidfast stream (${server?.name || "server"}) returned ${streamRes.status}`);
      }
      const decoded = await decryptVidfastText(await streamRes.text());
      const streams = await filterReachableStreams(
        normalizeProviderStreams(decoded),
        vidfastHeaders
      );
      assertPlayableStreams(streams);
      return {
        source,
        sourceId: `${sourceIdPrefix} (${server?.name || "Vidfast"})`,
        streams
      };
    } catch (err2) {
      lastError = err2;
    }
  }
  const err = new Error(lastError?.message || "Vidfast returned no playable stream");
  err.statusCode = lastError?.statusCode ?? 502;
  throw err;
}
__name(resolveVidfastPage, "resolveVidfastPage");
async function resolveVidfastStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const pageUrl = mediaType === "movie" ? `${VIDFAST_BASE}/movie/${tmdbId}/` : `${VIDFAST_BASE}/tv/${tmdbId}/${season}/${episode}/`;
  return resolveVidfastPage(pageUrl, {
    source: "vidfast",
    sourceIdPrefix: PROVIDER_LABELS.vidfast
  });
}
__name(resolveVidfastStream, "resolveVidfastStream");
async function resolveVidfastExtract(pageUrl) {
  return resolveVidfastPage(pageUrl, {
    source: "vidfast",
    sourceIdPrefix: PROVIDER_LABELS.vidfast
  });
}
__name(resolveVidfastExtract, "resolveVidfastExtract");
var MOVY_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": USER_AGENT,
  Referer: `${MOVY_ORIGIN}/`,
  Origin: MOVY_ORIGIN
};
async function fetchMovySeed(mediaId) {
  const res = await fetch(`${MOVY_STREAM_API}/seed?mediaId=${encodeURIComponent(mediaId)}`, {
    headers: MOVY_HEADERS
  });
  if (!res.ok) {
    const err = new Error(`Movy seed returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }
  const payload = await readJsonResponse(res, "Movy seed");
  const seed = payload?.seed;
  if (!seed) {
    const err = new Error("Movy seed missing");
    err.statusCode = 502;
    throw err;
  }
  return String(seed);
}
__name(fetchMovySeed, "fetchMovySeed");
function normalizeMovyStreams(decoded) {
  const streams = {};
  const sources = Array.isArray(decoded?.sources) ? decoded.sources : [];
  for (const source of sources) {
    const url = source?.url;
    if (!url || typeof url !== "string") continue;
    const key = qualityKey(source?.quality || source?.label || "hls");
    if (!streams[key]) streams[key] = url;
    if (/\.m3u8(\?|$)/i.test(url) && !streams.hls) streams.hls = url;
  }
  return streams;
}
__name(normalizeMovyStreams, "normalizeMovyStreams");
async function resolveMovyStream(path, options = {}) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const title2 = String(options.title || "").trim();
  const year = String(options.year || "").trim();
  if (!title2 || !year) {
    const err = new Error("Movy requires title and release year");
    err.statusCode = 400;
    throw err;
  }
  let imdbId = "";
  try {
    imdbId = await resolveImdbId(mediaType, tmdbId, options.imdbId);
  } catch {
    imdbId = String(options.imdbId || "").trim();
  }
  const seed = await fetchMovySeed(tmdbId);
  const params = new URLSearchParams({
    title: title2,
    mediaType: mediaType === "tv" ? "tv" : "movie",
    year,
    episodeId: mediaType === "tv" ? String(episode || 1) : "1",
    seasonId: mediaType === "tv" ? String(season || 1) : "1",
    tmdbId: String(tmdbId),
    enc: "2",
    seed
  });
  if (imdbId) params.set("imdbId", imdbId);
  const sourcesRes = await fetch(`${MOVY_STREAM_API}/miami/sources?${params.toString()}`, {
    headers: MOVY_HEADERS
  });
  if (!sourcesRes.ok) {
    const err = new Error(`Movy sources returned ${sourcesRes.status}`);
    err.statusCode = sourcesRes.status === 404 ? 404 : 502;
    throw err;
  }
  const ciphertext = await sourcesRes.text();
  let decoded;
  try {
    decoded = JSON.parse(decryptMovySources(ciphertext, seed, tmdbId));
  } catch (err) {
    const fail = new Error(err?.message || "Movy decrypt failed");
    fail.statusCode = 502;
    throw fail;
  }
  const streams = await filterReachableStreams(normalizeMovyStreams(decoded), {
    ...MOVY_HEADERS,
    Referer: "https://vidfast.vc/",
    Origin: "https://vidfast.vc"
  });
  assertPlayableStreams(streams);
  return {
    source: "movy",
    sourceId: PROVIDER_LABELS.movy,
    streams
  };
}
__name(resolveMovyStream, "resolveMovyStream");
async function resolveLordflixStream(path, options = {}) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const title2 = String(options.title || "").trim();
  const year = String(options.year || "").trim();
  if (!title2 || !year) {
    const err2 = new Error("Toe requires title and release year");
    err2.statusCode = 400;
    throw err2;
  }
  const imdbId = await resolveImdbId(mediaType, tmdbId, options.imdbId);
  const servers = await fetchLordflixServers();
  let lastError;
  for (const server of servers) {
    try {
      const sourceUrl = new URL(`${LORDFLIX_SNOWHOUSE}/`);
      sourceUrl.searchParams.set("title", title2);
      sourceUrl.searchParams.set("type", mediaType === "tv" ? "series" : "movie");
      sourceUrl.searchParams.set("year", year);
      sourceUrl.searchParams.set("imdb", imdbId);
      sourceUrl.searchParams.set("tmdb", tmdbId);
      sourceUrl.searchParams.set("server", server);
      if (mediaType === "tv") {
        sourceUrl.searchParams.set("season", season);
        sourceUrl.searchParams.set("episode", episode);
      }
      const encRes = await fetch(
        `${ENC_BASE}/enc-lordflix?url=${encodeURIComponent(sourceUrl.toString())}`
      );
      const encPayload = await readJsonResponse(encRes, "Toe encrypt");
      const encData = validateEncDecPayload(encPayload, "Toe encrypt");
      const encryptedRes = await fetch(encData.url, { headers: LORDFLIX_HEADERS });
      if (!encryptedRes.ok) {
        throw new Error(`Toe (${server}) returned ${encryptedRes.status}`);
      }
      const decRes = await fetch(`${ENC_BASE}/dec-lordflix`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: await encryptedRes.text(), sign: encData.sign })
      });
      if (!decRes.ok) {
        throw new Error(`Toe decrypt returned ${decRes.status}`);
      }
      const decoded = validateEncDecPayload(
        await readJsonResponse(decRes, "Toe decrypt"),
        "Toe decrypt"
      );
      const streams = await filterReachableStreams(normalizeProviderStreams(decoded), LORDFLIX_HEADERS);
      assertPlayableStreams(streams);
      return {
        source: "lordflix",
        sourceId: `${PROVIDER_LABELS.lordflix} (${server})`,
        streams
      };
    } catch (err2) {
      lastError = err2;
    }
  }
  const err = new Error(lastError?.message || "Toe returned no playable stream");
  err.statusCode = 502;
  throw err;
}
__name(resolveLordflixStream, "resolveLordflixStream");
async function resolveToeStream(path, options = {}) {
  try {
    const result = await resolveVidfastStream(path);
    return {
      ...result,
      source: "lordflix",
      sourceId: String(result.sourceId || "").replace(/^Vidfast\b/, PROVIDER_LABELS.lordflix)
    };
  } catch (vidfastError) {
    try {
      return await resolveLordflixStream(path, options);
    } catch (lordflixError) {
      const err = new Error(
        `Toe failed: ${vidfastError?.message || "Vidfast failed"}; fallback: ${lordflixError?.message || "Lordflix failed"}`
      );
      err.statusCode = lordflixError?.statusCode ?? vidfastError?.statusCode ?? 502;
      throw err;
    }
  }
}
__name(resolveToeStream, "resolveToeStream");
async function isLegPlaylistReachable(source) {
  const referer = String(source?.referer || "https://hexa.su/").trim() || "https://hexa.su/";
  const origin = referer.replace(/\/$/, "");
  try {
    const res = await fetch(source.url, {
      headers: {
        Accept: "*/*",
        "User-Agent": USER_AGENT,
        Referer: referer,
        Origin: origin
      },
      redirect: "follow"
    });
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes("#EXTM3U") && !isProbablyHtml2(text);
  } catch {
    return false;
  }
}
__name(isLegPlaylistReachable, "isLegPlaylistReachable");
async function resolveLegStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const url = new URL(LEG_FLIXER_EXTRACT);
  url.searchParams.set("tmdbId", tmdbId);
  url.searchParams.set("type", mediaType === "tv" ? "tv" : "movie");
  if (mediaType === "tv") {
    url.searchParams.set("season", season);
    url.searchParams.set("episode", episode);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });
  if (!res.ok) {
    const err2 = new Error(`Leg extract returned ${res.status}`);
    err2.statusCode = 502;
    throw err2;
  }
  const payload = await readJsonResponse(res, "Leg extract");
  if (!payload?.success) {
    const err2 = new Error(payload?.error || "Leg extract failed");
    err2.statusCode = 502;
    throw err2;
  }
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  const candidates = sources.filter(
    (source) => source?.status === "working" && source?.type === "hls" && typeof source?.url === "string" && /\.m3u8(\?|$)/i.test(source.url)
  );
  if (candidates.length === 0) {
    const err2 = new Error("Leg returned no playable HLS source");
    err2.statusCode = 404;
    throw err2;
  }
  let lastError;
  for (const source of candidates) {
    const label = source.title || source.server || PROVIDER_LABELS.leg;
    if (!await isLegPlaylistReachable(source)) {
      lastError = new Error(`Leg (${label}) manifest unreachable`);
      continue;
    }
    return {
      source: "leg",
      sourceId: label,
      streams: {
        hls: source.url
      }
    };
  }
  const err = new Error(lastError?.message || "Leg returned no reachable HLS source");
  err.statusCode = 502;
  throw err;
}
__name(resolveLegStream, "resolveLegStream");
async function resolveIcefyStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const apiPath = mediaType === "movie" ? `movie/${tmdbId}` : `tv/${tmdbId}/${season}/${episode}`;
  const res = await fetch(`${ICIFY_BASE}/${apiPath}`, {
    headers: ICIFY_HEADERS
  });
  if (!res.ok) {
    const err = new Error(`Icefy returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }
  const payload = await readJsonResponse(res, "Icefy");
  const streamUrl = payload?.stream;
  if (!streamUrl || typeof streamUrl !== "string") {
    const err = new Error("No stream URL returned from Icefy");
    err.statusCode = 404;
    throw err;
  }
  const streams = await filterReachableStreams({ hls: streamUrl }, ICIFY_HEADERS);
  assertPlayableStreams(streams);
  return {
    source: "icefy",
    sourceId: PROVIDER_LABELS.icefy,
    streams
  };
}
__name(resolveIcefyStream, "resolveIcefyStream");
async function resolveYthdStream(path, options = {}) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const pageUrl = mediaType === "movie" ? `${YTHD_BASE}/embed/${encodeURIComponent(tmdbId)}` : `${YTHD_BASE}/embed/tv?tmdb=${encodeURIComponent(tmdbId)}&season=${encodeURIComponent(
    season
  )}&episode=${encodeURIComponent(episode)}`;
  const apiUrl = buildYthdStreamApiUrl(mediaType, tmdbId, season, episode);
  let payload;
  try {
    const res = await fetch(apiUrl, {
      headers: YTHD_STREAM_API_HEADERS,
      credentials: "omit"
    });
    if (!res.ok) {
      const err2 = new Error(`YTHD stream API returned ${res.status}`);
      err2.statusCode = res.status === 404 ? 404 : 502;
      throw err2;
    }
    payload = await readJsonResponse(res, "YTHD stream API");
  } catch (err2) {
    return {
      source: "ythd",
      sourceId: `${PROVIDER_LABELS.ythd} (embed fallback)`,
      embedUrl: pageUrl,
      streams: {}
    };
  }
  const rawStreamUrls = payload?.data?.stream_urls;
  let candidates = [];
  if (Array.isArray(rawStreamUrls)) {
    candidates = rawStreamUrls.filter((url) => typeof url === "string" && /^https?:\/\//i.test(url));
  } else if (typeof rawStreamUrls === "string" && rawStreamUrls.trim()) {
    try {
      candidates = await decryptYthdStreamUrls(rawStreamUrls, payload.vs);
    } catch (err2) {
      return {
        source: "ythd",
        sourceId: `${PROVIDER_LABELS.ythd} (embed fallback)`,
        embedUrl: pageUrl,
        streams: {}
      };
    }
  }
  if (candidates.length === 0) {
    const err2 = new Error("YTHD returned no playable stream URL");
    err2.statusCode = 404;
    throw err2;
  }
  let lastError;
  for (const candidate of candidates) {
    try {
      const token = await fetchYthdHostToken(candidate);
      const playableUrl = applyYthdStreamToken(candidate, token);
      const streams = await filterReachableStreams(
        { hls: playableUrl },
        ythdCdnHeadersForUrl(playableUrl)
      );
      assertPlayableStreams(streams);
      return {
        source: "ythd",
        sourceId: PROVIDER_LABELS.ythd,
        streams
      };
    } catch (err2) {
      lastError = err2;
    }
  }
  if (pageUrl) {
    return {
      source: "ythd",
      sourceId: `${PROVIDER_LABELS.ythd} (embed fallback)`,
      embedUrl: pageUrl,
      streams: {}
    };
  }
  const err = new Error(lastError?.message || "YTHD returned no playable stream URL");
  err.statusCode = lastError?.statusCode ?? 404;
  throw err;
}
__name(resolveYthdStream, "resolveYthdStream");
async function resolveVideasyStream(path, options = {}) {
  const providerId = String(options.provider || "videasy-neon").toLowerCase();
  const provider = VIDEASY_PROVIDERS[providerId] || VIDEASY_PROVIDERS["videasy-neon"];
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const title2 = String(options.title || "").trim();
  const year = String(options.year || "").trim();
  const imdbId = String(options.imdbId || "").trim();
  if (!title2 || !year) {
    const err = new Error(`${provider.label} requires title and release year`);
    err.statusCode = 400;
    throw err;
  }
  const sourceUrl = new URL(`${VIDEASY_BASE}/${provider.server}/sources-with-title`);
  sourceUrl.searchParams.set("title", encodeVideasyTitle(title2));
  sourceUrl.searchParams.set("mediaType", mediaType === "tv" ? "tv" : "movie");
  sourceUrl.searchParams.set("year", year);
  sourceUrl.searchParams.set("tmdbId", tmdbId);
  if (imdbId) sourceUrl.searchParams.set("imdbId", imdbId);
  if (provider.language) sourceUrl.searchParams.set("language", provider.language);
  if (mediaType === "tv") {
    sourceUrl.searchParams.set("episodeId", episode);
    sourceUrl.searchParams.set("seasonId", season);
  }
  const encryptedRes = await fetch(sourceUrl.toString(), {
    headers: VIDEASY_HEADERS
  });
  if (!encryptedRes.ok) {
    const err = new Error(`${provider.label} returned ${encryptedRes.status}`);
    err.statusCode = encryptedRes.status === 404 ? 404 : 502;
    throw err;
  }
  const decRes = await fetch(`${ENC_BASE}/dec-videasy`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: await encryptedRes.text(), id: tmdbId })
  });
  if (!decRes.ok) {
    const err = new Error(`${provider.label} decrypt returned ${decRes.status}`);
    err.statusCode = 502;
    throw err;
  }
  const decoded = validateEncDecPayload(
    await readJsonResponse(decRes, `${provider.label} decrypt`),
    `${provider.label} decrypt`
  );
  let streams = normalizeVideasyStreams(decoded, provider);
  streams = addEmbeddedHeadersToStreams(streams, VIDEASY_HEADERS);
  if (providerId === "videasy-yoru") {
    streams = await filterYoruPlayableStreams(streams);
  }
  assertPlayableStreams(streams);
  return {
    source: providerId,
    sourceId: provider.label,
    streams
  };
}
__name(resolveVideasyStream, "resolveVideasyStream");
async function resolveVideasyAutoStream(path, options = {}) {
  const errors = [];
  for (const [providerId, provider] of Object.entries(VIDEASY_PROVIDERS)) {
    try {
      const result = await resolveVideasyStream(path, {
        ...options,
        provider: providerId
      });
      return {
        ...result,
        resolvedProvider: result.source
      };
    } catch (err2) {
      errors.push(`${provider.label}: ${err2?.message || "failed"}`);
    }
  }
  const err = new Error(
    errors.length > 0 ? `No Videasy provider returned a playable stream (${errors.join("; ")})` : "No compatible Videasy provider was available"
  );
  err.statusCode = 404;
  throw err;
}
__name(resolveVideasyAutoStream, "resolveVideasyAutoStream");
var PROVIDER_RESOLVERS = {
  fingerapi: resolveVidlinkStream,
  lordflix: resolveToeStream,
  vidfast: resolveVidfastStream,
  movy: resolveMovyStream,
  leg: resolveLegStream,
  icefy: resolveIcefyStream,
  ythd: resolveYthdStream,
  vixsrc: resolveVixsrcStream,
  videasy: resolveVideasyAutoStream,
  ...Object.fromEntries(
    Object.keys(VIDEASY_PROVIDERS).map((providerId) => [providerId, resolveVideasyStream])
  )
};
function isVixsrcHost(hostname) {
  return String(hostname || "").toLowerCase().includes("vixsrc.to");
}
__name(isVixsrcHost, "isVixsrcHost");
function playlistFromVixsrcEmbedHtml(html) {
  const source = String(html || "");
  const videoId = source.match(/window\.video\s*=\s*\{[\s\S]*?id:\s*'([^']+)'/)?.[1];
  const masterUrl = source.match(/window\.masterPlaylist\s*=\s*\{[\s\S]*?url:\s*'([^']+)'/)?.[1] || (videoId ? `${VIXSRC_BASE}/playlist/${videoId}` : "");
  const token = source.match(/window\.masterPlaylist[\s\S]*?'token':\s*'([^']+)'/)?.[1];
  const expires = source.match(/window\.masterPlaylist[\s\S]*?'expires':\s*'([^']+)'/)?.[1];
  if (!masterUrl || !token || !expires) return null;
  let parsed;
  try {
    parsed = new URL(masterUrl);
  } catch {
    return null;
  }
  parsed.searchParams.set("token", token);
  parsed.searchParams.set("expires", expires);
  parsed.searchParams.set("lang", "en");
  if (/window\.canPlayFHD\s*=\s*true/.test(source)) {
    parsed.searchParams.set("h", "1");
  }
  return parsed.toString();
}
__name(playlistFromVixsrcEmbedHtml, "playlistFromVixsrcEmbedHtml");
async function resolveVixsrcExtract(pageUrl) {
  const parsed = new URL(pageUrl);
  const movieMatch = parsed.pathname.match(/^\/movie\/(\d+)\/?$/);
  const tvMatch = parsed.pathname.match(/^\/tv\/(\d+)\/(\d+)\/(\d+)\/?$/);
  const embedMatch = parsed.pathname.match(/^\/embed\/(\d+)\/?$/);
  let embedUrl = "";
  if (movieMatch || tvMatch) {
    const apiPath = movieMatch ? `/api/movie/${movieMatch[1]}?lang=en` : `/api/tv/${tvMatch[1]}/${tvMatch[2]}/${tvMatch[3]}?lang=en`;
    const apiRes = await fetch(`${VIXSRC_BASE}${apiPath}`, {
      headers: {
        ...VIXSRC_HEADERS,
        Accept: "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest"
      },
      redirect: "follow"
    });
    if (!apiRes.ok) {
      const err = new Error(`VixSrc API returned ${apiRes.status}`);
      err.statusCode = apiRes.status === 404 ? 404 : 502;
      throw err;
    }
    let data;
    try {
      data = await apiRes.json();
    } catch {
      const err = new Error("Invalid JSON from VixSrc API");
      err.statusCode = 502;
      throw err;
    }
    if (!data?.src) {
      const err = new Error("VixSrc API missing embed source");
      err.statusCode = 404;
      throw err;
    }
    embedUrl = new URL(String(data.src), VIXSRC_BASE).toString();
  } else if (embedMatch) {
    embedUrl = parsed.toString();
  } else {
    const err = new Error("Unsupported VixSrc URL");
    err.statusCode = 400;
    throw err;
  }
  const embedRes = await fetch(embedUrl, {
    headers: VIXSRC_HEADERS,
    redirect: "follow"
  });
  if (!embedRes.ok) {
    const err = new Error(`VixSrc embed returned ${embedRes.status}`);
    err.statusCode = embedRes.status === 404 ? 404 : 502;
    throw err;
  }
  const html = await embedRes.text();
  const playlist = playlistFromVixsrcEmbedHtml(html);
  if (!playlist) {
    const err = new Error("Could not extract VixSrc playlist");
    err.statusCode = 404;
    throw err;
  }
  return {
    source: "vixsrc",
    sourceId: "VixSrc",
    streams: { hls: playlist }
  };
}
__name(resolveVixsrcExtract, "resolveVixsrcExtract");
async function resolveVixsrcStream(path) {
  const { mediaType, tmdbId, season, episode } = parseFingerPath(path);
  const pageUrl = mediaType === "tv" ? `${VIXSRC_BASE}/tv/${tmdbId}/${season}/${episode}` : `${VIXSRC_BASE}/movie/${tmdbId}`;
  return resolveVixsrcExtract(pageUrl);
}
__name(resolveVixsrcStream, "resolveVixsrcStream");
var STREAMAIN_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://streamain.com/",
  Origin: "https://streamain.com"
};
function collectExtractPlayableUrls(text, baseUrl) {
  const urls = [];
  const seen = /* @__PURE__ */ new Set();
  const normalized = String(text || "").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const dataLink = normalized.match(/data-link=["']([^"']+)["']/i);
  if (dataLink?.[1]) urls.push(dataLink[1]);
  const fileMatches = normalized.matchAll(/(?:file|src|source|url)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/gi);
  for (const match of fileMatches) {
    if (match[1]) urls.push(match[1]);
  }
  const rawMatches = normalized.matchAll(/https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi);
  for (const match of rawMatches) {
    urls.push(match[0]);
  }
  return urls.map((url) => absoluteUrl(url, baseUrl)).filter((url) => {
    if (!url || seen.has(url) || !isPotentialPlayableUrl(url)) return false;
    seen.add(url);
    return true;
  });
}
__name(collectExtractPlayableUrls, "collectExtractPlayableUrls");
async function resolveExtractUrl(pageUrl) {
  const raw = String(pageUrl || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    const err = new Error("A valid extract URL is required");
    err.statusCode = 400;
    throw err;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    const err = new Error("Invalid extract URL");
    err.statusCode = 400;
    throw err;
  }
  const headers = parsed.hostname.includes("streamain.com") ? STREAMAIN_HEADERS : {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: `${parsed.origin}/`,
    Origin: parsed.origin
  };
  if (isVixsrcHost(parsed.hostname)) {
    return resolveVixsrcExtract(raw);
  }
  if (isVidfastHost(parsed.hostname)) {
    return resolveVidfastExtract(raw);
  }
  const res = await fetch(raw, { headers, redirect: "follow" });
  if (!res.ok) {
    const err = new Error(`Extract page returned ${res.status}`);
    err.statusCode = res.status === 404 ? 404 : 502;
    throw err;
  }
  const html = await res.text();
  const playable = collectExtractPlayableUrls(html, raw);
  const extracted = streamsFromUrls(playable);
  const urls = Object.values(extracted);
  const streams = urls.length === 1 && !extracted.hls ? { unknown: urls[0] } : extracted;
  assertPlayableStreams(streams);
  return {
    source: "extract",
    sourceId: "App Exclusive",
    streams
  };
}
__name(resolveExtractUrl, "resolveExtractUrl");
async function resolveFingerStream(path, options = {}) {
  const provider = String(options.provider || "fingerapi").toLowerCase();
  const resolve = PROVIDER_RESOLVERS[provider];
  if (!resolve) {
    const err = new Error(`Unknown provider: ${provider}`);
    err.statusCode = 400;
    throw err;
  }
  return resolve(path, options);
}
__name(resolveFingerStream, "resolveFingerStream");
async function handleFingerProxyRequest(path, options = {}) {
  try {
    const normalized = String(path || "").replace(/^\/+/, "");
    const extractUrl = options.extractUrl || options.url;
    const body = normalized === "extract" || normalized.startsWith("extract/") || extractUrl ? await resolveExtractUrl(extractUrl || "") : await resolveFingerStream(path, options);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    };
  } catch (err) {
    const statusCode = err.statusCode ?? 502;
    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message ?? "Finger API proxy failed"
      })
    };
  }
}
__name(handleFingerProxyRequest, "handleFingerProxyRequest");

// server/introDb.mjs
var INTRODB_V2_BASE_URL = "https://api.theintrodb.org";
function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
__name(jsonResponse, "jsonResponse");
function getIntroDbApiKey(env2) {
  return env2?.INTRODB_API_KEY || env2?.THEINTRODB_API_KEY || (typeof process !== "undefined" ? process.env?.INTRODB_API_KEY || process.env?.THEINTRODB_API_KEY : "") || "";
}
__name(getIntroDbApiKey, "getIntroDbApiKey");
function getIntroDbBaseUrl(env2) {
  return (env2?.INTRODB_BASE_URL || env2?.THEINTRODB_BASE_URL || (typeof process !== "undefined" ? process.env?.INTRODB_BASE_URL || process.env?.THEINTRODB_BASE_URL : "") || INTRODB_V2_BASE_URL).replace(/\/$/, "");
}
__name(getIntroDbBaseUrl, "getIntroDbBaseUrl");
function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}
__name(firstString, "firstString");
function mediaTypeForApi(mediaType) {
  const value = String(mediaType || "").toLowerCase();
  if (value === "movie") return "movie";
  if (value === "series" || value === "tv" || value === "show") return "tv";
  return "tv";
}
__name(mediaTypeForApi, "mediaTypeForApi");
function parseSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return NaN;
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}
__name(parseSeconds, "parseSeconds");
var SEGMENT_FIELDS = [
  ["intro", "intro"],
  ["recap", "recap"],
  ["credits", "credits"],
  ["preview", "preview"],
  ["outro", "credits"]
];
function unwrapSegments(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.segments)) return payload.segments;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload?.start != null || payload?.end != null) return [payload];
  return SEGMENT_FIELDS.flatMap(([field, type]) => {
    const value = payload?.[field];
    if (Array.isArray(value)) {
      return value.map((segment) => ({ ...segment, segment_type: type, type }));
    }
    if (value && typeof value === "object") {
      return [{ ...value, segment_type: type, type }];
    }
    return [];
  });
}
__name(unwrapSegments, "unwrapSegments");
function normalizeSegment(segment) {
  const type = firstString(
    segment?.segment_type,
    segment?.segmentType,
    segment?.type,
    segment?.kind
  ) || "intro";
  let start = parseSeconds(
    segment?.start_sec ?? segment?.startSec ?? segment?.start_seconds ?? segment?.start ?? segment?.startTime
  );
  let end = parseSeconds(
    segment?.end_sec ?? segment?.endSec ?? segment?.end_seconds ?? segment?.end ?? segment?.endTime
  );
  if (segment?.start_ms != null && Number.isFinite(segment.start_ms)) {
    start = segment.start_ms / 1e3;
  } else if (segment?.start_ms === null && (type === "intro" || type === "recap")) {
    start = 0;
  }
  if (segment?.end_ms != null && Number.isFinite(segment.end_ms)) {
    end = segment.end_ms / 1e3;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return {
    type: type.toLowerCase(),
    start,
    end
  };
}
__name(normalizeSegment, "normalizeSegment");
function buildV2MediaUrl(options = {}) {
  const imdbId = firstString(options.imdbId, options.imdb_id);
  const tmdbId = firstString(options.tmdbId, options.tmdb_id);
  if (!imdbId && !tmdbId) return null;
  const base = getIntroDbBaseUrl(options.env);
  const url = new URL(
    base.includes("introdb.app") ? "/segments" : "/v2/media",
    base
  );
  if (url.pathname === "/segments") {
    if (!imdbId) return null;
    url.searchParams.set("imdb_id", imdbId);
  } else if (tmdbId) {
    url.searchParams.set("tmdb_id", tmdbId);
  } else {
    url.searchParams.set("imdb_id", imdbId);
  }
  url.searchParams.set("type", mediaTypeForApi(options.mediaType));
  if (options.season) url.searchParams.set("season", String(options.season));
  if (options.episode) url.searchParams.set("episode", String(options.episode));
  return url;
}
__name(buildV2MediaUrl, "buildV2MediaUrl");
function isLegacyIntroDbHost(baseUrl) {
  return String(baseUrl || "").includes("introdb.app");
}
__name(isLegacyIntroDbHost, "isLegacyIntroDbHost");
async function handleIntroDbRequest(options = {}) {
  const url = buildV2MediaUrl(options);
  const apiKey = getIntroDbApiKey(options.env);
  if (!url) {
    return jsonResponse(200, {
      source: "introdb",
      configured: Boolean(apiKey),
      segments: [],
      message: "Missing TMDB or IMDb id for IntroDB lookup."
    });
  }
  const headers = {
    Accept: "application/json",
    "User-Agent": "seriestechmovies 3.2.0"
  };
  if (apiKey) headers["X-API-Key"] = apiKey;
  try {
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      return jsonResponse(res.status === 404 ? 200 : 502, {
        source: "introdb",
        configured: Boolean(apiKey),
        segments: [],
        error: `IntroDB returned ${res.status}`
      });
    }
    const payload = await res.json();
    if (payload?.error) {
      return jsonResponse(200, {
        source: "introdb",
        configured: Boolean(apiKey),
        segments: [],
        error: String(payload.error)
      });
    }
    const segments = unwrapSegments(payload).map(normalizeSegment).filter(Boolean).filter((segment) => segment.type === "intro");
    return jsonResponse(200, {
      source: isLegacyIntroDbHost(url.origin) ? "introdb-legacy" : "introdb",
      configured: Boolean(apiKey),
      segments
    });
  } catch (err) {
    return jsonResponse(502, {
      source: "introdb",
      configured: Boolean(apiKey),
      segments: [],
      error: err?.message || "IntroDB lookup failed"
    });
  }
}
__name(handleIntroDbRequest, "handleIntroDbRequest");

// server/imdbTrailer.mjs
var IMDB_GRAPHQL = "https://api.graphql.imdb.com/";
var TRAILER_QUERY = `
query TitlePrimaryVideo($id: ID!) {
  title(id: $id) {
    primaryVideos(first: 5) {
      edges {
        node {
          id
          contentType { id }
          playbackURLs {
            displayName { value }
            videoMimeType
            url
          }
        }
      }
    }
    latestTrailer {
      id
      contentType { id }
      playbackURLs {
        displayName { value }
        videoMimeType
        url
      }
    }
  }
}
`;
var QUALITY_RANK = {
  "1080p": 5,
  "720p": 4,
  "480p": 3,
  HD: 3,
  SD: 2,
  AUTO: 1
};
function jsonResponse2(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300"
    },
    body: JSON.stringify(body)
  };
}
__name(jsonResponse2, "jsonResponse");
function normalizeImdbId(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const id = raw.startsWith("tt") ? raw : `tt${raw}`;
  return /^tt\d+$/.test(id) ? id : null;
}
__name(normalizeImdbId, "normalizeImdbId");
function pickBestMp4(urls) {
  const mp4s = (Array.isArray(urls) ? urls : []).filter(
    (item) => item?.url && String(item.videoMimeType || "").toUpperCase() === "MP4"
  );
  if (!mp4s.length) return null;
  mp4s.sort(
    (a, b) => (QUALITY_RANK[b.displayName?.value] || 0) - (QUALITY_RANK[a.displayName?.value] || 0)
  );
  return mp4s[0]?.url || null;
}
__name(pickBestMp4, "pickBestMp4");
function pickVideoUrls(video) {
  return pickBestMp4(video?.playbackURLs);
}
__name(pickVideoUrls, "pickVideoUrls");
function isTrailerType(contentTypeId) {
  return String(contentTypeId || "").toLowerCase().includes("trailer");
}
__name(isTrailerType, "isTrailerType");
async function fetchImdbTrailerMp4(imdbId) {
  const res = await fetch(IMDB_GRAPHQL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://www.imdb.com",
      referer: "https://www.imdb.com/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "x-imdb-client-name": "imdb-web-next"
    },
    body: JSON.stringify({
      query: TRAILER_QUERY,
      operationName: "TitlePrimaryVideo",
      variables: { id: imdbId }
    })
  });
  if (!res.ok) {
    const err = new Error(`IMDb trailer lookup returned ${res.status}`);
    err.statusCode = 502;
    throw err;
  }
  const json = await res.json();
  const title2 = json?.data?.title;
  const primary = Array.isArray(title2?.primaryVideos?.edges) ? title2.primaryVideos.edges.map((edge) => edge?.node).filter(Boolean) : [];
  const overlay = primary.find((video) => isTrailerType(video.contentType?.id)) || primary[0];
  return pickVideoUrls(overlay) || pickVideoUrls(title2?.latestTrailer);
}
__name(fetchImdbTrailerMp4, "fetchImdbTrailerMp4");
async function handleImdbTrailerRequest(options = {}) {
  try {
    const imdbId = normalizeImdbId(options.imdbId);
    if (!imdbId) {
      return jsonResponse2(400, { error: "imdbId is required" });
    }
    const mp4 = await fetchImdbTrailerMp4(imdbId);
    if (!mp4) {
      return jsonResponse2(404, { error: "No IMDb trailer found" });
    }
    return jsonResponse2(200, { mp4, imdbId });
  } catch (err) {
    return jsonResponse2(err.statusCode || 500, {
      error: err.message || "IMDb trailer lookup failed"
    });
  }
}
__name(handleImdbTrailerRequest, "handleImdbTrailerRequest");

// server/subtitleFetch.mjs
var OPENSUBTITLES_API_BASE = "https://api.opensubtitles.com/api/v1";
var OPENSUBTITLES_USER_AGENT = "seriestechmovies 3.2.0";
var OPENSUBTITLES_DOWNLOAD_HOSTS = /* @__PURE__ */ new Set([
  "dl.opensubtitles.org",
  "www.opensubtitles.com",
  "www.opensubtitles.org"
]);
var FETCH_HEADERS2 = {
  Accept: "text/plain, application/octet-stream, */*",
  "User-Agent": OPENSUBTITLES_USER_AGENT
};
var OPENSUBTITLES_PAGE_HEADERS = {
  ...FETCH_HEADERS2,
  Referer: "https://www.opensubtitles.com/",
  Origin: "https://www.opensubtitles.com"
};
var SUBTITLE_FETCH_TIMEOUT_MS = 2e4;
var SUBTITLE_FETCH_RETRIES = 2;
function parseOpenSubtitlesFileId(sourceUrl) {
  if (!sourceUrl) return null;
  try {
    const pathname = new URL(sourceUrl).pathname;
    const match = pathname.match(/\/(?:filead|sub)\/(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
__name(parseOpenSubtitlesFileId, "parseOpenSubtitlesFileId");
function isOpenSubtitlesDownloadUrl(sourceUrl) {
  try {
    return OPENSUBTITLES_DOWNLOAD_HOSTS.has(new URL(sourceUrl).hostname);
  } catch {
    return false;
  }
}
__name(isOpenSubtitlesDownloadUrl, "isOpenSubtitlesDownloadUrl");
function getOpenSubtitlesApiKey() {
  return process.env.OPENSUBTITLES_API_KEY || process.env.VITE_OPENSUBTITLES_API_KEY || "";
}
__name(getOpenSubtitlesApiKey, "getOpenSubtitlesApiKey");
function getSubtitleFetchOrigin() {
  return (process.env.SUBTITLE_FETCH_ORIGIN || process.env.VITE_SUBTITLE_FETCH_ORIGIN || "").replace(/\/$/, "");
}
__name(getSubtitleFetchOrigin, "getSubtitleFetchOrigin");
function isTimeoutError(err) {
  return err?.name === "AbortError" || err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" || err?.cause?.code === "ETIMEDOUT";
}
__name(isTimeoutError, "isTimeoutError");
function openSubtitlesApiHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": OPENSUBTITLES_USER_AGENT,
    "Api-Key": getOpenSubtitlesApiKey()
  };
}
__name(openSubtitlesApiHeaders, "openSubtitlesApiHeaders");
async function fetchWithTimeout(url, init = {}, timeoutMs = SUBTITLE_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
function decodeSubtitleUrl(encodedUrl) {
  const decoded = decodeURIComponent(encodedUrl.trim());
  try {
    return decodeBase64Url(decoded);
  } catch {
    return decodeBase64(decoded);
  }
}
__name(decodeSubtitleUrl, "decodeSubtitleUrl");
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - normalized.length % 4) % 4);
  return decodeBase64(normalized + padding);
}
__name(decodeBase64Url, "decodeBase64Url");
function decodeBase64(value) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").toString("utf8");
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder("utf-8").decode(bytes);
}
__name(decodeBase64, "decodeBase64");
async function gunzipBytes(bytes) {
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  const { gunzipSync } = await import("node:zlib");
  return new TextDecoder("utf-8").decode(gunzipSync(bytes));
}
__name(gunzipBytes, "gunzipBytes");
async function readResponseText(res) {
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 31 && bytes[1] === 139) {
    return gunzipBytes(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}
__name(readResponseText, "readResponseText");
async function fetchDirectSubtitleUrl(sourceUrl) {
  let lastError;
  for (let attempt = 0; attempt <= SUBTITLE_FETCH_RETRIES; attempt += 1) {
    try {
      const res = await fetchWithTimeout(sourceUrl, {
        headers: isOpenSubtitlesDownloadUrl(sourceUrl) ? OPENSUBTITLES_PAGE_HEADERS : FETCH_HEADERS2,
        redirect: "follow"
      });
      if (!res.ok) {
        throw new Error(`Subtitle file returned ${res.status}`);
      }
      const text = await readResponseText(res);
      if (!text.trim()) {
        throw new Error("Subtitle file was empty");
      }
      return text;
    } catch (err) {
      lastError = err;
      if (!isTimeoutError(err) || attempt === SUBTITLE_FETCH_RETRIES) break;
    }
  }
  throw lastError;
}
__name(fetchDirectSubtitleUrl, "fetchDirectSubtitleUrl");
function buildOpenSubtitlesSearchUrl(searchContext = {}) {
  const url = new URL(`${OPENSUBTITLES_API_BASE}/subtitles`);
  const imdbId = searchContext.imdbId?.trim();
  const tmdbId = searchContext.tmdbId?.trim();
  if (imdbId) {
    url.searchParams.set("imdb_id", imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`);
  } else if (tmdbId) {
    url.searchParams.set("tmdb_id", tmdbId);
  } else {
    return null;
  }
  if (searchContext.season) {
    url.searchParams.set("season_number", String(searchContext.season));
  }
  if (searchContext.episode) {
    url.searchParams.set("episode_number", String(searchContext.episode));
  }
  if (searchContext.language) {
    url.searchParams.set("languages", String(searchContext.language).toLowerCase());
  }
  return url;
}
__name(buildOpenSubtitlesSearchUrl, "buildOpenSubtitlesSearchUrl");
function pickOpenSubtitlesFileId(results, searchContext = {}) {
  const entries = Array.isArray(results) ? results : [];
  if (entries.length === 0) return null;
  const language = String(searchContext.language || "").toLowerCase();
  const releaseHint = String(searchContext.release || "").toLowerCase();
  const wyzieId = String(searchContext.wyzieId || "");
  let best = entries[0];
  let bestScore = -1;
  for (const entry of entries) {
    const attributes = entry?.attributes ?? {};
    const files = attributes?.files ?? [];
    const fileId = files[0]?.file_id;
    if (!fileId) continue;
    let score = 0;
    const entryLanguage = String(attributes.language || "").toLowerCase();
    if (language && entryLanguage === language) score += 4;
    if (releaseHint && String(attributes.release || "").toLowerCase().includes(releaseHint)) {
      score += 2;
    }
    if (wyzieId && String(fileId) === wyzieId) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best?.attributes?.files?.[0]?.file_id ?? null;
}
__name(pickOpenSubtitlesFileId, "pickOpenSubtitlesFileId");
async function resolveOpenSubtitlesFileId(searchContext = {}, parsedFileId = null) {
  if (parsedFileId) {
    const probe = await fetchWithTimeout(`${OPENSUBTITLES_API_BASE}/download`, {
      method: "POST",
      headers: openSubtitlesApiHeaders(),
      body: JSON.stringify({ file_id: Number(parsedFileId) })
    });
    if (probe.ok) return Number(parsedFileId);
  }
  const searchUrl = buildOpenSubtitlesSearchUrl(searchContext);
  if (!searchUrl) return null;
  const res = await fetchWithTimeout(searchUrl.toString(), {
    headers: openSubtitlesApiHeaders()
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(
      `OpenSubtitles search returned ${res.status}${detail ? `: ${detail}` : ""}`
    );
  }
  const payload = await res.json();
  const fileId = pickOpenSubtitlesFileId(payload?.data, searchContext);
  if (!fileId) {
    throw new Error("OpenSubtitles search did not return a matching subtitle file");
  }
  return fileId;
}
__name(resolveOpenSubtitlesFileId, "resolveOpenSubtitlesFileId");
async function requestOpenSubtitlesFetchLink(fileId) {
  const res = await fetchWithTimeout(`${OPENSUBTITLES_API_BASE}/download`, {
    method: "POST",
    headers: openSubtitlesApiHeaders(),
    body: JSON.stringify({ file_id: Number(fileId) })
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(
      `OpenSubtitles API returned ${res.status}${detail ? `: ${detail}` : ""}`
    );
  }
  const payload = await res.json();
  const link = payload?.link;
  if (!link || typeof link !== "string") {
    throw new Error("OpenSubtitles API did not return a subtitle URL");
  }
  return link;
}
__name(requestOpenSubtitlesFetchLink, "requestOpenSubtitlesFetchLink");
async function fetchViaOpenSubtitlesApi(searchContext = {}, parsedFileId = null) {
  const fileId = await resolveOpenSubtitlesFileId(searchContext, parsedFileId);
  const link = await requestOpenSubtitlesFetchLink(fileId);
  return fetchDirectSubtitleUrl(link);
}
__name(fetchViaOpenSubtitlesApi, "fetchViaOpenSubtitlesApi");
async function fetchViaConfiguredOrigin(encodedUrl, searchContext = {}) {
  const origin = getSubtitleFetchOrigin();
  if (!origin) return null;
  const params = new URLSearchParams();
  if (searchContext.fileId) params.set("fileId", String(searchContext.fileId));
  if (searchContext.wyzieId) params.set("wyzieId", String(searchContext.wyzieId));
  if (searchContext.tmdbId) params.set("tmdbId", String(searchContext.tmdbId));
  if (searchContext.imdbId) params.set("imdbId", String(searchContext.imdbId));
  if (searchContext.season) params.set("season", String(searchContext.season));
  if (searchContext.episode) params.set("episode", String(searchContext.episode));
  if (searchContext.language) params.set("lang", String(searchContext.language));
  if (searchContext.release) params.set("release", String(searchContext.release));
  const query = params.toString();
  const url = `${origin}/api/subtitles/file/${encodedUrl}${query ? `?${query}` : ""}`;
  const res = await fetchWithTimeout(url, { headers: FETCH_HEADERS2 });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Subtitle relay returned ${res.status}`);
  }
  return text;
}
__name(fetchViaConfiguredOrigin, "fetchViaConfiguredOrigin");
async function fetchSubtitleContent({
  sourceUrl,
  encodedUrl,
  fileId,
  wyzieId,
  tmdbId,
  imdbId,
  season,
  episode,
  language,
  release: release2
} = {}) {
  const searchContext = {
    fileId,
    wyzieId,
    tmdbId,
    imdbId,
    season,
    episode,
    language,
    release: release2
  };
  const parsedFileId = fileId || parseOpenSubtitlesFileId(sourceUrl);
  const shouldUseOpenSubtitlesFirst = isOpenSubtitlesDownloadUrl(sourceUrl) && Boolean(getOpenSubtitlesApiKey());
  let openSubtitlesFirstError = null;
  if (shouldUseOpenSubtitlesFirst) {
    try {
      return await fetchViaOpenSubtitlesApi(searchContext, parsedFileId);
    } catch (err) {
      openSubtitlesFirstError = err;
    }
  }
  if (encodedUrl && getSubtitleFetchOrigin()) {
    try {
      const relayed = await fetchViaConfiguredOrigin(encodedUrl, searchContext);
      if (relayed) return relayed;
    } catch {
    }
  }
  try {
    return await fetchDirectSubtitleUrl(sourceUrl);
  } catch (err) {
    if (!isTimeoutError(err)) throw err;
    if (openSubtitlesFirstError) {
      throw openSubtitlesFirstError;
    }
    if (getOpenSubtitlesApiKey()) {
      return fetchViaOpenSubtitlesApi(searchContext, parsedFileId);
    }
    throw new Error(
      "OpenSubtitles subtitle URL is unreachable from this server. Add OPENSUBTITLES_API_KEY (free at https://www.opensubtitles.com/consumers) or set SUBTITLE_FETCH_ORIGIN to your deployed site URL."
    );
  }
}
__name(fetchSubtitleContent, "fetchSubtitleContent");
function subtitleTextToVtt(text, sourceUrl = "") {
  const cleaned = String(text || "").replace(/^\uFEFF/, "").trim();
  if (/^WEBVTT/i.test(cleaned)) return cleaned;
  if (/^\[Script Info\]/i.test(cleaned) || /^Dialogue:/im.test(cleaned)) {
    return assToVtt(cleaned);
  }
  return srtToVtt(cleaned || sourceUrl);
}
__name(subtitleTextToVtt, "subtitleTextToVtt");
function srtToVtt(text) {
  return `WEBVTT

${text.replace(/\{\\[^}]+}/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}
`;
}
__name(srtToVtt, "srtToVtt");
function assToVtt(text) {
  const formatLine = text.match(/^Format:\s*(.+)$/im)?.[1] || "";
  const fields = formatLine.split(",").map((field) => field.trim().toLowerCase());
  const startIndex = fields.indexOf("start");
  const endIndex = fields.indexOf("end");
  const textIndex = fields.indexOf("text");
  const events = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("Dialogue:")) continue;
    const raw = line.slice("Dialogue:".length).trim();
    const parts = splitAssDialogue(raw, Math.max(fields.length, textIndex + 1));
    const start = parts[startIndex];
    const end = parts[endIndex];
    const cueText = parts.slice(textIndex).join(",").trim();
    if (!start || !end || !cueText) continue;
    events.push(
      `${assTimeToVtt(start)} --> ${assTimeToVtt(end)}
${cleanAssText(cueText)}`
    );
  }
  return `WEBVTT

${events.join("\n\n")}
`;
}
__name(assToVtt, "assToVtt");
function splitAssDialogue(value, fieldCount) {
  const parts = value.split(",");
  if (parts.length <= fieldCount) return parts;
  return [...parts.slice(0, fieldCount - 1), parts.slice(fieldCount - 1).join(",")];
}
__name(splitAssDialogue, "splitAssDialogue");
function assTimeToVtt(value) {
  const [hours = "0", minutes = "00", seconds = "00"] = String(value).trim().split(":");
  const [secs = "00", centis = "00"] = seconds.split(".");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${secs.padStart(2, "0")}.${centis.padEnd(3, "0").slice(0, 3)}`;
}
__name(assTimeToVtt, "assTimeToVtt");
function cleanAssText(value) {
  return value.replace(/\{[^}]+}/g, "").replace(/\\N/g, "\n").replace(/\\h/g, " ").trim();
}
__name(cleanAssText, "cleanAssText");

// server/subtitleResolve.mjs
var FETCH_HEADERS3 = {
  Accept: "application/json, text/plain, */*",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
};
var STREMIO_SUBTITLES_BASE = "https://opensubtitles-v3.strem.io";
var LANGUAGE_NAMES = {
  ar: "Arabic",
  bg: "Bulgarian",
  bs: "Bosnian",
  cs: "Czech",
  en: "English",
  da: "Danish",
  es: "Spanish",
  fr: "French",
  de: "German",
  el: "Greek",
  et: "Estonian",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  nl: "Dutch",
  no: "Norwegian",
  nb: "Norwegian",
  fa: "Persian",
  pl: "Polish",
  sv: "Swedish",
  fi: "Finnish",
  pt: "Portuguese",
  "pt-br": "Brazilian Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sr: "Serbian",
  tr: "Turkish",
  uk: "Ukrainian",
  zh: "Chinese",
  "zh-tw": "Chinese Traditional"
};
var LANGUAGE_FLAG_COUNTRIES = {
  ar: "SA",
  bg: "BG",
  bs: "BA",
  cs: "CZ",
  da: "DK",
  de: "DE",
  el: "GR",
  en: "US",
  es: "ES",
  et: "EE",
  fi: "FI",
  fr: "FR",
  he: "IL",
  hi: "IN",
  hr: "HR",
  hu: "HU",
  it: "IT",
  ja: "JP",
  ko: "KR",
  nb: "NO",
  nl: "NL",
  no: "NO",
  fa: "IR",
  pl: "PL",
  pt: "PT",
  "pt-br": "BR",
  ro: "RO",
  ru: "RU",
  sk: "SK",
  sl: "SI",
  sr: "RS",
  sv: "SE",
  tr: "TR",
  uk: "UA",
  zh: "CN",
  "zh-tw": "TW"
};
var STREMIO_LANGUAGE_ALIASES = {
  ara: "ar",
  bul: "bg",
  bos: "bs",
  ces: "cs",
  cze: "cs",
  dan: "da",
  deu: "de",
  ger: "de",
  ell: "el",
  gre: "el",
  eng: "en",
  est: "et",
  spa: "es",
  fin: "fi",
  fra: "fr",
  fre: "fr",
  heb: "he",
  hin: "hi",
  hrv: "hr",
  hun: "hu",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  dut: "nl",
  nor: "no",
  per: "fa",
  fas: "fa",
  pes: "fa",
  pol: "pl",
  por: "pt",
  pob: "pt-br",
  ron: "ro",
  rum: "ro",
  rus: "ru",
  slk: "sk",
  slo: "sk",
  slv: "sl",
  srp: "sr",
  swe: "sv",
  tur: "tr",
  ukr: "uk",
  zho: "zh",
  chi: "zh",
  zht: "zh-tw"
};
function jsonResponse3(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
__name(jsonResponse3, "jsonResponse");
function textResponse(statusCode, body, contentType = "text/plain; charset=utf-8") {
  return {
    statusCode,
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" },
    body
  };
}
__name(textResponse, "textResponse");
function languageName(code) {
  const normalized = normalizeLanguageCode(code);
  return LANGUAGE_NAMES[normalized] || normalized.toUpperCase();
}
__name(languageName, "languageName");
function flagUrlForLanguage(code) {
  const normalized = normalizeLanguageCode(code);
  const country = LANGUAGE_FLAG_COUNTRIES[normalized];
  return country ? `https://flagsapi.com/${country}/flat/24.png` : "";
}
__name(flagUrlForLanguage, "flagUrlForLanguage");
function normalizeLanguageCode(code) {
  const normalized = String(code || "en").toLowerCase();
  return STREMIO_LANGUAGE_ALIASES[normalized] || normalized;
}
__name(normalizeLanguageCode, "normalizeLanguageCode");
function firstString2(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}
__name(firstString2, "firstString");
function readLocalEnvValue(key) {
  try {
    if (typeof process !== "undefined" && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
  }
  return "";
}
__name(readLocalEnvValue, "readLocalEnvValue");
function applyLocalEnvValue(key) {
  const value = readLocalEnvValue(key);
  if (value && typeof process !== "undefined" && process.env && !process.env[key]) {
    process.env[key] = value;
  }
}
__name(applyLocalEnvValue, "applyLocalEnvValue");
function subtitleUrlFor(sourceUrl, format, index, searchContext = {}, entry = {}) {
  const encoded = Buffer.from(sourceUrl, "utf8").toString("base64url");
  const params = new URLSearchParams({
    format: format || "srt",
    i: String(index)
  });
  const fileId = parseOpenSubtitlesFileId(sourceUrl);
  const wyzieId = firstString2(entry?.id, entry?.subtitle_id);
  if (fileId) params.set("fileId", fileId);
  if (wyzieId) params.set("wyzieId", wyzieId);
  if (searchContext.tmdbId) params.set("tmdbId", String(searchContext.tmdbId));
  if (searchContext.imdbId) params.set("imdbId", String(searchContext.imdbId));
  if (searchContext.season) params.set("season", String(searchContext.season));
  if (searchContext.episode) params.set("episode", String(searchContext.episode));
  const language = normalizeLanguageCode(firstString2(
    entry?.language,
    entry?.lang,
    entry?.languageCode,
    searchContext.language
  ));
  if (language) params.set("lang", language);
  const release2 = firstString2(entry?.release, entry?.fileName, entry?.filename, entry?.name);
  if (release2) params.set("release", release2);
  return `/api/subtitles/file/${encodeURIComponent(encoded)}?${params.toString()}`;
}
__name(subtitleUrlFor, "subtitleUrlFor");
function hasBlockedReleaseMarker(entry) {
  const values = [
    entry?.release,
    entry?.fileName,
    entry?.filename,
    entry?.name,
    entry?.origin,
    entry?.matchedRelease,
    entry?.matchedFilter,
    ...Array.isArray(entry?.releases) ? entry.releases : []
  ];
  return values.some((value) => /dvdrip/i.test(String(value || "")));
}
__name(hasBlockedReleaseMarker, "hasBlockedReleaseMarker");
function normalizeSubtitle(entry, index, searchContext = {}) {
  const sourceUrl = firstString2(entry?.url, entry?.link, entry?.download, entry?.file);
  if (!sourceUrl) return null;
  if (hasBlockedReleaseMarker(entry)) return null;
  const language = normalizeLanguageCode(
    firstString2(entry?.language, entry?.lang, entry?.languageCode) || "en"
  );
  const source = firstString2(entry?.source, entry?.provider, entry?.origin);
  const release2 = firstString2(entry?.release, entry?.fileName, entry?.filename, entry?.name);
  const format = firstString2(entry?.format, sourceUrl.split("?")[0].split(".").pop()) || "srt";
  if (format.toLowerCase() !== "srt") return null;
  const parts = [languageName(language)];
  if (entry?.hi || entry?.hearing_impaired) parts.push("CC");
  return {
    id: String(entry?.id || entry?.subtitle_id || `${language}-${index}`),
    label: parts.join(" \xB7 "),
    language,
    flagUrl: firstString2(entry?.flagUrl, entry?.flag, entry?.flag_url, flagUrlForLanguage(language)),
    source,
    release: release2,
    format,
    directUrl: sourceUrl,
    url: subtitleUrlFor(sourceUrl, format, index, searchContext, { ...entry, language })
  };
}
__name(normalizeSubtitle, "normalizeSubtitle");
function unwrapSubtitleList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subtitles)) return payload.subtitles;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}
__name(unwrapSubtitleList, "unwrapSubtitleList");
function buildStremioSubtitleUrl(options) {
  const imdbId = firstString2(options.imdbId);
  if (!imdbId) return null;
  const isSeries = options.mediaType === "tv" || options.mediaType === "series" || options.type === "series";
  const stremioType = isSeries ? "series" : "movie";
  const stremioId = isSeries ? `${imdbId}:${Number(options.season || 1)}:${Number(options.episode || 1)}` : imdbId;
  return new URL(`/subtitles/${stremioType}/${encodeURIComponent(stremioId)}.json`, STREMIO_SUBTITLES_BASE);
}
__name(buildStremioSubtitleUrl, "buildStremioSubtitleUrl");
function normalizeStremioSubtitle(entry, index, searchContext = {}) {
  return normalizeSubtitle(
    {
      ...entry,
      language: entry?.language || entry?.lang,
      source: "Stremio",
      provider: "Stremio",
      release: firstString2(entry?.release, entry?.filename, entry?.id),
      format: "srt"
    },
    index,
    searchContext
  );
}
__name(normalizeStremioSubtitle, "normalizeStremioSubtitle");
async function handleSubtitleSearchRequest(options = {}) {
  const url = buildStremioSubtitleUrl(options);
  if (!url) {
    return jsonResponse3(200, {
      source: "stremio",
      configured: true,
      subtitles: [],
      message: "Missing IMDb id for Stremio subtitle lookup."
    });
  }
  try {
    const res = await fetch(url.toString(), { headers: FETCH_HEADERS3 });
    if (!res.ok) {
      return jsonResponse3(res.status === 404 ? 200 : 502, {
        source: "stremio",
        configured: true,
        subtitles: [],
        error: `Stremio subtitles returned ${res.status}`
      });
    }
    const payload = await res.json();
    const searchContext = {
      tmdbId: options.tmdbId,
      imdbId: options.imdbId,
      season: options.season,
      episode: options.episode,
      language: options.language,
      mediaType: options.mediaType || options.type
    };
    const subtitles = unwrapSubtitleList(payload).map((entry, index) => normalizeStremioSubtitle(entry, index, searchContext)).filter(Boolean).slice(0, 100);
    return jsonResponse3(200, {
      source: "stremio",
      configured: true,
      subtitles
    });
  } catch (err) {
    return jsonResponse3(502, {
      source: "stremio",
      configured: true,
      subtitles: [],
      error: err?.message || "Stremio subtitle search failed"
    });
  }
}
__name(handleSubtitleSearchRequest, "handleSubtitleSearchRequest");
async function handleSubtitleFileRequest(encodedUrl, options = {}) {
  if (!encodedUrl?.trim()) {
    return textResponse(400, "Missing subtitle URL");
  }
  applyLocalEnvValue("OPENSUBTITLES_API_KEY");
  applyLocalEnvValue("SUBTITLE_FETCH_ORIGIN");
  let sourceUrl;
  try {
    sourceUrl = decodeSubtitleUrl(encodedUrl);
    new URL(sourceUrl);
  } catch {
    return textResponse(400, "Invalid subtitle URL");
  }
  try {
    const text = await fetchSubtitleContent({
      sourceUrl,
      encodedUrl,
      fileId: options.fileId || parseOpenSubtitlesFileId(sourceUrl),
      wyzieId: options.wyzieId,
      tmdbId: options.tmdbId,
      imdbId: options.imdbId,
      season: options.season,
      episode: options.episode,
      language: options.language || options.lang,
      release: options.release
    });
    return textResponse(200, subtitleTextToVtt(text, sourceUrl), "text/vtt; charset=utf-8");
  } catch (err) {
    return textResponse(502, err?.message || "Subtitle file failed");
  }
}
__name(handleSubtitleFileRequest, "handleSubtitleFileRequest");

// server/apiHandler.mjs
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};
function withCors(headers = {}) {
  return { ...corsHeaders, ...headers };
}
__name(withCors, "withCors");
function sendResult(result) {
  const headers = withCors(result.headers || {});
  const body = result.stream || result.body;
  return new Response(body, {
    status: result.statusCode || 200,
    headers
  });
}
__name(sendResult, "sendResult");
function sendJson(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: withCors({ "Content-Type": "application/json" })
  });
}
__name(sendJson, "sendJson");
function sendText(statusCode, body, contentType = "text/plain; charset=utf-8") {
  return new Response(body, {
    status: statusCode,
    headers: withCors({ "Content-Type": contentType })
  });
}
__name(sendText, "sendText");
function apiInfo(url) {
  const origin = url.origin;
  return {
    name: "FingerPlayer Cloudflare API & Proxy",
    status: "online",
    version: "2.0.0",
    endpoints: {
      fingerMovie: `${origin}/api/finger/movie/550?provider=fingerapi`,
      fingerSeries: `${origin}/api/finger/tv/1396/1/1?provider=fingerapi`,
      fingerExtract: `${origin}/api/finger/extract?url={embedUrl}`,
      streamProxy: `${origin}/api/stream-proxy/{base64-stream-url}`,
      subtitles: `${origin}/api/subtitles?type=series&tmdbId=2316&season=1&episode=1`,
      introdb: `${origin}/api/introdb?type=series&tmdbId=2316&season=1&episode=1`,
      imdbTrailer: `${origin}/api/imdb-trailer?imdbId=tt1266020`,
      health: `${origin}/api/health`
    }
  };
}
__name(apiInfo, "apiInfo");
async function handleApiRequest(request, env2 = {}) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendText(405, "Method not allowed");
  }
  const isStreamProxy = path === "/api/stream-proxy" || path.startsWith("/api/stream-proxy/");
  const isSubtitles = path === "/api/subtitles" || path.startsWith("/api/subtitles/");
  const isIntroDb = path === "/api/introdb";
  const isImdbTrailer = path === "/api/imdb-trailer";
  const isFinger = path.startsWith("/api/finger");
  const isHealth = path === "/health" || path === "/api/health" || path === "/api";
  try {
    if (isHealth) {
      return sendJson(200, apiInfo(url));
    }
    if (isStreamProxy) {
      const destination = url.searchParams.get("destination");
      const encodedDestination = path === "/api/stream-proxy" ? null : path.replace(/^\/api\/stream-proxy\/?/, "");
      const requestHeaders = {};
      for (const [k, v] of request.headers.entries()) {
        requestHeaders[k.toLowerCase()] = v;
      }
      const result = await handleStreamProxyRequest(destination, {
        encodedDestination,
        proxyBasePath: "/api/stream-proxy",
        proxyPublicBase: `${url.origin}/api/stream-proxy`,
        range: request.headers.get("range") || void 0,
        requestHeaders
      });
      return sendResult(result);
    }
    if (isSubtitles) {
      if (path.startsWith("/api/subtitles/file/")) {
        const encodedUrl = path.replace(/^\/api\/subtitles\/file\/?/, "");
        const result2 = await handleSubtitleFileRequest(encodedUrl, {
          fileId: url.searchParams.get("fileId") ?? void 0,
          wyzieId: url.searchParams.get("wyzieId") ?? void 0,
          tmdbId: url.searchParams.get("tmdbId") ?? void 0,
          imdbId: url.searchParams.get("imdbId") ?? void 0,
          season: url.searchParams.get("season") ?? void 0,
          episode: url.searchParams.get("episode") ?? void 0,
          language: url.searchParams.get("lang") ?? void 0,
          release: url.searchParams.get("release") ?? void 0,
          env: env2
        });
        return sendResult(result2);
      }
      const result = await handleSubtitleSearchRequest({
        mediaType: url.searchParams.get("type") ?? void 0,
        tmdbId: url.searchParams.get("tmdbId") ?? void 0,
        imdbId: url.searchParams.get("imdbId") ?? void 0,
        season: url.searchParams.get("season") ?? void 0,
        episode: url.searchParams.get("episode") ?? void 0,
        language: url.searchParams.get("language") ?? void 0,
        env: env2
      });
      return sendResult(result);
    }
    if (isIntroDb) {
      const result = await handleIntroDbRequest({
        mediaType: url.searchParams.get("type") ?? void 0,
        tmdbId: url.searchParams.get("tmdbId") ?? void 0,
        imdbId: url.searchParams.get("imdbId") ?? void 0,
        season: url.searchParams.get("season") ?? void 0,
        episode: url.searchParams.get("episode") ?? void 0,
        env: env2
      });
      return sendResult(result);
    }
    if (isImdbTrailer) {
      const result = await handleImdbTrailerRequest({
        imdbId: url.searchParams.get("imdbId") ?? void 0,
        env: env2
      });
      return sendResult(result);
    }
    if (isFinger) {
      const fingerPath = path.replace(/^\/api\/finger\/?/, "");
      const result = await handleFingerProxyRequest(fingerPath, {
        provider: url.searchParams.get("provider") ?? void 0,
        title: url.searchParams.get("title") ?? void 0,
        year: url.searchParams.get("year") ?? void 0,
        imdbId: url.searchParams.get("imdbId") ?? void 0,
        extractUrl: url.searchParams.get("url") ?? url.searchParams.get("extractUrl") ?? void 0,
        env: env2
      });
      return sendResult(result);
    }
    return sendJson(404, { error: "Not found", path });
  } catch (err) {
    return sendJson(500, { error: err?.message || "Internal proxy error" });
  }
}
__name(handleApiRequest, "handleApiRequest");

// worker/index.js
var worker_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/") || url.pathname === "/health" || url.pathname === "/api") {
      return handleApiRequest(request, env2);
    }
    if (env2.ASSETS && typeof env2.ASSETS.fetch === "function") {
      return env2.ASSETS.fetch(request);
    }
    return new Response("Not found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    const body = JSON.stringify(error3);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-O9ysxB/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-O9ysxB/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
