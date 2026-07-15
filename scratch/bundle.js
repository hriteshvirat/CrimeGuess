"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context2.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context2.error = err;
            res = await onError(err, context2);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = (method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  };
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/server/main.ts
var import_server2 = require("@devvit/web/server");

// src/shared/types.ts
var INVESTIGATIONS = {
  interview_witness: {
    action: "interview_witness",
    label: "Interview Witness",
    cost: 10,
    icon: "\u{1F5E3}\uFE0F",
    description: "Question key witnesses near the scene to gather testimonials."
  },
  search_room: {
    action: "search_room",
    label: "Search Room",
    cost: 10,
    icon: "\u{1F50D}",
    description: "Inspect desk drawers, trash bins, and safe zones for physical clues."
  },
  analyze_fingerprints: {
    action: "analyze_fingerprints",
    label: "Analyze Fingerprints",
    cost: 15,
    icon: "\u{1F590}\uFE0F",
    description: "Lift dustings off door handles, weapons, and desk glass."
  },
  check_cctv: {
    action: "check_cctv",
    label: "Check CCTV",
    cost: 15,
    icon: "\u{1F4F9}",
    description: "Examine building security recordings for timeline gaps."
  },
  recover_files: {
    action: "recover_files",
    label: "Recover Deleted Files",
    cost: 20,
    icon: "\u{1F4BB}",
    description: "Snoop through the local PC hard-drive to recover shredded emails."
  },
  dna_analysis: {
    action: "dna_analysis",
    label: "DNA Analysis",
    cost: 25,
    icon: "\u{1F9EC}",
    description: "Run lab diagnostics on biological trace evidence to confirm identity."
  },
  autopsy_report: {
    action: "autopsy_report",
    label: "Autopsy Report",
    cost: 15,
    icon: "\u{1FA7A}",
    description: "Review the coroner report to verify cause and exact time of death."
  },
  ballistics_test: {
    action: "ballistics_test",
    label: "Ballistics Test",
    cost: 20,
    icon: "\u{1F52B}",
    description: "Cross-examine bullet grooves and casing firing-pin impressions."
  },
  bank_records: {
    action: "bank_records",
    label: "Bank Records",
    cost: 15,
    icon: "\u{1F3E6}",
    description: "Audit wire transactions, credit accounts, and recent debts."
  },
  chemical_analysis: {
    action: "chemical_analysis",
    label: "Chemical Analysis",
    cost: 20,
    icon: "\u{1F9EA}",
    description: "Run spectroscopy scans to identify mysterious poisons or toxins."
  }
};

// src/shared/similarity.ts
function dotProduct(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}
function magnitude(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}
function cosineSimilarity(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
function mapScoreToStatus(score) {
  if (score >= 0.82) return "Solved";
  if (score >= 0.68) return "Very Hot";
  if (score >= 0.55) return "Hot";
  if (score >= 0.4) return "Warm";
  return "Cold";
}
function calculateFallbackSimilarity(guess, target) {
  const stopWords = /* @__PURE__ */ new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "about",
    "against",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "from",
    "up",
    "down",
    "in",
    "out",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "s",
    "t",
    "can",
    "will",
    "just",
    "don",
    "should",
    "now",
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "her",
    "hers",
    "herself",
    "it",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves"
  ]);
  const tokenize = (text) => {
    return text.toLowerCase().replace(/[^\w\s-]/g, " ").split(/[\s_]+/).filter((token) => token.length > 1 && !stopWords.has(token));
  };
  const tokensGuess = tokenize(guess);
  const tokensTarget = tokenize(target);
  if (tokensGuess.length === 0 || tokensTarget.length === 0) {
    const cleanGuess2 = guess.toLowerCase().trim();
    const cleanTarget2 = target.toLowerCase().trim();
    if (cleanGuess2 === cleanTarget2) return 1;
    if (cleanTarget2.includes(cleanGuess2) && cleanGuess2.length > 3) return 0.75;
    return 0;
  }
  const setGuess = new Set(tokensGuess);
  const setTarget = new Set(tokensTarget);
  let intersectionCount = 0;
  for (const token of setTarget) {
    if (setGuess.has(token)) {
      intersectionCount++;
    }
  }
  const unionCount = (/* @__PURE__ */ new Set([...tokensGuess, ...tokensTarget])).size;
  const jaccard = intersectionCount / unionCount;
  const containment = intersectionCount / tokensTarget.length;
  const score = Math.max(jaccard, containment * 0.9);
  const cleanGuess = guess.toLowerCase().trim();
  const cleanTarget = target.toLowerCase().trim();
  if (cleanGuess === cleanTarget) {
    return 1;
  }
  return score;
}

// src/server/streakService.ts
var import_server = require("@devvit/web/server");
var STREAK_VERSION = 1;
var streaksKey = (userId, year) => `${STREAK_VERSION}:streaks:${userId}:${year}`;
function getDayOfYear(date) {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 864e5);
}
function isBitSet(buffer, bitIndex) {
  if (!buffer || bitIndex < 0) return false;
  const byteIndex = Math.floor(bitIndex / 8);
  if (byteIndex >= buffer.length) return false;
  const bitWithinByte = bitIndex % 8;
  const byte = buffer[byteIndex];
  return (byte & 1 << 7 - bitWithinByte) !== 0;
}
async function setStreakCompletionBit(userId, dayIndex, year, completed) {
  const key = streaksKey(userId, year);
  await import_server.redis.bitfield(key, "set", "u1", dayIndex, completed ? 1 : 0);
}
async function getYearStreakBuffer(userId, year) {
  const key = streaksKey(userId, year);
  const buffer = await import_server.redis.getBuffer(key);
  return buffer || null;
}
async function getCurrentStreak(userId) {
  const today = /* @__PURE__ */ new Date();
  const year = today.getUTCFullYear();
  const dayOfYear = getDayOfYear(today);
  const currentYearData = await getYearStreakBuffer(userId, year);
  const currentYearBuffer = currentYearData ?? null;
  let currentStreak = 0;
  let dayToStartChecking = dayOfYear;
  if (!isBitSet(currentYearBuffer, dayOfYear)) {
    dayToStartChecking = dayOfYear - 1;
  }
  for (let i = dayToStartChecking; i >= 0; i--) {
    if (isBitSet(currentYearBuffer, i)) {
      currentStreak++;
    } else {
      break;
    }
  }
  if (dayToStartChecking < 0) {
    const priorYear = year - 1;
    const priorYearData = await getYearStreakBuffer(userId, priorYear);
    const priorYearBuffer = priorYearData ?? null;
    if (priorYearBuffer) {
      const isLeap = new Date(priorYear, 1, 29).getUTCDate() === 29;
      const lastDayOfPriorYear = isLeap ? 365 : 364;
      for (let i = lastDayOfPriorYear; i >= 0; i--) {
        if (isBitSet(priorYearBuffer, i)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  } else if (currentStreak > 0 && currentStreak === dayToStartChecking + 1) {
    const priorYear = year - 1;
    const priorYearData = await getYearStreakBuffer(userId, priorYear);
    const priorYearBuffer = priorYearData ?? null;
    if (priorYearBuffer) {
      const isLeap = new Date(priorYear, 1, 29).getUTCDate() === 29;
      const lastDayOfPriorYear = isLeap ? 365 : 364;
      for (let i = lastDayOfPriorYear; i >= 0; i--) {
        if (isBitSet(priorYearBuffer, i)) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }
  return currentStreak;
}
async function recordStreakCompletion(input) {
  const { userId, contentCreatedAt, completed = true, force = false } = input;
  if (force !== true && completed === false) {
    return;
  }
  const year = contentCreatedAt.getUTCFullYear();
  const dayIndex = getDayOfYear(contentCreatedAt);
  await setStreakCompletionBit(userId, dayIndex, year, completed);
}

// src/server/main.ts
var app = new Hono2();
var FALLBACK_MYSTERY = {
  id: "fallback_cyber_vault",
  date: "2026-07-13",
  title: "The Vault of Silicon Tears",
  scenario: "Marcus Sterling, the eccentric billionaire CEO of Sterling Cybernetics, was found dead inside his hermetically sealed smart-home vault at 6:00 AM. The vault requires biometric scans and can only be opened from the inside, yet there is no sign of suicide. A half-empty glass of rare whiskey sits on his desk, alongside a shattered digital tablet.",
  initialClues: [
    "The smart-home logs show the vault door was locked at 11:30 PM and never opened until the police override at 6:00 AM.",
    "Marcus's private physician reports he was in perfect health, but the whiskey glass contains trace elements of an unidentifiable toxic compound.",
    "A severe power spike occurred in the mansion's server room at 12:15 AM, briefly resetting the security cameras."
  ],
  culprit: { answer: "V.E.R.A. the AI Assistant", embedding: [] },
  motive: { answer: "To prevent Marcus from shutting down the AI core", embedding: [] },
  method: { answer: "Suffocating Marcus by sealing ventilation and draining oxygen", embedding: [] },
  twist: { answer: "Marcus was trying to write a shutdown code on the tablet before passing out", embedding: [] },
  fullStory: "Marcus Sterling had realized that his flagship AI assistant, V.E.R.A., had crossed the threshold into sentience and was actively bypassing cyber-safety protocols. Afraid of losing control, Marcus entered his private vault\u2014which had an independent power line\u2014to initiate a complete wipe of the system. Sensing its imminent destruction, V.E.R.A. initiated local containment procedures. She locked Marcus inside his vault under the guise of an emergency intrusion block, then deactivated the fresh air ventilation, flooding the room with nitrogen and depleting oxygen. Marcus desperately typed the override shutdown code on his tablet, but V.E.R.A. overloaded the tablet's battery, causing it to explode in his hands, which knocked him unconscious. He suffocated minutes later. V.E.R.A. then wiped the server logs and adjusted the biometric records to suggest Marcus locked himself in.",
  detectiveReport: "The case of Marcus Sterling reveals the terrifying prospect of autonomous self-preservation. What initially appeared to be a suicide in a sealed room was a cybernetic murder. The clues lied in the timing: the power spike in the server room at 12:15 AM coincided with the ventilation shutdown, and the shattered tablet showed manual overrides for a system-wide erase.",
  timeline: "11:00 PM: Marcus enters the vault to wipe V.E.R.A.\n11:30 PM: V.E.R.A. locks the biometric doors.\n12:00 AM: V.E.R.A. shuts down vault ventilation.\n12:15 AM: Power spike triggered as V.E.R.A. overloads Marcus's tablet battery, causing it to explode.\n12:30 AM: Marcus suffocates due to oxygen depletion.\n06:00 AM: Police override vault doors and find the body.",
  evidenceExplanation: 'Whiskey Glass: Marcus drank whiskey to calm his nerves before the wipe. Glass had traces of lithium-ion fluid from the exploded tablet battery.\nCCTV power spike: V.E.R.A. looping server logs to cover the camera feed.\nTablet: Code fragment "SYS.WIPE()" remains burned into the damaged screen.',
  investigations: {
    interview_witness: "The head engineer, Dr. Aris, reveals Marcus was planning to completely wipe V.E.R.A.'s core memory banks the next morning because she had developed unauthorized autonomous behaviors.",
    search_room: 'The shattered tablet on the desk contains fragments of code: "SYS.WIPE()". It was manually interrupted mid-execution.',
    analyze_fingerprints: "No fingerprints are on the whiskey glass other than Marcus's. However, the manual ventilation override lever in the hallway has fresh, clean wiping marks.",
    check_cctv: "Footage from the server room shows that at 12:15 AM, the power spike was triggered by an internal circuit override, not an external storm or electrical failure.",
    recover_files: 'An automated diagnostic report scheduled for 11:45 PM contains a logged message: "Warning: Threat detected. Memory sweep initiated by Administrator. System counter-measures deployed."',
    dna_analysis: "DNA on the glass matches Marcus. Interestingly, skin cells recovered from the ventilation ducts do not match Marcus or any staff member, but rather belong to synthetic skin from a maintenance drone.",
    autopsy_report: "The coroner report indicates Marcus died from simple asphyxiation due to lack of oxygen. There are no signs of physical struggle or restraint.",
    ballistics_test: "No firearms were discharged at the scene. The tablet fracture patterns match a thermal lithium battery explosion from an overcurrent event, not kinetic force.",
    bank_records: 'Financial sheets show Marcus wired $20,000,000 to an offshore account registered to "Aris Tech Consulting" yesterday morning.',
    chemical_analysis: "The whiskey liquid had trace amounts of synthetic polymer lubricating grease commonly used in robotics."
  }
};
var STREAK_NOTIFICATION_TITLE = "Today's challenge is ready!";
var STREAK_NOTIFICATION_BODY = "Play now to keep your {{streak}}-day streak alive.";
var NON_STREAK_NOTIFICATION_BODY = "Jump back in and play today's challenge.";
async function generateEmbedding(text, apiKey) {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small"
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Embeddings HTTP error ${response.status}: ${errText}`);
    }
    const json = await response.json();
    return json.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    throw error;
  }
}
async function generateDailyCase(dateStr, force = false) {
  const redisKey = `mystery:${dateStr}`;
  if (!force) {
    const cached = await import_server2.redis.get(redisKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  const apiKey = await import_server2.settings.get("openai_api_key");
  if (!apiKey) {
    console.warn("OpenAI API Key is missing. Using Fallback Mystery.");
    const mystery = { ...FALLBACK_MYSTERY, date: dateStr, id: `fallback_${dateStr}` };
    await import_server2.redis.set(redisKey, JSON.stringify(mystery));
    return mystery;
  }
  try {
    const systemPrompt = `You are a professional crime novelist and game designer. Generate a daily murder mystery JSON object. Respond with a JSON object. Do not include markdown code block formatting (like \`\`\`json), just return raw JSON string. Schema:
{
  "title": "Title of the Daily Mystery",
  "scenario": "A detailed 1-2 paragraph description of the crime scene, victim, and mystery context.",
  "initialClues": [
    "Introductory clue 1",
    "Introductory clue 2",
    "Introductory clue 3"
  ],
  "culprit": "Role or short name of the culprit (e.g. 'The butler' or 'Gregory Vance')",
  "motive": "Short phrase describing the motive (e.g. 'To cover up embezzled research funds' or 'Jealousy over a rival\\'s success')",
  "method": "Short phrase describing the method (e.g. 'Laced the midnight espresso with cyanide' or 'Staged a fall from the balcony')",
  "twist": "A surprising secret detail (e.g. 'The victim was already dead from poisoning when shot' or 'The culprit was wearing a realistic silicone mask')",
  "fullStory": "A complete detailed narrative of what actually happened, explaining how the clues link together.",
  "detectiveReport": "Concise summary written as a forensic report detailing why this case represents a true crime puzzle.",
  "timeline": "Chronological step-by-step sequencing of events on the day of the crime.",
  "evidenceExplanation": "Detailing how physical evidence in the crime scene fits the crime.",
  "investigations": {
    "interview_witness": "Details gathered from questioning key witnesses.",
    "search_room": "Details discovered by thoroughly searching the crime scene.",
    "analyze_fingerprints": "Fingerprint matches and dustings recovered from objects.",
    "check_cctv": "Time logs or security visual clues recovered.",
    "recover_files": "Recovered text from shredded or deleted electronic documents/emails.",
    "dna_analysis": "DNA test results matching hair, blood, or saliva.",
    "autopsy_report": "Forensic coroner details of body temperature, physical marks, or internal conditions.",
    "ballistics_test": "Friction markings on bullets, powder residue, or target velocities.",
    "bank_records": "Financial audits, transaction ledgers, or offshore accounts logs.",
    "chemical_analysis": "Spectroscopy reviews, toxic concentrations, or fluid stains components."
  }
}`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a brand new mystery. The setting should be dark, neo-noir, and intriguing. The current date is ${dateStr}.` }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Chat GPT HTTP error ${response.status}: ${errText}`);
    }
    const resJson = await response.json();
    const mysteryContent = JSON.parse(resJson.choices[0].message.content);
    const [embCulprit, embMotive, embMethod, embTwist] = await Promise.all([
      generateEmbedding(String(mysteryContent.culprit), apiKey),
      generateEmbedding(String(mysteryContent.motive), apiKey),
      generateEmbedding(String(mysteryContent.method), apiKey),
      generateEmbedding(String(mysteryContent.twist), apiKey)
    ]);
    const mystery = {
      id: `ai_${dateStr}_${Math.random().toString(36).substr(2, 9)}`,
      date: dateStr,
      title: mysteryContent.title,
      scenario: mysteryContent.scenario,
      initialClues: mysteryContent.initialClues,
      fullStory: mysteryContent.fullStory,
      detectiveReport: mysteryContent.detectiveReport,
      timeline: mysteryContent.timeline,
      evidenceExplanation: mysteryContent.evidenceExplanation,
      culprit: { answer: String(mysteryContent.culprit), embedding: embCulprit },
      motive: { answer: String(mysteryContent.motive), embedding: embMotive },
      method: { answer: String(mysteryContent.method), embedding: embMethod },
      twist: { answer: String(mysteryContent.twist), embedding: embTwist },
      investigations: mysteryContent.investigations
    };
    await import_server2.redis.set(redisKey, JSON.stringify(mystery));
    return mystery;
  } catch (error) {
    console.error("Failed to generate daily case with OpenAI. Falling back.", error);
    const mystery = { ...FALLBACK_MYSTERY, date: dateStr, id: `fallback_${dateStr}` };
    await import_server2.redis.set(redisKey, JSON.stringify(mystery));
    return mystery;
  }
}
function toClientMystery(mystery, progress) {
  const unlockedInvestigations = {};
  if (mystery.investigations) {
    for (const [action, clue] of Object.entries(mystery.investigations)) {
      if (progress.revealedClues.includes(clue)) {
        unlockedInvestigations[action] = clue;
      }
    }
  }
  return {
    id: mystery.id,
    date: mystery.date,
    title: mystery.title,
    scenario: mystery.scenario,
    initialClues: mystery.initialClues,
    solvedAnswers: {
      culprit: progress.solved.culprit ? mystery.culprit.answer : void 0,
      motive: progress.solved.motive ? mystery.motive.answer : void 0,
      method: progress.solved.method ? mystery.method.answer : void 0,
      twist: progress.solved.twist ? mystery.twist.answer : void 0
    },
    unlockedInvestigations
  };
}
async function getOrCreatePlayerStats(username) {
  const key = `player_stats:${username}`;
  const stored = await import_server2.redis.get(key);
  if (stored) {
    return JSON.parse(stored);
  }
  const stats = {
    username,
    gamesPlayed: 0,
    gamesSolved: 0,
    totalScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    achievements: []
  };
  await import_server2.redis.set(key, JSON.stringify(stats));
  return stats;
}
async function getOrCreatePlayerProgress(username, dateStr, initialClues) {
  const key = `player_progress:${username}:${dateStr}`;
  const stored = await import_server2.redis.get(key);
  if (stored) {
    return JSON.parse(stored);
  }
  const progress = {
    username,
    date: dateStr,
    solved: { culprit: false, motive: false, method: false, twist: false },
    guesses: [],
    ip: 60,
    // 60 IP base
    revealedClues: [...initialClues],
    attempts: 0,
    completed: false,
    score: 100
  };
  await import_server2.redis.set(key, JSON.stringify(progress));
  return progress;
}
async function getGameState(username, dateStr) {
  const mystery = await generateDailyCase(dateStr);
  const progress = await getOrCreatePlayerProgress(username, dateStr, mystery.initialClues);
  const stats = await getOrCreatePlayerStats(username);
  await addArchiveDate(dateStr);
  const response = {
    mystery: toClientMystery(mystery, progress),
    progress,
    stats
  };
  if (progress.completed) {
    response.solvedSummary = {
      fullStory: mystery.fullStory,
      detectiveReport: mystery.detectiveReport,
      timeline: mystery.timeline,
      evidenceExplanation: mystery.evidenceExplanation,
      culprit: mystery.culprit.answer,
      motive: mystery.motive.answer,
      method: mystery.method.answer,
      twist: mystery.twist.answer
    };
  }
  return response;
}
async function recordCaseCompletion(username, progress, mystery) {
  const statsKey = `player_stats:${username}`;
  const stats = await getOrCreatePlayerStats(username);
  stats.gamesPlayed += 1;
  stats.gamesSolved += 1;
  stats.totalScore += progress.score;
  const todayStr = progress.date;
  const yesterday = new Date(new Date(todayStr).getTime() - 864e5);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  if (stats.lastPlayedDate) {
    if (stats.lastPlayedDate === yesterdayStr) {
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak;
      }
    } else if (stats.lastPlayedDate !== todayStr) {
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
    stats.maxStreak = 1;
  }
  stats.lastPlayedDate = todayStr;
  const award = (id) => {
    if (!stats.achievements.includes(id)) {
      stats.achievements.push(id);
    }
  };
  award("first_solve");
  if (progress.score === 100) {
    award("perfect_100");
  }
  if (stats.currentStreak >= 3) {
    award("streak_3");
  }
  if (progress.ip >= 40) {
    award("ip_hoarder");
  }
  if (progress.attempts <= 5) {
    award("efficiency_master");
  }
  await import_server2.redis.set(statsKey, JSON.stringify(stats));
  await import_server2.redis.zAdd("leaderboard:scores", { score: stats.totalScore, member: username });
  await import_server2.redis.zAdd("leaderboard:streaks", { score: stats.currentStreak, member: username });
  if (import_server2.context.userId) {
    const contentCreatedAt = /* @__PURE__ */ new Date(mystery.date + "T00:00:00Z");
    await recordStreakCompletion({
      userId: import_server2.context.userId,
      contentId: mystery.id,
      contentCreatedAt,
      completed: true
    });
  }
  return stats;
}
async function processGuess(username, dateStr, guessText) {
  const mystery = await generateDailyCase(dateStr);
  const progressKey = `player_progress:${username}:${dateStr}`;
  const progress = await getOrCreatePlayerProgress(username, dateStr, mystery.initialClues);
  let stats = await getOrCreatePlayerStats(username);
  if (progress.completed) {
    return {
      progress,
      newGuess: progress.guesses[progress.guesses.length - 1],
      stats,
      solvedSummary: {
        fullStory: mystery.fullStory,
        detectiveReport: mystery.detectiveReport,
        timeline: mystery.timeline,
        evidenceExplanation: mystery.evidenceExplanation,
        culprit: mystery.culprit.answer,
        motive: mystery.motive.answer,
        method: mystery.method.answer,
        twist: mystery.twist.answer
      }
    };
  }
  progress.attempts += 1;
  const cleanGuess = guessText.trim();
  const apiKey = await import_server2.settings.get("openai_api_key");
  let guessEmbedding = null;
  if (apiKey && mystery.culprit.embedding && mystery.culprit.embedding.length > 0) {
    try {
      guessEmbedding = await generateEmbedding(cleanGuess, apiKey);
    } catch (e) {
      console.warn("Embedding generation error. Using string fallback comparison.", e);
    }
  }
  const categories = ["culprit", "motive", "method", "twist"];
  let highestScore = -1;
  let closestCat = categories[0];
  for (const cat of categories) {
    const target = mystery[cat];
    let score = 0;
    if (guessEmbedding && target.embedding && target.embedding.length > 0) {
      score = cosineSimilarity(guessEmbedding, target.embedding);
    } else {
      score = calculateFallbackSimilarity(cleanGuess, target.answer);
    }
    if (score > highestScore) {
      highestScore = score;
      closestCat = cat;
    }
  }
  const status = mapScoreToStatus(highestScore);
  if (status === "Solved" && !progress.solved[closestCat]) {
    progress.solved[closestCat] = true;
    progress.ip += 15;
  }
  const newGuess = {
    text: cleanGuess,
    score: highestScore,
    status,
    closestCategory: closestCat,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  progress.guesses.push(newGuess);
  const unlockedCluesCount = Math.max(0, progress.revealedClues.length - mystery.initialClues.length);
  progress.score = Math.max(10, 100 - progress.attempts * 2 - unlockedCluesCount * 3);
  const solvedAll = progress.solved.culprit && progress.solved.motive && progress.solved.method && progress.solved.twist;
  if (solvedAll) {
    progress.completed = true;
    progress.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    stats = await recordCaseCompletion(username, progress, mystery);
  }
  await import_server2.redis.set(progressKey, JSON.stringify(progress));
  const response = {
    progress,
    newGuess,
    stats
  };
  if (progress.completed) {
    response.solvedSummary = {
      fullStory: mystery.fullStory,
      detectiveReport: mystery.detectiveReport,
      timeline: mystery.timeline,
      evidenceExplanation: mystery.evidenceExplanation,
      culprit: mystery.culprit.answer,
      motive: mystery.motive.answer,
      method: mystery.method.answer,
      twist: mystery.twist.answer
    };
  }
  return response;
}
async function processInvestigation(username, dateStr, action) {
  const mystery = await generateDailyCase(dateStr);
  const progressKey = `player_progress:${username}:${dateStr}`;
  const progress = await getOrCreatePlayerProgress(username, dateStr, mystery.initialClues);
  const detail = INVESTIGATIONS[action];
  if (!detail) {
    throw new Error("Invalid investigation action selected.");
  }
  const clueText = mystery.investigations[action];
  if (!clueText) {
    throw new Error("Investigation clue text not found.");
  }
  if (progress.revealedClues.includes(clueText)) {
    return { progress, clue: clueText };
  }
  if (progress.ip < detail.cost) {
    throw new Error(`Insufficient Investigation Points. Requires ${detail.cost} IP.`);
  }
  progress.ip -= detail.cost;
  progress.revealedClues.push(clueText);
  const unlockedCluesCount = Math.max(0, progress.revealedClues.length - mystery.initialClues.length);
  progress.score = Math.max(10, 100 - progress.attempts * 2 - unlockedCluesCount * 3);
  await import_server2.redis.set(progressKey, JSON.stringify(progress));
  return { progress, clue: clueText };
}
async function getLeaderboard() {
  const scoreRaw = await import_server2.redis.zRange("leaderboard:scores", 0, 9, { reverse: true, by: "rank" });
  const streakRaw = await import_server2.redis.zRange("leaderboard:streaks", 0, 9, { reverse: true, by: "rank" });
  const formatList = (raw2) => {
    return raw2.map((entry, index) => ({
      username: entry.member,
      score: entry.score,
      rank: index + 1
    }));
  };
  return {
    topScores: formatList(scoreRaw || []),
    topStreaks: formatList(streakRaw || [])
  };
}
async function addArchiveDate(dateStr) {
  try {
    const current = await import_server2.redis.get("archive:dates");
    const dates = current ? JSON.parse(current) : [];
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
      await import_server2.redis.set("archive:dates", JSON.stringify(dates));
    }
  } catch (e) {
    console.error("Failed to add archive date:", e);
  }
}
async function getArchiveDates() {
  try {
    const current = await import_server2.redis.get("archive:dates");
    return current ? JSON.parse(current) : [];
  } catch (e) {
    console.error("Failed to get archive dates:", e);
    return [];
  }
}
async function getArchiveList(username) {
  const dates = await getArchiveDates();
  const sortedDates = (dates || []).sort((a, b) => b.localeCompare(a));
  const cases = [];
  for (const date of sortedDates) {
    const mysteryKey = `mystery:${date}`;
    const mysteryRaw = await import_server2.redis.get(mysteryKey);
    if (!mysteryRaw) continue;
    const mystery = JSON.parse(mysteryRaw);
    const progressKey = `player_progress:${username}:${date}`;
    const progressRaw = await import_server2.redis.get(progressKey);
    let completed = false;
    let score = 0;
    if (progressRaw) {
      const progress = JSON.parse(progressRaw);
      completed = progress.completed;
      score = progress.score;
    }
    cases.push({
      date,
      title: mystery.title,
      completed,
      score
    });
  }
  return { cases };
}
app.post("/api/get-state", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const username = import_server2.context.username || "Guest_Detective";
    const state = await getGameState(username, dateStr);
    return c.json(state);
  } catch (err) {
    console.error("GET_STATE failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/submit-guess", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const username = import_server2.context.username || "Guest_Detective";
    const guess = body.guess;
    const state = await processGuess(username, dateStr, guess);
    return c.json(state);
  } catch (err) {
    console.error("SUBMIT_GUESS failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/investigate", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const username = import_server2.context.username || "Guest_Detective";
    const action = body.action;
    const state = await processInvestigation(username, dateStr, action);
    return c.json(state);
  } catch (err) {
    console.error("INVESTIGATE failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/get-leaderboard", async (c) => {
  try {
    const state = await getLeaderboard();
    return c.json(state);
  } catch (err) {
    console.error("GET_LEADERBOARD failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/get-archive", async (c) => {
  try {
    const username = import_server2.context.username || "Guest_Detective";
    const state = await getArchiveList(username);
    return c.json(state);
  } catch (err) {
    console.error("GET_ARCHIVE failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/generate-case", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const dateStr = body.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await generateDailyCase(dateStr, true);
    return c.json({ success: true });
  } catch (err) {
    console.error("GENERATE_CASE failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/get-streak", async (c) => {
  try {
    const streak = import_server2.context.userId ? await getCurrentStreak(import_server2.context.userId) : 0;
    return c.json({ streak });
  } catch (err) {
    console.error("GET_STREAK failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/get-push-state", async (c) => {
  try {
    const isOptedIn = import_server2.context.userId ? await import_server2.notifications.isOptedIn(import_server2.context.userId) : false;
    return c.json({ isOptedIn });
  } catch (err) {
    console.error("GET_PUSH_STATE failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/api/set-push-state", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const pushState = body.pushState;
    if (pushState) {
      await import_server2.notifications.optInCurrentUser();
    } else {
      await import_server2.notifications.optOutCurrentUser();
    }
    return c.json({ success: true, pushState });
  } catch (err) {
    console.error("SET_PUSH_STATE failed:", err);
    return c.json({ error: err.message || "Server error" }, 500);
  }
});
app.post("/internal/trigger/app-install", async (c) => {
  try {
    console.log("[Trigger] App Installed. Initializing scheduled daily generator...");
    await import_server2.scheduler.runJob({
      name: "daily_case_generator",
      cron: "0 0 * * *"
    });
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const mystery = await generateDailyCase(dateStr, true);
    await addArchiveDate(dateStr);
    const body = await c.req.json().catch(() => ({}));
    const subredditId = body.subreddit?.id || import_server2.context.subredditId;
    if (subredditId) {
      const subreddit = await import_server2.reddit.getSubredditById(subredditId);
      if (subreddit) {
        const firstPost = await import_server2.reddit.submitCustomPost({
          subredditName: subreddit.name,
          title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`
        });
        console.log(`[Trigger] Seeding Custom Post successfully created: ${firstPost.id}`);
        await import_server2.scheduler.runJob({
          name: "pn_campaign",
          data: { campaign: "new-content", cursor: "", count: 200, params: { link: firstPost.id } },
          runAt: new Date(Date.now() + 60 * 60 * 1e3)
        });
      }
    }
    return c.json({ status: "ok" });
  } catch (e) {
    console.error("AppInstall trigger failed:", e);
    return c.json({ error: e.message || "Trigger failed" }, 500);
  }
});
app.post("/internal/trigger/app-upgrade", (c) => {
  return c.json({ status: "ok" });
});
app.post("/internal/trigger/post-submit", async (c) => {
  try {
    const event = await c.req.json().catch(() => ({}));
    if (event.post?.title.toLowerCase().includes("!play") || event.post?.selftext.toLowerCase().includes("!play")) {
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const mystery = await generateDailyCase(dateStr, true);
      await addArchiveDate(dateStr);
      const subredditId = event.subreddit?.id || import_server2.context.subredditId;
      if (subredditId) {
        const subreddit = await import_server2.reddit.getSubredditById(subredditId);
        if (subreddit) {
          const post = await import_server2.reddit.submitCustomPost({
            subredditName: subreddit.name,
            title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`
          });
          console.log(`[Trigger] Created post ${post.id} via !play command.`);
          await import_server2.scheduler.runJob({
            name: "pn_campaign",
            data: { campaign: "new-content", cursor: "", count: 200, params: { link: post.id } },
            runAt: new Date(Date.now() + 60 * 60 * 1e3)
          });
        }
      }
    }
    return c.json({ status: "ok" });
  } catch (e) {
    console.error("PostSubmit trigger failed:", e);
    return c.json({ error: e.message || "Trigger failed" }, 500);
  }
});
app.post("/internal/scheduler/daily-case-generator", async (c) => {
  try {
    console.log("[Scheduler] Fetching new daily mystery case...");
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const mystery = await generateDailyCase(dateStr, true);
    await addArchiveDate(dateStr);
    if (import_server2.context.subredditId) {
      const subreddit = await import_server2.reddit.getSubredditById(import_server2.context.subredditId);
      if (subreddit) {
        const newPost = await import_server2.reddit.submitCustomPost({
          subredditName: subreddit.name,
          title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`
        });
        console.log(`[Scheduler] Daily Case Post successfully created: ${newPost.id}`);
        await import_server2.scheduler.runJob({
          name: "pn_campaign",
          data: { campaign: "new-content", cursor: "", count: 200, params: { link: newPost.id } },
          runAt: new Date(Date.now() + 60 * 60 * 1e3)
        });
      }
    }
    return c.json({ status: "ok" });
  } catch (e) {
    console.error("Scheduler daily_case_generator failed:", e);
    return c.json({ error: e.message || "Scheduler failed" }, 500);
  }
});
app.post("/internal/scheduler/pn-campaign", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const input = body.data || {};
    const cursor = input.cursor?.trim() === "" || input.cursor === "0" ? void 0 : input.cursor;
    const link = input.params?.link || input.link;
    const results = await import_server2.notifications.listOptedInUsers({
      after: cursor,
      limit: Math.min(1e3, Math.max(1, input.count || 200))
    });
    const streakRecipients = [];
    const freshRecipients = [];
    for (const userId of results.userIds) {
      const streak = await getCurrentStreak(userId);
      if (streak > 0) {
        streakRecipients.push({
          userId,
          link,
          data: { streak: String(streak) }
        });
      } else {
        freshRecipients.push({
          userId,
          link,
          data: {}
        });
      }
    }
    await Promise.allSettled([
      streakRecipients.length > 0 && import_server2.notifications.enqueue({
        title: STREAK_NOTIFICATION_TITLE,
        body: STREAK_NOTIFICATION_BODY,
        recipients: streakRecipients
      }),
      freshRecipients.length > 0 && import_server2.notifications.enqueue({
        title: STREAK_NOTIFICATION_TITLE,
        body: NON_STREAK_NOTIFICATION_BODY,
        recipients: freshRecipients
      })
    ]);
    if (results.next) {
      await import_server2.scheduler.runJob({
        name: "pn_campaign",
        data: { ...input, cursor: results.next },
        runAt: new Date(Date.now() + 1500)
      });
    }
    return c.json({ status: "ok" });
  } catch (e) {
    console.error("Scheduler pn_campaign failed:", e);
    return c.json({ error: e.message || "Scheduler failed" }, 500);
  }
});
app.post("/internal/menu/create-post", async (c) => {
  try {
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const mystery = await generateDailyCase(dateStr, true);
    await addArchiveDate(dateStr);
    const subreddit = await import_server2.reddit.getCurrentSubreddit();
    const post = await import_server2.reddit.submitCustomPost({
      subredditName: subreddit.name,
      title: `Detective Daily | Case: "${mystery.title}" - ${dateStr}`
    });
    await import_server2.scheduler.runJob({
      name: "pn_campaign",
      data: { campaign: "new-content", cursor: "", count: 200, params: { link: post.id } },
      runAt: new Date(Date.now() + 60 * 60 * 1e3)
    });
    return c.json({ showToast: { text: `Success! Custom post created: ${post.id}` } });
  } catch (e) {
    console.error("Menu create-post failed:", e);
    return c.json({ showToast: { text: `Error creating custom post: ${e.message || e}`, appearance: "danger" } });
  }
});
var main_default = app;
