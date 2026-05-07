import { r as reactExports, j as jsxRuntimeExports, u as useI18n, b as buildAssetUrl, a as useSession, N as NodeGraphThumbnail, c as useHistory, R as React, d as requireReactDom, g as getDefaultExportFromCjs, e as React2, f as clientExports, I as I18nProvider } from "./NodeGraphThumbnail-CMPs-VBu.js";
var PopStateEventType = "popstate";
function isLocation(obj) {
  return typeof obj === "object" && obj != null && "pathname" in obj && "search" in obj && "hash" in obj && "state" in obj && "key" in obj;
}
function createBrowserHistory(options = {}) {
  function createBrowserLocation(window2, globalHistory) {
    let maskedLocation = globalHistory.state?.masked;
    let { pathname, search, hash } = maskedLocation || window2.location;
    return createLocation(
      "",
      { pathname, search, hash },
      // state defaults to `null` because `window.history.state` does
      globalHistory.state && globalHistory.state.usr || null,
      globalHistory.state && globalHistory.state.key || "default",
      maskedLocation ? {
        pathname: window2.location.pathname,
        search: window2.location.search,
        hash: window2.location.hash
      } : void 0
    );
  }
  function createBrowserHref(window2, to) {
    return typeof to === "string" ? to : createPath(to);
  }
  return getUrlBasedHistory(
    createBrowserLocation,
    createBrowserHref,
    null,
    options
  );
}
function invariant(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function warning(cond, message) {
  if (!cond) {
    if (typeof console !== "undefined") console.warn(message);
    try {
      throw new Error(message);
    } catch (e) {
    }
  }
}
function createKey() {
  return Math.random().toString(36).substring(2, 10);
}
function getHistoryState(location, index2) {
  return {
    usr: location.state,
    key: location.key,
    idx: index2,
    masked: location.unstable_mask ? {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash
    } : void 0
  };
}
function createLocation(current, to, state = null, key, unstable_mask) {
  let location = {
    pathname: typeof current === "string" ? current : current.pathname,
    search: "",
    hash: "",
    ...typeof to === "string" ? parsePath(to) : to,
    state,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: to && to.key || key || createKey(),
    unstable_mask
  };
  return location;
}
function createPath({
  pathname = "/",
  search = "",
  hash = ""
}) {
  if (search && search !== "?")
    pathname += search.charAt(0) === "?" ? search : "?" + search;
  if (hash && hash !== "#")
    pathname += hash.charAt(0) === "#" ? hash : "#" + hash;
  return pathname;
}
function parsePath(path) {
  let parsedPath = {};
  if (path) {
    let hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      parsedPath.hash = path.substring(hashIndex);
      path = path.substring(0, hashIndex);
    }
    let searchIndex = path.indexOf("?");
    if (searchIndex >= 0) {
      parsedPath.search = path.substring(searchIndex);
      path = path.substring(0, searchIndex);
    }
    if (path) {
      parsedPath.pathname = path;
    }
  }
  return parsedPath;
}
function getUrlBasedHistory(getLocation, createHref2, validateLocation, options = {}) {
  let { window: window2 = document.defaultView, v5Compat = false } = options;
  let globalHistory = window2.history;
  let action = "POP";
  let listener = null;
  let index2 = getIndex();
  if (index2 == null) {
    index2 = 0;
    globalHistory.replaceState({ ...globalHistory.state, idx: index2 }, "");
  }
  function getIndex() {
    let state = globalHistory.state || { idx: null };
    return state.idx;
  }
  function handlePop() {
    action = "POP";
    let nextIndex = getIndex();
    let delta = nextIndex == null ? null : nextIndex - index2;
    index2 = nextIndex;
    if (listener) {
      listener({ action, location: history.location, delta });
    }
  }
  function push(to, state) {
    action = "PUSH";
    let location = isLocation(to) ? to : createLocation(history.location, to, state);
    index2 = getIndex() + 1;
    let historyState = getHistoryState(location, index2);
    let url = history.createHref(location.unstable_mask || location);
    try {
      globalHistory.pushState(historyState, "", url);
    } catch (error) {
      if (error instanceof DOMException && error.name === "DataCloneError") {
        throw error;
      }
      window2.location.assign(url);
    }
    if (v5Compat && listener) {
      listener({ action, location: history.location, delta: 1 });
    }
  }
  function replace2(to, state) {
    action = "REPLACE";
    let location = isLocation(to) ? to : createLocation(history.location, to, state);
    index2 = getIndex();
    let historyState = getHistoryState(location, index2);
    let url = history.createHref(location.unstable_mask || location);
    globalHistory.replaceState(historyState, "", url);
    if (v5Compat && listener) {
      listener({ action, location: history.location, delta: 0 });
    }
  }
  function createURL(to) {
    return createBrowserURLImpl(to);
  }
  let history = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window2, globalHistory);
    },
    listen(fn) {
      if (listener) {
        throw new Error("A history only accepts one active listener");
      }
      window2.addEventListener(PopStateEventType, handlePop);
      listener = fn;
      return () => {
        window2.removeEventListener(PopStateEventType, handlePop);
        listener = null;
      };
    },
    createHref(to) {
      return createHref2(window2, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash
      };
    },
    push,
    replace: replace2,
    go(n) {
      return globalHistory.go(n);
    }
  };
  return history;
}
function createBrowserURLImpl(to, isAbsolute = false) {
  let base = "http://localhost";
  if (typeof window !== "undefined") {
    base = window.location.origin !== "null" ? window.location.origin : window.location.href;
  }
  invariant(base, "No window.location.(origin|href) available to create URL");
  let href = typeof to === "string" ? to : createPath(to);
  href = href.replace(/ $/, "%20");
  if (!isAbsolute && href.startsWith("//")) {
    href = base + href;
  }
  return new URL(href, base);
}
function matchRoutes(routes, locationArg, basename = "/") {
  return matchRoutesImpl(routes, locationArg, basename, false);
}
function matchRoutesImpl(routes, locationArg, basename, allowPartial) {
  let location = typeof locationArg === "string" ? parsePath(locationArg) : locationArg;
  let pathname = stripBasename(location.pathname || "/", basename);
  if (pathname == null) {
    return null;
  }
  let branches = flattenRoutes(routes);
  rankRouteBranches(branches);
  let matches = null;
  for (let i = 0; matches == null && i < branches.length; ++i) {
    let decoded = decodePath(pathname);
    matches = matchRouteBranch(
      branches[i],
      decoded,
      allowPartial
    );
  }
  return matches;
}
function flattenRoutes(routes, branches = [], parentsMeta = [], parentPath = "", _hasParentOptionalSegments = false) {
  let flattenRoute = (route, index2, hasParentOptionalSegments = _hasParentOptionalSegments, relativePath) => {
    let meta = {
      relativePath: relativePath === void 0 ? route.path || "" : relativePath,
      caseSensitive: route.caseSensitive === true,
      childrenIndex: index2,
      route
    };
    if (meta.relativePath.startsWith("/")) {
      if (!meta.relativePath.startsWith(parentPath) && hasParentOptionalSegments) {
        return;
      }
      invariant(
        meta.relativePath.startsWith(parentPath),
        `Absolute route path "${meta.relativePath}" nested under path "${parentPath}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`
      );
      meta.relativePath = meta.relativePath.slice(parentPath.length);
    }
    let path = joinPaths([parentPath, meta.relativePath]);
    let routesMeta = parentsMeta.concat(meta);
    if (route.children && route.children.length > 0) {
      invariant(
        // Our types know better, but runtime JS may not!
        // @ts-expect-error
        route.index !== true,
        `Index routes must not have child routes. Please remove all child routes from route path "${path}".`
      );
      flattenRoutes(
        route.children,
        branches,
        routesMeta,
        path,
        hasParentOptionalSegments
      );
    }
    if (route.path == null && !route.index) {
      return;
    }
    branches.push({
      path,
      score: computeScore(path, route.index),
      routesMeta
    });
  };
  routes.forEach((route, index2) => {
    if (route.path === "" || !route.path?.includes("?")) {
      flattenRoute(route, index2);
    } else {
      for (let exploded of explodeOptionalSegments(route.path)) {
        flattenRoute(route, index2, true, exploded);
      }
    }
  });
  return branches;
}
function explodeOptionalSegments(path) {
  let segments = path.split("/");
  if (segments.length === 0) return [];
  let [first, ...rest] = segments;
  let isOptional = first.endsWith("?");
  let required = first.replace(/\?$/, "");
  if (rest.length === 0) {
    return isOptional ? [required, ""] : [required];
  }
  let restExploded = explodeOptionalSegments(rest.join("/"));
  let result = [];
  result.push(
    ...restExploded.map(
      (subpath) => subpath === "" ? required : [required, subpath].join("/")
    )
  );
  if (isOptional) {
    result.push(...restExploded);
  }
  return result.map(
    (exploded) => path.startsWith("/") && exploded === "" ? "/" : exploded
  );
}
function rankRouteBranches(branches) {
  branches.sort(
    (a, b) => a.score !== b.score ? b.score - a.score : compareIndexes(
      a.routesMeta.map((meta) => meta.childrenIndex),
      b.routesMeta.map((meta) => meta.childrenIndex)
    )
  );
}
var paramRe = /^:[\w-]+$/;
var dynamicSegmentValue = 3;
var indexRouteValue = 2;
var emptySegmentValue = 1;
var staticSegmentValue = 10;
var splatPenalty = -2;
var isSplat = (s) => s === "*";
function computeScore(path, index2) {
  let segments = path.split("/");
  let initialScore = segments.length;
  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }
  if (index2) {
    initialScore += indexRouteValue;
  }
  return segments.filter((s) => !isSplat(s)).reduce(
    (score, segment) => score + (paramRe.test(segment) ? dynamicSegmentValue : segment === "" ? emptySegmentValue : staticSegmentValue),
    initialScore
  );
}
function compareIndexes(a, b) {
  let siblings = a.length === b.length && a.slice(0, -1).every((n, i) => n === b[i]);
  return siblings ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    a[a.length - 1] - b[b.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function matchRouteBranch(branch, pathname, allowPartial = false) {
  let { routesMeta } = branch;
  let matchedParams = {};
  let matchedPathname = "/";
  let matches = [];
  for (let i = 0; i < routesMeta.length; ++i) {
    let meta = routesMeta[i];
    let end = i === routesMeta.length - 1;
    let remainingPathname = matchedPathname === "/" ? pathname : pathname.slice(matchedPathname.length) || "/";
    let match = matchPath(
      { path: meta.relativePath, caseSensitive: meta.caseSensitive, end },
      remainingPathname
    );
    let route = meta.route;
    if (!match && end && allowPartial && !routesMeta[routesMeta.length - 1].route.index) {
      match = matchPath(
        {
          path: meta.relativePath,
          caseSensitive: meta.caseSensitive,
          end: false
        },
        remainingPathname
      );
    }
    if (!match) {
      return null;
    }
    Object.assign(matchedParams, match.params);
    matches.push({
      // TODO: Can this as be avoided?
      params: matchedParams,
      pathname: joinPaths([matchedPathname, match.pathname]),
      pathnameBase: normalizePathname(
        joinPaths([matchedPathname, match.pathnameBase])
      ),
      route
    });
    if (match.pathnameBase !== "/") {
      matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
    }
  }
  return matches;
}
function matchPath(pattern, pathname) {
  if (typeof pattern === "string") {
    pattern = { path: pattern, caseSensitive: false, end: true };
  }
  let [matcher, compiledParams] = compilePath(
    pattern.path,
    pattern.caseSensitive,
    pattern.end
  );
  let match = pathname.match(matcher);
  if (!match) return null;
  let matchedPathname = match[0];
  let pathnameBase = matchedPathname.replace(/(.)\/+$/, "$1");
  let captureGroups = match.slice(1);
  let params = compiledParams.reduce(
    (memo2, { paramName, isOptional }, index2) => {
      if (paramName === "*") {
        let splatValue = captureGroups[index2] || "";
        pathnameBase = matchedPathname.slice(0, matchedPathname.length - splatValue.length).replace(/(.)\/+$/, "$1");
      }
      const value = captureGroups[index2];
      if (isOptional && !value) {
        memo2[paramName] = void 0;
      } else {
        memo2[paramName] = (value || "").replace(/%2F/g, "/");
      }
      return memo2;
    },
    {}
  );
  return {
    params,
    pathname: matchedPathname,
    pathnameBase,
    pattern
  };
}
function compilePath(path, caseSensitive = false, end = true) {
  warning(
    path === "*" || !path.endsWith("*") || path.endsWith("/*"),
    `Route path "${path}" will be treated as if it were "${path.replace(/\*$/, "/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${path.replace(/\*$/, "/*")}".`
  );
  let params = [];
  let regexpSource = "^" + path.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(
    /\/:([\w-]+)(\?)?/g,
    (match, paramName, isOptional, index2, str) => {
      params.push({ paramName, isOptional: isOptional != null });
      if (isOptional) {
        let nextChar = str.charAt(index2 + match.length);
        if (nextChar && nextChar !== "/") {
          return "/([^\\/]*)";
        }
        return "(?:/([^\\/]*))?";
      }
      return "/([^\\/]+)";
    }
  ).replace(/\/([\w-]+)\?(\/|$)/g, "(/$1)?$2");
  if (path.endsWith("*")) {
    params.push({ paramName: "*" });
    regexpSource += path === "*" || path === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$";
  } else if (end) {
    regexpSource += "\\/*$";
  } else if (path !== "" && path !== "/") {
    regexpSource += "(?:(?=\\/|$))";
  } else ;
  let matcher = new RegExp(regexpSource, caseSensitive ? void 0 : "i");
  return [matcher, params];
}
function decodePath(value) {
  try {
    return value.split("/").map((v) => decodeURIComponent(v).replace(/\//g, "%2F")).join("/");
  } catch (error) {
    warning(
      false,
      `The URL path "${value}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${error}).`
    );
    return value;
  }
}
function stripBasename(pathname, basename) {
  if (basename === "/") return pathname;
  if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
    return null;
  }
  let startIndex = basename.endsWith("/") ? basename.length - 1 : basename.length;
  let nextChar = pathname.charAt(startIndex);
  if (nextChar && nextChar !== "/") {
    return null;
  }
  return pathname.slice(startIndex) || "/";
}
var ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
function resolvePath(to, fromPathname = "/") {
  let {
    pathname: toPathname,
    search = "",
    hash = ""
  } = typeof to === "string" ? parsePath(to) : to;
  let pathname;
  if (toPathname) {
    toPathname = removeDoubleSlashes(toPathname);
    if (toPathname.startsWith("/")) {
      pathname = resolvePathname(toPathname.substring(1), "/");
    } else {
      pathname = resolvePathname(toPathname, fromPathname);
    }
  } else {
    pathname = fromPathname;
  }
  return {
    pathname,
    search: normalizeSearch(search),
    hash: normalizeHash(hash)
  };
}
function resolvePathname(relativePath, fromPathname) {
  let segments = removeTrailingSlash(fromPathname).split("/");
  let relativeSegments = relativePath.split("/");
  relativeSegments.forEach((segment) => {
    if (segment === "..") {
      if (segments.length > 1) segments.pop();
    } else if (segment !== ".") {
      segments.push(segment);
    }
  });
  return segments.length > 1 ? segments.join("/") : "/";
}
function getInvalidPathError(char, field, dest, path) {
  return `Cannot include a '${char}' character in a manually specified \`to.${field}\` field [${JSON.stringify(
    path
  )}].  Please separate it out to the \`to.${dest}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function getPathContributingMatches(matches) {
  return matches.filter(
    (match, index2) => index2 === 0 || match.route.path && match.route.path.length > 0
  );
}
function getResolveToMatches(matches) {
  let pathMatches = getPathContributingMatches(matches);
  return pathMatches.map(
    (match, idx) => idx === pathMatches.length - 1 ? match.pathname : match.pathnameBase
  );
}
function resolveTo(toArg, routePathnames, locationPathname, isPathRelative = false) {
  let to;
  if (typeof toArg === "string") {
    to = parsePath(toArg);
  } else {
    to = { ...toArg };
    invariant(
      !to.pathname || !to.pathname.includes("?"),
      getInvalidPathError("?", "pathname", "search", to)
    );
    invariant(
      !to.pathname || !to.pathname.includes("#"),
      getInvalidPathError("#", "pathname", "hash", to)
    );
    invariant(
      !to.search || !to.search.includes("#"),
      getInvalidPathError("#", "search", "hash", to)
    );
  }
  let isEmptyPath = toArg === "" || to.pathname === "";
  let toPathname = isEmptyPath ? "/" : to.pathname;
  let from;
  if (toPathname == null) {
    from = locationPathname;
  } else {
    let routePathnameIndex = routePathnames.length - 1;
    if (!isPathRelative && toPathname.startsWith("..")) {
      let toSegments = toPathname.split("/");
      while (toSegments[0] === "..") {
        toSegments.shift();
        routePathnameIndex -= 1;
      }
      to.pathname = toSegments.join("/");
    }
    from = routePathnameIndex >= 0 ? routePathnames[routePathnameIndex] : "/";
  }
  let path = resolvePath(to, from);
  let hasExplicitTrailingSlash = toPathname && toPathname !== "/" && toPathname.endsWith("/");
  let hasCurrentTrailingSlash = (isEmptyPath || toPathname === ".") && locationPathname.endsWith("/");
  if (!path.pathname.endsWith("/") && (hasExplicitTrailingSlash || hasCurrentTrailingSlash)) {
    path.pathname += "/";
  }
  return path;
}
var removeDoubleSlashes = (path) => path.replace(/\/\/+/g, "/");
var joinPaths = (paths) => removeDoubleSlashes(paths.join("/"));
var removeTrailingSlash = (path) => path.replace(/\/+$/, "");
var normalizePathname = (pathname) => removeTrailingSlash(pathname).replace(/^\/*/, "/");
var normalizeSearch = (search) => !search || search === "?" ? "" : search.startsWith("?") ? search : "?" + search;
var normalizeHash = (hash) => !hash || hash === "#" ? "" : hash.startsWith("#") ? hash : "#" + hash;
var ErrorResponseImpl = class {
  constructor(status, statusText, data2, internal = false) {
    this.status = status;
    this.statusText = statusText || "";
    this.internal = internal;
    if (data2 instanceof Error) {
      this.data = data2.toString();
      this.error = data2;
    } else {
      this.data = data2;
    }
  }
};
function isRouteErrorResponse(error) {
  return error != null && typeof error.status === "number" && typeof error.statusText === "string" && typeof error.internal === "boolean" && "data" in error;
}
function getRoutePattern(matches) {
  let parts = matches.map((m) => m.route.path).filter(Boolean);
  return joinPaths(parts) || "/";
}
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
function parseToInfo(_to, basename) {
  let to = _to;
  if (typeof to !== "string" || !ABSOLUTE_URL_REGEX.test(to)) {
    return {
      absoluteURL: void 0,
      isExternal: false,
      to
    };
  }
  let absoluteURL = to;
  let isExternal = false;
  if (isBrowser) {
    try {
      let currentUrl = new URL(window.location.href);
      let targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to);
      let path = stripBasename(targetUrl.pathname, basename);
      if (targetUrl.origin === currentUrl.origin && path != null) {
        to = path + targetUrl.search + targetUrl.hash;
      } else {
        isExternal = true;
      }
    } catch (e) {
      warning(
        false,
        `<Link to="${to}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`
      );
    }
  }
  return {
    absoluteURL,
    isExternal,
    to
  };
}
Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
var validMutationMethodsArr = [
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
];
new Set(
  validMutationMethodsArr
);
var validRequestMethodsArr = [
  "GET",
  ...validMutationMethodsArr
];
new Set(validRequestMethodsArr);
var DataRouterContext = reactExports.createContext(null);
DataRouterContext.displayName = "DataRouter";
var DataRouterStateContext = reactExports.createContext(null);
DataRouterStateContext.displayName = "DataRouterState";
var RSCRouterContext = reactExports.createContext(false);
function useIsRSCRouterContext() {
  return reactExports.useContext(RSCRouterContext);
}
var ViewTransitionContext = reactExports.createContext({
  isTransitioning: false
});
ViewTransitionContext.displayName = "ViewTransition";
var FetchersContext = reactExports.createContext(
  /* @__PURE__ */ new Map()
);
FetchersContext.displayName = "Fetchers";
var AwaitContext = reactExports.createContext(null);
AwaitContext.displayName = "Await";
var NavigationContext = reactExports.createContext(
  null
);
NavigationContext.displayName = "Navigation";
var LocationContext = reactExports.createContext(
  null
);
LocationContext.displayName = "Location";
var RouteContext = reactExports.createContext({
  outlet: null,
  matches: [],
  isDataRoute: false
});
RouteContext.displayName = "Route";
var RouteErrorContext = reactExports.createContext(null);
RouteErrorContext.displayName = "RouteError";
var ERROR_DIGEST_BASE = "REACT_ROUTER_ERROR";
var ERROR_DIGEST_REDIRECT = "REDIRECT";
var ERROR_DIGEST_ROUTE_ERROR_RESPONSE = "ROUTE_ERROR_RESPONSE";
function decodeRedirectErrorDigest(digest) {
  if (digest.startsWith(`${ERROR_DIGEST_BASE}:${ERROR_DIGEST_REDIRECT}:{`)) {
    try {
      let parsed = JSON.parse(digest.slice(28));
      if (typeof parsed === "object" && parsed && typeof parsed.status === "number" && typeof parsed.statusText === "string" && typeof parsed.location === "string" && typeof parsed.reloadDocument === "boolean" && typeof parsed.replace === "boolean") {
        return parsed;
      }
    } catch {
    }
  }
}
function decodeRouteErrorResponseDigest(digest) {
  if (digest.startsWith(
    `${ERROR_DIGEST_BASE}:${ERROR_DIGEST_ROUTE_ERROR_RESPONSE}:{`
  )) {
    try {
      let parsed = JSON.parse(digest.slice(40));
      if (typeof parsed === "object" && parsed && typeof parsed.status === "number" && typeof parsed.statusText === "string") {
        return new ErrorResponseImpl(
          parsed.status,
          parsed.statusText,
          parsed.data
        );
      }
    } catch {
    }
  }
}
function useHref(to, { relative } = {}) {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useHref() may be used only in the context of a <Router> component.`
  );
  let { basename, navigator } = reactExports.useContext(NavigationContext);
  let { hash, pathname, search } = useResolvedPath(to, { relative });
  let joinedPathname = pathname;
  if (basename !== "/") {
    joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname]);
  }
  return navigator.createHref({ pathname: joinedPathname, search, hash });
}
function useInRouterContext() {
  return reactExports.useContext(LocationContext) != null;
}
function useLocation() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useLocation() may be used only in the context of a <Router> component.`
  );
  return reactExports.useContext(LocationContext).location;
}
var navigateEffectWarning = `You should call navigate() in a React.useEffect(), not when your component is first rendered.`;
function useIsomorphicLayoutEffect$1(cb) {
  let isStatic = reactExports.useContext(NavigationContext).static;
  if (!isStatic) {
    reactExports.useLayoutEffect(cb);
  }
}
function useNavigate() {
  let { isDataRoute } = reactExports.useContext(RouteContext);
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}
function useNavigateUnstable() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useNavigate() may be used only in the context of a <Router> component.`
  );
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  let { basename, navigator } = reactExports.useContext(NavigationContext);
  let { matches } = reactExports.useContext(RouteContext);
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect$1(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(
    (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning);
      if (!activeRef.current) return;
      if (typeof to === "number") {
        navigator.go(to);
        return;
      }
      let path = resolveTo(
        to,
        JSON.parse(routePathnamesJson),
        locationPathname,
        options.relative === "path"
      );
      if (dataRouterContext == null && basename !== "/") {
        path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
      }
      (!!options.replace ? navigator.replace : navigator.push)(
        path,
        options.state,
        options
      );
    },
    [
      basename,
      navigator,
      routePathnamesJson,
      locationPathname,
      dataRouterContext
    ]
  );
  return navigate;
}
reactExports.createContext(null);
function useResolvedPath(to, { relative } = {}) {
  let { matches } = reactExports.useContext(RouteContext);
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));
  return reactExports.useMemo(
    () => resolveTo(
      to,
      JSON.parse(routePathnamesJson),
      locationPathname,
      relative === "path"
    ),
    [to, routePathnamesJson, locationPathname, relative]
  );
}
function useRoutesImpl(routes, locationArg, dataRouterOpts) {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useRoutes() may be used only in the context of a <Router> component.`
  );
  let { navigator } = reactExports.useContext(NavigationContext);
  let { matches: parentMatches } = reactExports.useContext(RouteContext);
  let routeMatch = parentMatches[parentMatches.length - 1];
  let parentParams = routeMatch ? routeMatch.params : {};
  let parentPathname = routeMatch ? routeMatch.pathname : "/";
  let parentPathnameBase = routeMatch ? routeMatch.pathnameBase : "/";
  let parentRoute = routeMatch && routeMatch.route;
  {
    let parentPath = parentRoute && parentRoute.path || "";
    warningOnce(
      parentPathname,
      !parentRoute || parentPath.endsWith("*") || parentPath.endsWith("*?"),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${parentPathname}" (under <Route path="${parentPath}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${parentPath}"> to <Route path="${parentPath === "/" ? "*" : `${parentPath}/*`}">.`
    );
  }
  let locationFromContext = useLocation();
  let location;
  {
    location = locationFromContext;
  }
  let pathname = location.pathname || "/";
  let remainingPathname = pathname;
  if (parentPathnameBase !== "/") {
    let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
    let segments = pathname.replace(/^\//, "").split("/");
    remainingPathname = "/" + segments.slice(parentSegments.length).join("/");
  }
  let matches = matchRoutes(routes, { pathname: remainingPathname });
  {
    warning(
      parentRoute || matches != null,
      `No routes matched location "${location.pathname}${location.search}${location.hash}" `
    );
    warning(
      matches == null || matches[matches.length - 1].route.element !== void 0 || matches[matches.length - 1].route.Component !== void 0 || matches[matches.length - 1].route.lazy !== void 0,
      `Matched leaf route at location "${location.pathname}${location.search}${location.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`
    );
  }
  let renderedMatches = _renderMatches(
    matches && matches.map(
      (match) => Object.assign({}, match, {
        params: Object.assign({}, parentParams, match.params),
        pathname: joinPaths([
          parentPathnameBase,
          // Re-encode pathnames that were decoded inside matchRoutes.
          // Pre-encode `%`, `?` and `#` ahead of `encodeLocation` because it uses
          // `new URL()` internally and we need to prevent it from treating
          // them as separators
          navigator.encodeLocation ? navigator.encodeLocation(
            match.pathname.replace(/%/g, "%25").replace(/\?/g, "%3F").replace(/#/g, "%23")
          ).pathname : match.pathname
        ]),
        pathnameBase: match.pathnameBase === "/" ? parentPathnameBase : joinPaths([
          parentPathnameBase,
          // Re-encode pathnames that were decoded inside matchRoutes
          // Pre-encode `%`, `?` and `#` ahead of `encodeLocation` because it uses
          // `new URL()` internally and we need to prevent it from treating
          // them as separators
          navigator.encodeLocation ? navigator.encodeLocation(
            match.pathnameBase.replace(/%/g, "%25").replace(/\?/g, "%3F").replace(/#/g, "%23")
          ).pathname : match.pathnameBase
        ])
      })
    ),
    parentMatches,
    dataRouterOpts
  );
  return renderedMatches;
}
function DefaultErrorComponent() {
  let error = useRouteError();
  let message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = { padding: "0.5rem", backgroundColor: lightgrey };
  let codeStyles = { padding: "2px 4px", backgroundColor: lightgrey };
  let devInfo = null;
  {
    console.error(
      "Error handled by React Router default ErrorBoundary:",
      error
    );
    devInfo = /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("p", null, "💿 Hey developer 👋"), /* @__PURE__ */ reactExports.createElement("p", null, "You can provide a way better UX than this when your app throws errors by providing your own ", /* @__PURE__ */ reactExports.createElement("code", { style: codeStyles }, "ErrorBoundary"), " or", " ", /* @__PURE__ */ reactExports.createElement("code", { style: codeStyles }, "errorElement"), " prop on your route."));
  }
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, /* @__PURE__ */ reactExports.createElement("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ reactExports.createElement("h3", { style: { fontStyle: "italic" } }, message), stack ? /* @__PURE__ */ reactExports.createElement("pre", { style: preStyles }, stack) : null, devInfo);
}
var defaultErrorElement = /* @__PURE__ */ reactExports.createElement(DefaultErrorComponent, null);
var RenderErrorBoundary = class extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: props.location,
      revalidation: props.revalidation,
      error: props.error
    };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  static getDerivedStateFromProps(props, state) {
    if (state.location !== props.location || state.revalidation !== "idle" && props.revalidation === "idle") {
      return {
        error: props.error,
        location: props.location,
        revalidation: props.revalidation
      };
    }
    return {
      error: props.error !== void 0 ? props.error : state.error,
      location: state.location,
      revalidation: props.revalidation || state.revalidation
    };
  }
  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error(
        "React Router caught the following error during render",
        error
      );
    }
  }
  render() {
    let error = this.state.error;
    if (this.context && typeof error === "object" && error && "digest" in error && typeof error.digest === "string") {
      const decoded = decodeRouteErrorResponseDigest(error.digest);
      if (decoded) error = decoded;
    }
    let result = error !== void 0 ? /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, { value: this.props.routeContext }, /* @__PURE__ */ reactExports.createElement(
      RouteErrorContext.Provider,
      {
        value: error,
        children: this.props.component
      }
    )) : this.props.children;
    if (this.context) {
      return /* @__PURE__ */ reactExports.createElement(RSCErrorHandler, { error }, result);
    }
    return result;
  }
};
RenderErrorBoundary.contextType = RSCRouterContext;
var errorRedirectHandledMap = /* @__PURE__ */ new WeakMap();
function RSCErrorHandler({
  children,
  error
}) {
  let { basename } = reactExports.useContext(NavigationContext);
  if (typeof error === "object" && error && "digest" in error && typeof error.digest === "string") {
    let redirect2 = decodeRedirectErrorDigest(error.digest);
    if (redirect2) {
      let existingRedirect = errorRedirectHandledMap.get(error);
      if (existingRedirect) throw existingRedirect;
      let parsed = parseToInfo(redirect2.location, basename);
      if (isBrowser && !errorRedirectHandledMap.get(error)) {
        if (parsed.isExternal || redirect2.reloadDocument) {
          window.location.href = parsed.absoluteURL || parsed.to;
        } else {
          const redirectPromise = Promise.resolve().then(
            () => window.__reactRouterDataRouter.navigate(parsed.to, {
              replace: redirect2.replace
            })
          );
          errorRedirectHandledMap.set(error, redirectPromise);
          throw redirectPromise;
        }
      }
      return /* @__PURE__ */ reactExports.createElement(
        "meta",
        {
          httpEquiv: "refresh",
          content: `0;url=${parsed.absoluteURL || parsed.to}`
        }
      );
    }
  }
  return children;
}
function RenderedRoute({ routeContext, match, children }) {
  let dataRouterContext = reactExports.useContext(DataRouterContext);
  if (dataRouterContext && dataRouterContext.static && dataRouterContext.staticContext && (match.route.errorElement || match.route.ErrorBoundary)) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }
  return /* @__PURE__ */ reactExports.createElement(RouteContext.Provider, { value: routeContext }, children);
}
function _renderMatches(matches, parentMatches = [], dataRouterOpts) {
  let dataRouterState = dataRouterOpts?.state;
  if (matches == null) {
    if (!dataRouterState) {
      return null;
    }
    if (dataRouterState.errors) {
      matches = dataRouterState.matches;
    } else if (parentMatches.length === 0 && !dataRouterState.initialized && dataRouterState.matches.length > 0) {
      matches = dataRouterState.matches;
    } else {
      return null;
    }
  }
  let renderedMatches = matches;
  let errors = dataRouterState?.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex(
      (m) => m.route.id && errors?.[m.route.id] !== void 0
    );
    invariant(
      errorIndex >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(
        errors
      ).join(",")}`
    );
    renderedMatches = renderedMatches.slice(
      0,
      Math.min(renderedMatches.length, errorIndex + 1)
    );
  }
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterOpts && dataRouterState) {
    renderFallback = dataRouterState.renderFallback;
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }
      if (match.route.id) {
        let { loaderData, errors: errors2 } = dataRouterState;
        let needsToRunLoader = match.route.loader && !loaderData.hasOwnProperty(match.route.id) && (!errors2 || errors2[match.route.id] === void 0);
        if (match.route.lazy || needsToRunLoader) {
          if (dataRouterOpts.isStatic) {
            renderFallback = true;
          }
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }
  let onErrorHandler = dataRouterOpts?.onError;
  let onError = dataRouterState && onErrorHandler ? (error, errorInfo) => {
    onErrorHandler(error, {
      location: dataRouterState.location,
      params: dataRouterState.matches?.[0]?.params ?? {},
      unstable_pattern: getRoutePattern(dataRouterState.matches),
      errorInfo
    });
  } : void 0;
  return renderedMatches.reduceRight(
    (outlet, match, index2) => {
      let error;
      let shouldRenderHydrateFallback = false;
      let errorElement = null;
      let hydrateFallbackElement = null;
      if (dataRouterState) {
        error = errors && match.route.id ? errors[match.route.id] : void 0;
        errorElement = match.route.errorElement || defaultErrorElement;
        if (renderFallback) {
          if (fallbackIndex < 0 && index2 === 0) {
            warningOnce(
              "route-fallback",
              false,
              "No `HydrateFallback` element provided to render during initial hydration"
            );
            shouldRenderHydrateFallback = true;
            hydrateFallbackElement = null;
          } else if (fallbackIndex === index2) {
            shouldRenderHydrateFallback = true;
            hydrateFallbackElement = match.route.hydrateFallbackElement || null;
          }
        }
      }
      let matches2 = parentMatches.concat(renderedMatches.slice(0, index2 + 1));
      let getChildren = () => {
        let children;
        if (error) {
          children = errorElement;
        } else if (shouldRenderHydrateFallback) {
          children = hydrateFallbackElement;
        } else if (match.route.Component) {
          children = /* @__PURE__ */ reactExports.createElement(match.route.Component, null);
        } else if (match.route.element) {
          children = match.route.element;
        } else {
          children = outlet;
        }
        return /* @__PURE__ */ reactExports.createElement(
          RenderedRoute,
          {
            match,
            routeContext: {
              outlet,
              matches: matches2,
              isDataRoute: dataRouterState != null
            },
            children
          }
        );
      };
      return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index2 === 0) ? /* @__PURE__ */ reactExports.createElement(
        RenderErrorBoundary,
        {
          location: dataRouterState.location,
          revalidation: dataRouterState.revalidation,
          component: errorElement,
          error,
          children: getChildren(),
          routeContext: { outlet: null, matches: matches2, isDataRoute: true },
          onError
        }
      ) : getChildren();
    },
    null
  );
}
function getDataRouterConsoleError(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function useDataRouterContext(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  invariant(ctx, getDataRouterConsoleError(hookName));
  return ctx;
}
function useDataRouterState(hookName) {
  let state = reactExports.useContext(DataRouterStateContext);
  invariant(state, getDataRouterConsoleError(hookName));
  return state;
}
function useRouteContext(hookName) {
  let route = reactExports.useContext(RouteContext);
  invariant(route, getDataRouterConsoleError(hookName));
  return route;
}
function useCurrentRouteId(hookName) {
  let route = useRouteContext(hookName);
  let thisRoute = route.matches[route.matches.length - 1];
  invariant(
    thisRoute.route.id,
    `${hookName} can only be used on routes that contain a unique "id"`
  );
  return thisRoute.route.id;
}
function useRouteId() {
  return useCurrentRouteId(
    "useRouteId"
    /* UseRouteId */
  );
}
function useRouteError() {
  let error = reactExports.useContext(RouteErrorContext);
  let state = useDataRouterState(
    "useRouteError"
    /* UseRouteError */
  );
  let routeId = useCurrentRouteId(
    "useRouteError"
    /* UseRouteError */
  );
  if (error !== void 0) {
    return error;
  }
  return state.errors?.[routeId];
}
function useNavigateStable() {
  let { router } = useDataRouterContext(
    "useNavigate"
    /* UseNavigateStable */
  );
  let id = useCurrentRouteId(
    "useNavigate"
    /* UseNavigateStable */
  );
  let activeRef = reactExports.useRef(false);
  useIsomorphicLayoutEffect$1(() => {
    activeRef.current = true;
  });
  let navigate = reactExports.useCallback(
    async (to, options = {}) => {
      warning(activeRef.current, navigateEffectWarning);
      if (!activeRef.current) return;
      if (typeof to === "number") {
        await router.navigate(to);
      } else {
        await router.navigate(to, { fromRouteId: id, ...options });
      }
    },
    [router, id]
  );
  return navigate;
}
var alreadyWarned = {};
function warningOnce(key, cond, message) {
  if (!cond && !alreadyWarned[key]) {
    alreadyWarned[key] = true;
    warning(false, message);
  }
}
reactExports.memo(DataRoutes);
function DataRoutes({
  routes,
  future,
  state,
  isStatic,
  onError
}) {
  return useRoutesImpl(routes, void 0, { state, isStatic, onError });
}
function Router({
  basename: basenameProp = "/",
  children = null,
  location: locationProp,
  navigationType = "POP",
  navigator,
  static: staticProp = false,
  unstable_useTransitions
}) {
  invariant(
    !useInRouterContext(),
    `You cannot render a <Router> inside another <Router>. You should never have more than one in your app.`
  );
  let basename = basenameProp.replace(/^\/*/, "/");
  let navigationContext = reactExports.useMemo(
    () => ({
      basename,
      navigator,
      static: staticProp,
      unstable_useTransitions,
      future: {}
    }),
    [basename, navigator, staticProp, unstable_useTransitions]
  );
  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }
  let {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default",
    unstable_mask
  } = locationProp;
  let locationContext = reactExports.useMemo(() => {
    let trailingPathname = stripBasename(pathname, basename);
    if (trailingPathname == null) {
      return null;
    }
    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key,
        unstable_mask
      },
      navigationType
    };
  }, [
    basename,
    pathname,
    search,
    hash,
    state,
    key,
    navigationType,
    unstable_mask
  ]);
  warning(
    locationContext != null,
    `<Router basename="${basename}"> is not able to match the URL "${pathname}${search}${hash}" because it does not start with the basename, so the <Router> won't render anything.`
  );
  if (locationContext == null) {
    return null;
  }
  return /* @__PURE__ */ reactExports.createElement(NavigationContext.Provider, { value: navigationContext }, /* @__PURE__ */ reactExports.createElement(LocationContext.Provider, { children, value: locationContext }));
}
var defaultMethod = "get";
var defaultEncType = "application/x-www-form-urlencoded";
function isHtmlElement(object) {
  return typeof HTMLElement !== "undefined" && object instanceof HTMLElement;
}
function isButtonElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "button";
}
function isFormElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "form";
}
function isInputElement(object) {
  return isHtmlElement(object) && object.tagName.toLowerCase() === "input";
}
function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}
function shouldProcessLinkClick(event, target) {
  return event.button === 0 && // Ignore everything but left clicks
  (!target || target === "_self") && // Let browser handle "target=_blank" etc.
  !isModifiedEvent(event);
}
var _formDataSupportsSubmitter = null;
function isFormDataSubmitterSupported() {
  if (_formDataSupportsSubmitter === null) {
    try {
      new FormData(
        document.createElement("form"),
        // @ts-expect-error if FormData supports the submitter parameter, this will throw
        0
      );
      _formDataSupportsSubmitter = false;
    } catch (e) {
      _formDataSupportsSubmitter = true;
    }
  }
  return _formDataSupportsSubmitter;
}
var supportedFormEncTypes = /* @__PURE__ */ new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain"
]);
function getFormEncType(encType) {
  if (encType != null && !supportedFormEncTypes.has(encType)) {
    warning(
      false,
      `"${encType}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${defaultEncType}"`
    );
    return null;
  }
  return encType;
}
function getFormSubmissionInfo(target, basename) {
  let method;
  let action;
  let encType;
  let formData;
  let body;
  if (isFormElement(target)) {
    let attr = target.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null;
    method = target.getAttribute("method") || defaultMethod;
    encType = getFormEncType(target.getAttribute("enctype")) || defaultEncType;
    formData = new FormData(target);
  } else if (isButtonElement(target) || isInputElement(target) && (target.type === "submit" || target.type === "image")) {
    let form = target.form;
    if (form == null) {
      throw new Error(
        `Cannot submit a <button> or <input type="submit"> without a <form>`
      );
    }
    let attr = target.getAttribute("formaction") || form.getAttribute("action");
    action = attr ? stripBasename(attr, basename) : null;
    method = target.getAttribute("formmethod") || form.getAttribute("method") || defaultMethod;
    encType = getFormEncType(target.getAttribute("formenctype")) || getFormEncType(form.getAttribute("enctype")) || defaultEncType;
    formData = new FormData(form, target);
    if (!isFormDataSubmitterSupported()) {
      let { name, type, value } = target;
      if (type === "image") {
        let prefix = name ? `${name}.` : "";
        formData.append(`${prefix}x`, "0");
        formData.append(`${prefix}y`, "0");
      } else if (name) {
        formData.append(name, value);
      }
    }
  } else if (isHtmlElement(target)) {
    throw new Error(
      `Cannot submit element that is not <form>, <button>, or <input type="submit|image">`
    );
  } else {
    method = defaultMethod;
    action = null;
    encType = defaultEncType;
    body = target;
  }
  if (formData && encType === "text/plain") {
    body = formData;
    formData = void 0;
  }
  return { action, method: method.toLowerCase(), encType, formData, body };
}
Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function invariant2(value, message) {
  if (value === false || value === null || typeof value === "undefined") {
    throw new Error(message);
  }
}
function singleFetchUrl(reqUrl, basename, trailingSlashAware, extension) {
  let url = typeof reqUrl === "string" ? new URL(
    reqUrl,
    // This can be called during the SSR flow via PrefetchPageLinksImpl so
    // don't assume window is available
    typeof window === "undefined" ? "server://singlefetch/" : window.location.origin
  ) : reqUrl;
  if (trailingSlashAware) {
    if (url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}_.${extension}`;
    } else {
      url.pathname = `${url.pathname}.${extension}`;
    }
  } else {
    if (url.pathname === "/") {
      url.pathname = `_root.${extension}`;
    } else if (basename && stripBasename(url.pathname, basename) === "/") {
      url.pathname = `${removeTrailingSlash(basename)}/_root.${extension}`;
    } else {
      url.pathname = `${removeTrailingSlash(url.pathname)}.${extension}`;
    }
  }
  return url;
}
async function loadRouteModule(route, routeModulesCache) {
  if (route.id in routeModulesCache) {
    return routeModulesCache[route.id];
  }
  try {
    let routeModule = await import(
      /* @vite-ignore */
      /* webpackIgnore: true */
      route.module
    );
    routeModulesCache[route.id] = routeModule;
    return routeModule;
  } catch (error) {
    console.error(
      `Error loading route module \`${route.module}\`, reloading page...`
    );
    console.error(error);
    if (window.__reactRouterContext && window.__reactRouterContext.isSpaMode && // @ts-expect-error
    void 0) ;
    window.location.reload();
    return new Promise(() => {
    });
  }
}
function isHtmlLinkDescriptor(object) {
  if (object == null) {
    return false;
  }
  if (object.href == null) {
    return object.rel === "preload" && typeof object.imageSrcSet === "string" && typeof object.imageSizes === "string";
  }
  return typeof object.rel === "string" && typeof object.href === "string";
}
async function getKeyedPrefetchLinks(matches, manifest, routeModules) {
  let links = await Promise.all(
    matches.map(async (match) => {
      let route = manifest.routes[match.route.id];
      if (route) {
        let mod = await loadRouteModule(route, routeModules);
        return mod.links ? mod.links() : [];
      }
      return [];
    })
  );
  return dedupeLinkDescriptors(
    links.flat(1).filter(isHtmlLinkDescriptor).filter((link) => link.rel === "stylesheet" || link.rel === "preload").map(
      (link) => link.rel === "stylesheet" ? { ...link, rel: "prefetch", as: "style" } : { ...link, rel: "prefetch" }
    )
  );
}
function getNewMatchesForLinks(page, nextMatches, currentMatches, manifest, location, mode) {
  let isNew = (match, index2) => {
    if (!currentMatches[index2]) return true;
    return match.route.id !== currentMatches[index2].route.id;
  };
  let matchPathChanged = (match, index2) => {
    return (
      // param change, /users/123 -> /users/456
      currentMatches[index2].pathname !== match.pathname || // splat param changed, which is not present in match.path
      // e.g. /files/images/avatar.jpg -> files/finances.xls
      currentMatches[index2].route.path?.endsWith("*") && currentMatches[index2].params["*"] !== match.params["*"]
    );
  };
  if (mode === "assets") {
    return nextMatches.filter(
      (match, index2) => isNew(match, index2) || matchPathChanged(match, index2)
    );
  }
  if (mode === "data") {
    return nextMatches.filter((match, index2) => {
      let manifestRoute = manifest.routes[match.route.id];
      if (!manifestRoute || !manifestRoute.hasLoader) {
        return false;
      }
      if (isNew(match, index2) || matchPathChanged(match, index2)) {
        return true;
      }
      if (match.route.shouldRevalidate) {
        let routeChoice = match.route.shouldRevalidate({
          currentUrl: new URL(
            location.pathname + location.search + location.hash,
            window.origin
          ),
          currentParams: currentMatches[0]?.params || {},
          nextUrl: new URL(page, window.origin),
          nextParams: match.params,
          defaultShouldRevalidate: true
        });
        if (typeof routeChoice === "boolean") {
          return routeChoice;
        }
      }
      return true;
    });
  }
  return [];
}
function getModuleLinkHrefs(matches, manifest, { includeHydrateFallback } = {}) {
  return dedupeHrefs(
    matches.map((match) => {
      let route = manifest.routes[match.route.id];
      if (!route) return [];
      let hrefs = [route.module];
      if (route.clientActionModule) {
        hrefs = hrefs.concat(route.clientActionModule);
      }
      if (route.clientLoaderModule) {
        hrefs = hrefs.concat(route.clientLoaderModule);
      }
      if (includeHydrateFallback && route.hydrateFallbackModule) {
        hrefs = hrefs.concat(route.hydrateFallbackModule);
      }
      if (route.imports) {
        hrefs = hrefs.concat(route.imports);
      }
      return hrefs;
    }).flat(1)
  );
}
function dedupeHrefs(hrefs) {
  return [...new Set(hrefs)];
}
function sortKeys(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}
function dedupeLinkDescriptors(descriptors, preloads) {
  let set = /* @__PURE__ */ new Set();
  new Set(preloads);
  return descriptors.reduce((deduped, descriptor) => {
    let key = JSON.stringify(sortKeys(descriptor));
    if (!set.has(key)) {
      set.add(key);
      deduped.push({ key, link: descriptor });
    }
    return deduped;
  }, []);
}
function useDataRouterContext2() {
  let context = reactExports.useContext(DataRouterContext);
  invariant2(
    context,
    "You must render this element inside a <DataRouterContext.Provider> element"
  );
  return context;
}
function useDataRouterStateContext() {
  let context = reactExports.useContext(DataRouterStateContext);
  invariant2(
    context,
    "You must render this element inside a <DataRouterStateContext.Provider> element"
  );
  return context;
}
var FrameworkContext = reactExports.createContext(void 0);
FrameworkContext.displayName = "FrameworkContext";
function useFrameworkContext() {
  let context = reactExports.useContext(FrameworkContext);
  invariant2(
    context,
    "You must render this element inside a <HydratedRouter> element"
  );
  return context;
}
function usePrefetchBehavior(prefetch, theirElementProps) {
  let frameworkContext = reactExports.useContext(FrameworkContext);
  let [maybePrefetch, setMaybePrefetch] = reactExports.useState(false);
  let [shouldPrefetch, setShouldPrefetch] = reactExports.useState(false);
  let { onFocus, onBlur, onMouseEnter, onMouseLeave, onTouchStart } = theirElementProps;
  let ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (prefetch === "render") {
      setShouldPrefetch(true);
    }
    if (prefetch === "viewport") {
      let callback = (entries) => {
        entries.forEach((entry) => {
          setShouldPrefetch(entry.isIntersecting);
        });
      };
      let observer = new IntersectionObserver(callback, { threshold: 0.5 });
      if (ref.current) observer.observe(ref.current);
      return () => {
        observer.disconnect();
      };
    }
  }, [prefetch]);
  reactExports.useEffect(() => {
    if (maybePrefetch) {
      let id = setTimeout(() => {
        setShouldPrefetch(true);
      }, 100);
      return () => {
        clearTimeout(id);
      };
    }
  }, [maybePrefetch]);
  let setIntent = () => {
    setMaybePrefetch(true);
  };
  let cancelIntent = () => {
    setMaybePrefetch(false);
    setShouldPrefetch(false);
  };
  if (!frameworkContext) {
    return [false, ref, {}];
  }
  if (prefetch !== "intent") {
    return [shouldPrefetch, ref, {}];
  }
  return [
    shouldPrefetch,
    ref,
    {
      onFocus: composeEventHandlers$1(onFocus, setIntent),
      onBlur: composeEventHandlers$1(onBlur, cancelIntent),
      onMouseEnter: composeEventHandlers$1(onMouseEnter, setIntent),
      onMouseLeave: composeEventHandlers$1(onMouseLeave, cancelIntent),
      onTouchStart: composeEventHandlers$1(onTouchStart, setIntent)
    }
  ];
}
function composeEventHandlers$1(theirHandler, ourHandler) {
  return (event) => {
    theirHandler && theirHandler(event);
    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}
function PrefetchPageLinks({ page, ...linkProps }) {
  let rsc = useIsRSCRouterContext();
  let { router } = useDataRouterContext2();
  let matches = reactExports.useMemo(
    () => matchRoutes(router.routes, page, router.basename),
    [router.routes, page, router.basename]
  );
  if (!matches) {
    return null;
  }
  if (rsc) {
    return /* @__PURE__ */ reactExports.createElement(RSCPrefetchPageLinksImpl, { page, matches, ...linkProps });
  }
  return /* @__PURE__ */ reactExports.createElement(PrefetchPageLinksImpl, { page, matches, ...linkProps });
}
function useKeyedPrefetchLinks(matches) {
  let { manifest, routeModules } = useFrameworkContext();
  let [keyedPrefetchLinks, setKeyedPrefetchLinks] = reactExports.useState([]);
  reactExports.useEffect(() => {
    let interrupted = false;
    void getKeyedPrefetchLinks(matches, manifest, routeModules).then(
      (links) => {
        if (!interrupted) {
          setKeyedPrefetchLinks(links);
        }
      }
    );
    return () => {
      interrupted = true;
    };
  }, [matches, manifest, routeModules]);
  return keyedPrefetchLinks;
}
function RSCPrefetchPageLinksImpl({
  page,
  matches: nextMatches,
  ...linkProps
}) {
  let location = useLocation();
  let { future } = useFrameworkContext();
  let { basename } = useDataRouterContext2();
  let dataHrefs = reactExports.useMemo(() => {
    if (page === location.pathname + location.search + location.hash) {
      return [];
    }
    let url = singleFetchUrl(
      page,
      basename,
      future.unstable_trailingSlashAwareDataRequests,
      "rsc"
    );
    let hasSomeRoutesWithShouldRevalidate = false;
    let targetRoutes = [];
    for (let match of nextMatches) {
      if (typeof match.route.shouldRevalidate === "function") {
        hasSomeRoutesWithShouldRevalidate = true;
      } else {
        targetRoutes.push(match.route.id);
      }
    }
    if (hasSomeRoutesWithShouldRevalidate && targetRoutes.length > 0) {
      url.searchParams.set("_routes", targetRoutes.join(","));
    }
    return [url.pathname + url.search];
  }, [
    basename,
    future.unstable_trailingSlashAwareDataRequests,
    page,
    location,
    nextMatches
  ]);
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, dataHrefs.map((href) => /* @__PURE__ */ reactExports.createElement("link", { key: href, rel: "prefetch", as: "fetch", href, ...linkProps })));
}
function PrefetchPageLinksImpl({
  page,
  matches: nextMatches,
  ...linkProps
}) {
  let location = useLocation();
  let { future, manifest, routeModules } = useFrameworkContext();
  let { basename } = useDataRouterContext2();
  let { loaderData, matches } = useDataRouterStateContext();
  let newMatchesForData = reactExports.useMemo(
    () => getNewMatchesForLinks(
      page,
      nextMatches,
      matches,
      manifest,
      location,
      "data"
    ),
    [page, nextMatches, matches, manifest, location]
  );
  let newMatchesForAssets = reactExports.useMemo(
    () => getNewMatchesForLinks(
      page,
      nextMatches,
      matches,
      manifest,
      location,
      "assets"
    ),
    [page, nextMatches, matches, manifest, location]
  );
  let dataHrefs = reactExports.useMemo(() => {
    if (page === location.pathname + location.search + location.hash) {
      return [];
    }
    let routesParams = /* @__PURE__ */ new Set();
    let foundOptOutRoute = false;
    nextMatches.forEach((m) => {
      let manifestRoute = manifest.routes[m.route.id];
      if (!manifestRoute || !manifestRoute.hasLoader) {
        return;
      }
      if (!newMatchesForData.some((m2) => m2.route.id === m.route.id) && m.route.id in loaderData && routeModules[m.route.id]?.shouldRevalidate) {
        foundOptOutRoute = true;
      } else if (manifestRoute.hasClientLoader) {
        foundOptOutRoute = true;
      } else {
        routesParams.add(m.route.id);
      }
    });
    if (routesParams.size === 0) {
      return [];
    }
    let url = singleFetchUrl(
      page,
      basename,
      future.unstable_trailingSlashAwareDataRequests,
      "data"
    );
    if (foundOptOutRoute && routesParams.size > 0) {
      url.searchParams.set(
        "_routes",
        nextMatches.filter((m) => routesParams.has(m.route.id)).map((m) => m.route.id).join(",")
      );
    }
    return [url.pathname + url.search];
  }, [
    basename,
    future.unstable_trailingSlashAwareDataRequests,
    loaderData,
    location,
    manifest,
    newMatchesForData,
    nextMatches,
    page,
    routeModules
  ]);
  let moduleHrefs = reactExports.useMemo(
    () => getModuleLinkHrefs(newMatchesForAssets, manifest),
    [newMatchesForAssets, manifest]
  );
  let keyedPrefetchLinks = useKeyedPrefetchLinks(newMatchesForAssets);
  return /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, dataHrefs.map((href) => /* @__PURE__ */ reactExports.createElement("link", { key: href, rel: "prefetch", as: "fetch", href, ...linkProps })), moduleHrefs.map((href) => /* @__PURE__ */ reactExports.createElement("link", { key: href, rel: "modulepreload", href, ...linkProps })), keyedPrefetchLinks.map(({ key, link }) => (
    // these don't spread `linkProps` because they are full link descriptors
    // already with their own props
    /* @__PURE__ */ reactExports.createElement(
      "link",
      {
        key,
        nonce: linkProps.nonce,
        ...link,
        crossOrigin: link.crossOrigin ?? linkProps.crossOrigin
      }
    )
  )));
}
function mergeRefs(...refs) {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        ref.current = value;
      }
    });
  };
}
var isBrowser2 = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
try {
  if (isBrowser2) {
    window.__reactRouterVersion = // @ts-expect-error
    "7.14.2";
  }
} catch (e) {
}
function BrowserRouter({
  basename,
  children,
  unstable_useTransitions,
  window: window2
}) {
  let historyRef = reactExports.useRef();
  if (historyRef.current == null) {
    historyRef.current = createBrowserHistory({ window: window2, v5Compat: true });
  }
  let history = historyRef.current;
  let [state, setStateImpl] = reactExports.useState({
    action: history.action,
    location: history.location
  });
  let setState = reactExports.useCallback(
    (newState) => {
      if (unstable_useTransitions === false) {
        setStateImpl(newState);
      } else {
        reactExports.startTransition(() => setStateImpl(newState));
      }
    },
    [unstable_useTransitions]
  );
  reactExports.useLayoutEffect(() => history.listen(setState), [history, setState]);
  return /* @__PURE__ */ reactExports.createElement(
    Router,
    {
      basename,
      children,
      location: state.location,
      navigationType: state.action,
      navigator: history,
      unstable_useTransitions
    }
  );
}
var ABSOLUTE_URL_REGEX2 = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
var Link = reactExports.forwardRef(
  function LinkWithRef({
    onClick,
    discover = "render",
    prefetch = "none",
    relative,
    reloadDocument,
    replace: replace2,
    unstable_mask,
    state,
    target,
    to,
    preventScrollReset,
    viewTransition,
    unstable_defaultShouldRevalidate,
    ...rest
  }, forwardedRef) {
    let { basename, navigator, unstable_useTransitions } = reactExports.useContext(NavigationContext);
    let isAbsolute = typeof to === "string" && ABSOLUTE_URL_REGEX2.test(to);
    let parsed = parseToInfo(to, basename);
    to = parsed.to;
    let href = useHref(to, { relative });
    let location = useLocation();
    let maskedHref = null;
    if (unstable_mask) {
      let resolved = resolveTo(
        unstable_mask,
        [],
        location.unstable_mask ? location.unstable_mask.pathname : "/",
        true
      );
      if (basename !== "/") {
        resolved.pathname = resolved.pathname === "/" ? basename : joinPaths([basename, resolved.pathname]);
      }
      maskedHref = navigator.createHref(resolved);
    }
    let [shouldPrefetch, prefetchRef, prefetchHandlers] = usePrefetchBehavior(
      prefetch,
      rest
    );
    let internalOnClick = useLinkClickHandler(to, {
      replace: replace2,
      unstable_mask,
      state,
      target,
      preventScrollReset,
      relative,
      viewTransition,
      unstable_defaultShouldRevalidate,
      unstable_useTransitions
    });
    function handleClick(event) {
      if (onClick) onClick(event);
      if (!event.defaultPrevented) {
        internalOnClick(event);
      }
    }
    let isSpaLink = !(parsed.isExternal || reloadDocument);
    let link = (
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      /* @__PURE__ */ reactExports.createElement(
        "a",
        {
          ...rest,
          ...prefetchHandlers,
          href: (isSpaLink ? maskedHref : void 0) || parsed.absoluteURL || href,
          onClick: isSpaLink ? handleClick : onClick,
          ref: mergeRefs(forwardedRef, prefetchRef),
          target,
          "data-discover": !isAbsolute && discover === "render" ? "true" : void 0
        }
      )
    );
    return shouldPrefetch && !isAbsolute ? /* @__PURE__ */ reactExports.createElement(reactExports.Fragment, null, link, /* @__PURE__ */ reactExports.createElement(PrefetchPageLinks, { page: href })) : link;
  }
);
Link.displayName = "Link";
var NavLink = reactExports.forwardRef(
  function NavLinkWithRef({
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = false,
    className: classNameProp = "",
    end = false,
    style: styleProp,
    to,
    viewTransition,
    children,
    ...rest
  }, ref) {
    let path = useResolvedPath(to, { relative: rest.relative });
    let location = useLocation();
    let routerState = reactExports.useContext(DataRouterStateContext);
    let { navigator, basename } = reactExports.useContext(NavigationContext);
    let isTransitioning = routerState != null && // Conditional usage is OK here because the usage of a data router is static
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useViewTransitionState(path) && viewTransition === true;
    let toPathname = navigator.encodeLocation ? navigator.encodeLocation(path).pathname : path.pathname;
    let locationPathname = location.pathname;
    let nextLocationPathname = routerState && routerState.navigation && routerState.navigation.location ? routerState.navigation.location.pathname : null;
    if (!caseSensitive) {
      locationPathname = locationPathname.toLowerCase();
      nextLocationPathname = nextLocationPathname ? nextLocationPathname.toLowerCase() : null;
      toPathname = toPathname.toLowerCase();
    }
    if (nextLocationPathname && basename) {
      nextLocationPathname = stripBasename(nextLocationPathname, basename) || nextLocationPathname;
    }
    const endSlashPosition = toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
    let isActive = locationPathname === toPathname || !end && locationPathname.startsWith(toPathname) && locationPathname.charAt(endSlashPosition) === "/";
    let isPending = nextLocationPathname != null && (nextLocationPathname === toPathname || !end && nextLocationPathname.startsWith(toPathname) && nextLocationPathname.charAt(toPathname.length) === "/");
    let renderProps = {
      isActive,
      isPending,
      isTransitioning
    };
    let ariaCurrent = isActive ? ariaCurrentProp : void 0;
    let className;
    if (typeof classNameProp === "function") {
      className = classNameProp(renderProps);
    } else {
      className = [
        classNameProp,
        isActive ? "active" : null,
        isPending ? "pending" : null,
        isTransitioning ? "transitioning" : null
      ].filter(Boolean).join(" ");
    }
    let style = typeof styleProp === "function" ? styleProp(renderProps) : styleProp;
    return /* @__PURE__ */ reactExports.createElement(
      Link,
      {
        ...rest,
        "aria-current": ariaCurrent,
        className,
        ref,
        style,
        to,
        viewTransition
      },
      typeof children === "function" ? children(renderProps) : children
    );
  }
);
NavLink.displayName = "NavLink";
var Form = reactExports.forwardRef(
  ({
    discover = "render",
    fetcherKey,
    navigate,
    reloadDocument,
    replace: replace2,
    state,
    method = defaultMethod,
    action,
    onSubmit,
    relative,
    preventScrollReset,
    viewTransition,
    unstable_defaultShouldRevalidate,
    ...props
  }, forwardedRef) => {
    let { unstable_useTransitions } = reactExports.useContext(NavigationContext);
    let submit = useSubmit();
    let formAction = useFormAction(action, { relative });
    let formMethod = method.toLowerCase() === "get" ? "get" : "post";
    let isAbsolute = typeof action === "string" && ABSOLUTE_URL_REGEX2.test(action);
    let submitHandler = (event) => {
      onSubmit && onSubmit(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      let submitter = event.nativeEvent.submitter;
      let submitMethod = submitter?.getAttribute("formmethod") || method;
      let doSubmit = () => submit(submitter || event.currentTarget, {
        fetcherKey,
        method: submitMethod,
        navigate,
        replace: replace2,
        state,
        relative,
        preventScrollReset,
        viewTransition,
        unstable_defaultShouldRevalidate
      });
      if (unstable_useTransitions && navigate !== false) {
        reactExports.startTransition(() => doSubmit());
      } else {
        doSubmit();
      }
    };
    return /* @__PURE__ */ reactExports.createElement(
      "form",
      {
        ref: forwardedRef,
        method: formMethod,
        action: formAction,
        onSubmit: reloadDocument ? onSubmit : submitHandler,
        ...props,
        "data-discover": !isAbsolute && discover === "render" ? "true" : void 0
      }
    );
  }
);
Form.displayName = "Form";
function getDataRouterConsoleError2(hookName) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function useDataRouterContext3(hookName) {
  let ctx = reactExports.useContext(DataRouterContext);
  invariant(ctx, getDataRouterConsoleError2(hookName));
  return ctx;
}
function useLinkClickHandler(to, {
  target,
  replace: replaceProp,
  unstable_mask,
  state,
  preventScrollReset,
  relative,
  viewTransition,
  unstable_defaultShouldRevalidate,
  unstable_useTransitions
} = {}) {
  let navigate = useNavigate();
  let location = useLocation();
  let path = useResolvedPath(to, { relative });
  return reactExports.useCallback(
    (event) => {
      if (shouldProcessLinkClick(event, target)) {
        event.preventDefault();
        let replace2 = replaceProp !== void 0 ? replaceProp : createPath(location) === createPath(path);
        let doNavigate = () => navigate(to, {
          replace: replace2,
          unstable_mask,
          state,
          preventScrollReset,
          relative,
          viewTransition,
          unstable_defaultShouldRevalidate
        });
        if (unstable_useTransitions) {
          reactExports.startTransition(() => doNavigate());
        } else {
          doNavigate();
        }
      }
    },
    [
      location,
      navigate,
      path,
      replaceProp,
      unstable_mask,
      state,
      target,
      to,
      preventScrollReset,
      relative,
      viewTransition,
      unstable_defaultShouldRevalidate,
      unstable_useTransitions
    ]
  );
}
var fetcherId = 0;
var getUniqueFetcherId = () => `__${String(++fetcherId)}__`;
function useSubmit() {
  let { router } = useDataRouterContext3(
    "useSubmit"
    /* UseSubmit */
  );
  let { basename } = reactExports.useContext(NavigationContext);
  let currentRouteId = useRouteId();
  let routerFetch = router.fetch;
  let routerNavigate = router.navigate;
  return reactExports.useCallback(
    async (target, options = {}) => {
      let { action, method, encType, formData, body } = getFormSubmissionInfo(
        target,
        basename
      );
      if (options.navigate === false) {
        let key = options.fetcherKey || getUniqueFetcherId();
        await routerFetch(key, currentRouteId, options.action || action, {
          unstable_defaultShouldRevalidate: options.unstable_defaultShouldRevalidate,
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          flushSync: options.flushSync
        });
      } else {
        await routerNavigate(options.action || action, {
          unstable_defaultShouldRevalidate: options.unstable_defaultShouldRevalidate,
          preventScrollReset: options.preventScrollReset,
          formData,
          body,
          formMethod: options.method || method,
          formEncType: options.encType || encType,
          replace: options.replace,
          state: options.state,
          fromRouteId: currentRouteId,
          flushSync: options.flushSync,
          viewTransition: options.viewTransition
        });
      }
    },
    [routerFetch, routerNavigate, basename, currentRouteId]
  );
}
function useFormAction(action, { relative } = {}) {
  let { basename } = reactExports.useContext(NavigationContext);
  let routeContext = reactExports.useContext(RouteContext);
  invariant(routeContext, "useFormAction must be used inside a RouteContext");
  let [match] = routeContext.matches.slice(-1);
  let path = { ...useResolvedPath(action ? action : ".", { relative }) };
  let location = useLocation();
  if (action == null) {
    path.search = location.search;
    let params = new URLSearchParams(path.search);
    let indexValues = params.getAll("index");
    let hasNakedIndexParam = indexValues.some((v) => v === "");
    if (hasNakedIndexParam) {
      params.delete("index");
      indexValues.filter((v) => v).forEach((v) => params.append("index", v));
      let qs = params.toString();
      path.search = qs ? `?${qs}` : "";
    }
  }
  if ((!action || action === ".") && match.route.index) {
    path.search = path.search ? path.search.replace(/^\?/, "?index&") : "?index";
  }
  if (basename !== "/") {
    path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
  }
  return createPath(path);
}
function useViewTransitionState(to, { relative } = {}) {
  let vtContext = reactExports.useContext(ViewTransitionContext);
  invariant(
    vtContext != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?"
  );
  let { basename } = useDataRouterContext3(
    "useViewTransitionState"
    /* useViewTransitionState */
  );
  let path = useResolvedPath(to, { relative });
  if (!vtContext.isTransitioning) {
    return false;
  }
  let currentPath = stripBasename(vtContext.currentLocation.pathname, basename) || vtContext.currentLocation.pathname;
  let nextPath = stripBasename(vtContext.nextLocation.pathname, basename) || vtContext.nextLocation.pathname;
  return matchPath(path.pathname, nextPath) != null || matchPath(path.pathname, currentPath) != null;
}
const ACTIVE_BG = "#0070cc";
const ACTIVE_TEXT = "#ffffff";
function FolderTab({
  label,
  tabId,
  active,
  zIndex,
  overlap = true,
  onClick,
  inactiveColor = "#ffffff",
  inactiveText = "#000000",
  icon
}) {
  const [bouncing, setBouncing] = reactExports.useState(false);
  const handleClick = () => {
    if (!active) {
      setBouncing(true);
      onClick();
    }
  };
  reactExports.useEffect(() => {
    if (bouncing) {
      const timer = setTimeout(() => setBouncing(false), 350);
      return () => clearTimeout(timer);
    }
  }, [bouncing]);
  const bgColor = active ? ACTIVE_BG : inactiveColor;
  const textColor = active ? ACTIVE_TEXT : inactiveText;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      "code-path": "src/components/cabinet/FolderTab.tsx:49:5",
      onClick: handleClick,
      className: `
        relative text-[14px] font-medium tracking-[0]
        flex items-center justify-center
        select-none cursor-pointer flex-shrink-0 truncate
        ${bouncing ? "animate-tab-bounce" : ""}
      `,
      style: {
        zIndex,
        backgroundColor: bgColor,
        color: textColor,
        clipPath: "none",
        border: active ? "1px solid #0070cc" : "1px solid #f3f3f3",
        borderRadius: "0",
        boxShadow: active ? "0 -2px 0 #005ea8 inset" : "none",
        marginLeft: overlap ? "0" : "0",
        paddingLeft: "28px",
        paddingRight: "28px",
        transition: "background-color 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
        transform: "translateY(0)",
        height: "56px",
        minWidth: "138px"
      },
      title: label,
      "data-tab-id": tabId,
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "code-path": "src/components/cabinet/FolderTab.tsx:76:7", className: "flex items-center gap-2 min-w-0", children: [
        icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/FolderTab.tsx:77:18", className: "flex h-4 w-4 items-center justify-center flex-shrink-0", children: icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/FolderTab.tsx:78:9", className: "truncate", children: label })
      ] })
    }
  );
}
const toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const toCamelCase = (string) => string.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
);
const toPascalCase = (string) => {
  const camelCase = toCamelCase(string);
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
const mergeClasses = (...classes) => classes.filter((className, index2, array) => {
  return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index2;
}).join(" ").trim();
const hasA11yProp = (props) => {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
      return true;
    }
  }
};
var defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
const Icon$1 = reactExports.forwardRef(
  ({
    color = "currentColor",
    size: size2 = 24,
    strokeWidth = 2,
    absoluteStrokeWidth,
    className = "",
    children,
    iconNode,
    ...rest
  }, ref) => reactExports.createElement(
    "svg",
    {
      ref,
      ...defaultAttributes,
      width: size2,
      height: size2,
      stroke: color,
      strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size2) : strokeWidth,
      className: mergeClasses("lucide", className),
      ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
      ...rest
    },
    [
      ...iconNode.map(([tag, attrs]) => reactExports.createElement(tag, attrs)),
      ...Array.isArray(children) ? children : [children]
    ]
  )
);
const createLucideIcon = (iconName, iconNode) => {
  const Component = reactExports.forwardRef(
    ({ className, ...props }, ref) => reactExports.createElement(Icon$1, {
      ref,
      iconNode,
      className: mergeClasses(
        `lucide-${toKebabCase(toPascalCase(iconName))}`,
        `lucide-${iconName}`,
        className
      ),
      ...props
    })
  );
  Component.displayName = toPascalCase(iconName);
  return Component;
};
const __iconNode$x = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode$x);
const __iconNode$w = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
];
const BookOpen = createLucideIcon("book-open", __iconNode$w);
const __iconNode$v = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]];
const Check = createLucideIcon("check", __iconNode$v);
const __iconNode$u = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
const ChevronDown = createLucideIcon("chevron-down", __iconNode$u);
const __iconNode$t = [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]];
const ChevronUp = createLucideIcon("chevron-up", __iconNode$t);
const __iconNode$s = [
  ["path", { d: "M12 6v6l4 2", key: "mmk7yg" }],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
];
const Clock = createLucideIcon("clock", __iconNode$s);
const __iconNode$r = [
  ["path", { d: "M12 15V3", key: "m9g1x1" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
];
const Download = createLucideIcon("download", __iconNode$r);
const __iconNode$q = [
  ["path", { d: "M21.54 15H17a2 2 0 0 0-2 2v4.54", key: "1djwo0" }],
  [
    "path",
    {
      d: "M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",
      key: "1tzkfa"
    }
  ],
  ["path", { d: "M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05", key: "14pb5j" }],
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }]
];
const Earth = createLucideIcon("earth", __iconNode$q);
const __iconNode$p = [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
];
const ExternalLink = createLucideIcon("external-link", __iconNode$p);
const __iconNode$o = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
];
const FileText = createLucideIcon("file-text", __iconNode$o);
const __iconNode$n = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M12 12v6", key: "3ahymv" }],
  ["path", { d: "m15 15-3-3-3 3", key: "15xj92" }]
];
const FileUp = createLucideIcon("file-up", __iconNode$n);
const __iconNode$m = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }]
];
const File = createLucideIcon("file", __iconNode$m);
const __iconNode$l = [
  [
    "path",
    {
      d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      key: "usdka0"
    }
  ]
];
const FolderOpen = createLucideIcon("folder-open", __iconNode$l);
const __iconNode$k = [
  ["line", { x1: "6", x2: "6", y1: "3", y2: "15", key: "17qcm7" }],
  ["circle", { cx: "18", cy: "6", r: "3", key: "1h7g24" }],
  ["circle", { cx: "6", cy: "18", r: "3", key: "fqmcym" }],
  ["path", { d: "M18 9a9 9 0 0 1-9 9", key: "n2h4wq" }]
];
const GitBranch = createLucideIcon("git-branch", __iconNode$k);
const __iconNode$j = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
];
const History = createLucideIcon("history", __iconNode$j);
const __iconNode$i = [
  ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8", key: "5wwlr5" }],
  [
    "path",
    {
      d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      key: "r6nss1"
    }
  ]
];
const House = createLucideIcon("house", __iconNode$i);
const __iconNode$h = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
];
const Image = createLucideIcon("image", __iconNode$h);
const __iconNode$g = [
  ["path", { d: "M10 8h.01", key: "1r9ogq" }],
  ["path", { d: "M12 12h.01", key: "1mp3jc" }],
  ["path", { d: "M14 8h.01", key: "1primd" }],
  ["path", { d: "M16 12h.01", key: "1l6xoz" }],
  ["path", { d: "M18 8h.01", key: "emo2bl" }],
  ["path", { d: "M6 8h.01", key: "x9i8wu" }],
  ["path", { d: "M7 16h10", key: "wp8him" }],
  ["path", { d: "M8 12h.01", key: "czm47f" }],
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }]
];
const Keyboard = createLucideIcon("keyboard", __iconNode$g);
const __iconNode$f = [
  [
    "path",
    {
      d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
      key: "zw3jo"
    }
  ],
  [
    "path",
    {
      d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      key: "1wduqc"
    }
  ],
  [
    "path",
    {
      d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
      key: "kqbvx6"
    }
  ]
];
const Layers = createLucideIcon("layers", __iconNode$f);
const __iconNode$e = [
  ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
  ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
  ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
  ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
];
const LayoutDashboard = createLucideIcon("layout-dashboard", __iconNode$e);
const __iconNode$d = [
  ["path", { d: "M4 5h16", key: "1tepv9" }],
  ["path", { d: "M4 12h16", key: "1lakjw" }],
  ["path", { d: "M4 19h16", key: "1djgab" }]
];
const Menu = createLucideIcon("menu", __iconNode$d);
const __iconNode$c = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
      key: "18887p"
    }
  ]
];
const MessageSquare = createLucideIcon("message-square", __iconNode$c);
const __iconNode$b = [
  [
    "path",
    {
      d: "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z",
      key: "edeuup"
    }
  ]
];
const MousePointer2 = createLucideIcon("mouse-pointer-2", __iconNode$b);
const __iconNode$a = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
];
const Plus = createLucideIcon("plus", __iconNode$a);
const __iconNode$9 = [
  ["path", { d: "M2 3h20", key: "91anmk" }],
  ["path", { d: "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3", key: "2k9sn8" }],
  ["path", { d: "m7 21 5-5 5 5", key: "bip4we" }]
];
const Presentation = createLucideIcon("presentation", __iconNode$9);
const __iconNode$8 = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode$8);
const __iconNode$7 = [
  [
    "path",
    {
      d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      key: "1i5ecw"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
];
const Settings = createLucideIcon("settings", __iconNode$7);
const __iconNode$6 = [
  ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }],
  ["circle", { cx: "6", cy: "12", r: "3", key: "w7nqdw" }],
  ["circle", { cx: "18", cy: "19", r: "3", key: "1xt0gg" }],
  ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49", key: "47mynk" }],
  ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49", key: "1n3mei" }]
];
const Share2 = createLucideIcon("share-2", __iconNode$6);
const __iconNode$5 = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
      key: "1s2grr"
    }
  ],
  ["path", { d: "M20 2v4", key: "1rf3ol" }],
  ["path", { d: "M22 4h-4", key: "gwowj6" }],
  ["circle", { cx: "4", cy: "20", r: "2", key: "6kqj1y" }]
];
const Sparkles = createLucideIcon("sparkles", __iconNode$5);
const __iconNode$4 = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      key: "r04s7s"
    }
  ]
];
const Star = createLucideIcon("star", __iconNode$4);
const __iconNode$3 = [
  ["path", { d: "M10 11v6", key: "nco0om" }],
  ["path", { d: "M14 11v6", key: "outv1u" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
];
const Trash2 = createLucideIcon("trash-2", __iconNode$3);
const __iconNode$2 = [
  ["path", { d: "M12 3v12", key: "1x0j5s" }],
  ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }]
];
const Upload = createLucideIcon("upload", __iconNode$2);
const __iconNode$1 = [
  [
    "path",
    {
      d: "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
      key: "ftymec"
    }
  ],
  ["rect", { x: "2", y: "6", width: "14", height: "12", rx: "2", key: "158x01" }]
];
const Video = createLucideIcon("video", __iconNode$1);
const __iconNode = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
];
const X = createLucideIcon("x", __iconNode);
function SidebarItem({ title, summary, selected, onClick, icon }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      "code-path": "src/components/cabinet/SidebarItem.tsx:13:5",
      onClick,
      className: `
        w-full text-left px-4 py-3 relative
        transition-colors duration-0
        ${selected ? "bg-cabinet-itemBg" : "hover:bg-cabinet-itemBg"}
      `,
      children: [
        selected && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "code-path": "src/components/cabinet/SidebarItem.tsx:22:9",
            className: "absolute left-0 top-2 bottom-2 w-[3px] bg-cabinet-blue rounded-r-full"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/SidebarItem.tsx:26:7", className: "flex items-center gap-2", children: [
          icon && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/SidebarItem.tsx:27:18", className: "flex-shrink-0 w-4 h-4 flex items-center justify-center", children: icon }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/SidebarItem.tsx:28:9", className: "text-sm font-medium text-cabinet-ink truncate leading-tight", children: title })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/SidebarItem.tsx:32:7", className: "text-xs text-cabinet-ink2 truncate mt-1 leading-tight", children: summary })
      ]
    }
  );
}
function Sidebar({
  title,
  items,
  selectedId,
  onSelect,
  onCreate,
  emptyMessage = "No items",
  className = ""
}) {
  const grouped = items.reduce((acc, item) => {
    const label = item.groupLabel || "Other";
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});
  const groupOrder = items.map((item) => item.groupLabel || "Other").filter((label, index2, arr) => arr.indexOf(label) === index2);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/Sidebar.tsx:46:5", className: `bg-cabinet-paper border-r border-cabinet-border flex flex-col h-full ${className || "w-[280px] min-w-[280px]"}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/Sidebar.tsx:48:7", className: "flex items-center justify-between px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/Sidebar.tsx:49:9", className: "text-sm font-medium text-cabinet-ink", children: title }),
      onCreate && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          "code-path": "src/components/cabinet/Sidebar.tsx:51:11",
          onClick: onCreate,
          className: "w-5 h-5 flex items-center justify-center rounded hover:bg-cabinet-itemBg transition-colors",
          title: "Create new",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { "code-path": "src/components/cabinet/Sidebar.tsx:56:13", size: 14, className: "text-cabinet-ink2" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/Sidebar.tsx:62:7", className: "border-b border-cabinet-border" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/Sidebar.tsx:65:7", className: "flex-1 overflow-y-auto cabinet-scrollbar", children: items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/Sidebar.tsx:67:11", className: "px-4 py-6 text-sm text-cabinet-inkMuted", children: emptyMessage }) : groupOrder.map((groupLabel) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/Sidebar.tsx:70:13", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/Sidebar.tsx:72:15", className: "px-4 pt-4 pb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/Sidebar.tsx:73:17", className: "text-[12px] font-medium text-cabinet-inkMuted tracking-[0]", children: groupLabel }) }),
      grouped[groupLabel]?.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        SidebarItem,
        {
          "code-path": "src/components/cabinet/Sidebar.tsx:79:17",
          title: item.title,
          summary: item.summary,
          selected: selectedId === item.id,
          onClick: () => onSelect(item.id),
          icon: item.icon
        },
        item.id
      ))
    ] }, groupLabel)) })
  ] });
}
function formatBytes$1(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function isImageAsset$1(asset) {
  return asset.mimeType.startsWith("image/");
}
function isVideoAsset$1(asset) {
  return asset.mimeType.startsWith("video/");
}
function isDocumentAsset$1(asset) {
  return asset.kind === "upload" && !isImageAsset$1(asset) && !isVideoAsset$1(asset);
}
function titleFromUrl(url, fallback) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}
function summarizeText(value, max2 = 82) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max2 ? `${clean.slice(0, max2)}...` : clean;
}
function firstText$1(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
function isUrl(value) {
  return /^https?:\/\//i.test(value.trim());
}
function readableTitle$1(fallback, ...values) {
  const candidates = values.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
  const title = candidates.find((value) => !isUrl(value));
  if (title) return title;
  return candidates[0] ? titleFromUrl(candidates[0], fallback) : fallback;
}
function nodeWebReferences(node) {
  const refs = node.data?.option?.references || node.data?.references || node.data?.sourceCard?.references;
  return Array.isArray(refs) ? refs : [];
}
function nodeImageUrl$1(node) {
  const direct = node.data?.imageUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.imageUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
  if (typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash)) {
    return `/api/assets/${hash}?kind=upload`;
  }
  return null;
}
function nodeVideoUrl$1(node) {
  const direct = node.data?.videoUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceVideoUrl || node.data?.sourceCard?.videoUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.videoHash || node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash;
  if (typeof hash === "string" && /^[a-f0-9]{64}$/i.test(hash)) {
    return `/api/assets/${hash}?kind=${node.type === "generated" ? "generated" : "upload"}`;
  }
  return null;
}
function nodeWebUrl$1(node) {
  const contentUrl = node.data?.option?.content?.url;
  if (typeof contentUrl === "string" && contentUrl) return contentUrl;
  const direct = node.data?.sourceUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceUrl;
  if (typeof card === "string" && card) return card;
  const first = nodeWebReferences(node).find((r2) => typeof r2?.url === "string" && r2.url);
  if (first) return first.url;
  return null;
}
function imageItems(session, t) {
  const fromAssets = session.assets.filter(isImageAsset$1).map((asset) => ({
    id: asset.id,
    title: asset.fileName || (asset.kind === "generated" ? t("asset.generatedImage") : t("asset.uploadedFile")),
    summary: `${asset.mimeType} · ${formatBytes$1(asset.fileSize)}`,
    groupLabel: t("history.tabImages"),
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { "code-path": "src/components/cabinet/AssetSidebar.tsx:120:11", size: 16, className: "text-cabinet-blue" })
  }));
  const referencedHashes = new Set(session.assets.map((a) => a.hash));
  const fromNodes = session.nodes.filter((node) => {
    if (node.type !== "source-card") return false;
    const url = nodeImageUrl$1(node);
    if (!url) return false;
    const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
    if (typeof hash === "string" && referencedHashes.has(hash)) return false;
    return true;
  }).map((node) => {
    const card = node.data?.sourceCard || {};
    const title = String(card.fileName || card.title || node.data?.fileName || t("asset.generatedImage"));
    const summary = String(card.summary || card.sourceUrl || node.data?.summary || t("history.imageReference"));
    return {
      id: node.id,
      title,
      summary: summarizeText(summary),
      groupLabel: t("history.imageRefGroup"),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { "code-path": "src/components/cabinet/AssetSidebar.tsx:142:15", size: 16, className: "text-cabinet-blue" })
    };
  });
  return [...fromAssets, ...fromNodes];
}
function videoItems(session, t) {
  const fromAssets = session.assets.filter(isVideoAsset$1).map((asset) => ({
    id: asset.id,
    title: asset.fileName || (asset.kind === "generated" ? t("asset.generatedVideo") : t("asset.video")),
    summary: `${asset.mimeType} · ${formatBytes$1(asset.fileSize)}`,
    groupLabel: t("history.tabVideos"),
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { "code-path": "src/components/cabinet/AssetSidebar.tsx:155:11", size: 16, className: "text-cabinet-blue" })
  }));
  const referencedHashes = new Set(session.assets.map((a) => a.hash));
  const fromNodes = session.nodes.filter((node) => {
    if (node.type !== "source-card") return false;
    if (!nodeVideoUrl$1(node)) return false;
    const hash = node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash;
    if (typeof hash === "string" && referencedHashes.has(hash)) return false;
    return true;
  }).map((node) => {
    const card = node.data?.sourceCard || {};
    const title = String(card.fileName || card.title || node.data?.fileName || t("asset.video"));
    const summary = String(card.summary || card.sourceUrl || node.data?.summary || t("asset.video"));
    return {
      id: node.id,
      title,
      summary: summarizeText(summary),
      groupLabel: t("history.tabVideos"),
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { "code-path": "src/components/cabinet/AssetSidebar.tsx:176:15", size: 16, className: "text-cabinet-blue" })
    };
  });
  return [...fromAssets, ...fromNodes];
}
function webItems(session, t) {
  const items = [];
  for (const node of session.nodes) {
    const url = nodeWebUrl$1(node);
    if (!url) continue;
    const content = node.data?.option?.content && typeof node.data.option.content === "object" ? node.data.option.content : {};
    const firstRef = nodeWebReferences(node).find((r2) => typeof r2?.url === "string" && r2.url);
    const title = readableTitle$1(
      t("asset.webLink"),
      content.title,
      node.data?.sourceCard?.title,
      node.data?.option?.title,
      node.data?.title,
      firstRef?.title,
      url
    );
    const description = firstText$1(
      content.description,
      content.mainContent,
      content.markdown,
      content.text,
      node.data?.sourceCard?.summary,
      node.data?.option?.description,
      firstRef?.description,
      url
    );
    const isDeepThink = node.data?.option?.layoutHint === "deep-think";
    items.push({
      id: node.id,
      title: summarizeText(String(title), 60),
      summary: summarizeText(String(description), 90),
      groupLabel: isDeepThink ? t("history.deepThinkGroup") : t("history.tabWeb"),
      icon: isDeepThink ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { "code-path": "src/components/cabinet/AssetSidebar.tsx:216:11", size: 16, className: "text-cabinet-blue" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Earth, { "code-path": "src/components/cabinet/AssetSidebar.tsx:217:11", size: 16, className: "text-cabinet-blue" })
    });
  }
  return items;
}
function documentItems(session, t) {
  const files = session.assets.filter(isDocumentAsset$1).map((asset) => ({
    id: asset.id,
    title: asset.fileName || t("asset.document"),
    summary: `${asset.mimeType} · ${formatBytes$1(asset.fileSize)}`,
    groupLabel: t("asset.files"),
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { "code-path": "src/components/cabinet/AssetSidebar.tsx:229:11", size: 16, className: "text-cabinet-blue" })
  }));
  const textSources = session.nodes.filter((node) => node.type === "source" && node.data?.sourceType === "text").map((node) => ({
    id: node.id,
    title: node.data?.fileName || t("asset.document"),
    summary: summarizeText(String(node.data?.sourceText || t("asset.document"))),
    groupLabel: t("history.textSources"),
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { "code-path": "src/components/cabinet/AssetSidebar.tsx:239:13", size: 16, className: "text-cabinet-blue" })
  }));
  const deepThinkNotes = session.nodes.filter((node) => {
    if (node.type !== "option") return false;
    if (node.data?.option?.layoutHint !== "deep-think") return false;
    const refs = node.data?.option?.references || node.data?.references || [];
    return !Array.isArray(refs) || refs.length === 0 || !refs.some((r2) => r2?.url);
  }).map((node) => ({
    id: node.id,
    title: String(node.data?.option?.title || node.data?.title || t("history.deepThinkGroup")),
    summary: summarizeText(String(node.data?.option?.description || node.data?.description || "")),
    groupLabel: t("history.deepThinkGroup"),
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { "code-path": "src/components/cabinet/AssetSidebar.tsx:254:13", size: 16, className: "text-cabinet-blue" })
  }));
  return [...files, ...textSources, ...deepThinkNotes];
}
function chatItems(session, t) {
  return session.chatMessages.slice(0, 80).map((msg) => ({
    id: msg.id,
    title: msg.role === "user" ? t("detail.you") : t("detail.ai"),
    summary: summarizeText(msg.content),
    groupLabel: t("share.chatRecord"),
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { "code-path": "src/components/cabinet/AssetSidebar.tsx:266:11", size: 16, className: "text-cabinet-blue" })
  }));
}
function buildOutputItems(session, outputKind, t) {
  if (!session) return [];
  if (outputKind === "image") return imageItems(session, t);
  if (outputKind === "video") return videoItems(session, t);
  if (outputKind === "web") return webItems(session, t);
  if (outputKind === "chat") return chatItems(session, t);
  return documentItems(session, t);
}
function AssetSidebar({ session, outputKind, selectedAssetId, onSelectAsset }) {
  const { t } = useI18n();
  const items = buildOutputItems(session, outputKind, t);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Sidebar,
    {
      "code-path": "src/components/cabinet/AssetSidebar.tsx:288:5",
      title: t("history.outputContents"),
      items,
      selectedId: selectedAssetId,
      onSelect: onSelectAsset,
      emptyMessage: t("history.noOutputsInFolder"),
      className: "w-full min-w-0"
    }
  );
}
function safeHref(value) {
  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return "#";
}
function parseInline(text, keyPrefix) {
  const nodes = [];
  let rest = text;
  let index2 = 0;
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/;
  while (rest) {
    const match = rest.match(pattern);
    if (!match || match.index === void 0) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const key = `${keyPrefix}-inline-${index2++}`;
    if (match[2] && match[3]) {
      nodes.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { "code-path": "src/components/cabinet/MarkdownContent.tsx:34:9", href: safeHref(match[3]), target: "_blank", rel: "noopener noreferrer", className: "text-cabinet-blue hover:underline break-words", children: parseInline(match[2], key) }, key)
      );
    } else if (match[5]) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("code", { "code-path": "src/components/cabinet/MarkdownContent.tsx:39:18", className: "rounded bg-cabinet-itemBg px-1 py-0.5 text-[0.92em]", children: match[5] }, key));
    } else if (match[7] || match[9]) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("strong", { "code-path": "src/components/cabinet/MarkdownContent.tsx:41:18", className: "font-semibold", children: parseInline(match[7] || match[9], key) }, key));
    } else if (match[11] || match[13]) {
      nodes.push(/* @__PURE__ */ jsxRuntimeExports.jsx("em", { "code-path": "src/components/cabinet/MarkdownContent.tsx:43:18", className: "italic", children: parseInline(match[11] || match[13], key) }, key));
    }
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}
function parseTable(lines, keyPrefix) {
  if (lines.length < 2) return null;
  const separator = lines[1].trim();
  if (!/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator)) return null;
  const split = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const headers = split(lines[0]);
  const rows = lines.slice(2).map(split);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/MarkdownContent.tsx:60:5", className: "my-4 overflow-x-auto rounded-2xl border border-cabinet-border", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { "code-path": "src/components/cabinet/MarkdownContent.tsx:61:7", className: "min-w-full text-left text-[14px]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { "code-path": "src/components/cabinet/MarkdownContent.tsx:62:9", className: "bg-cabinet-bg text-cabinet-ink", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { "code-path": "src/components/cabinet/MarkdownContent.tsx:63:11", children: headers.map((header, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { "code-path": "src/components/cabinet/MarkdownContent.tsx:65:15", className: "border-b border-cabinet-border px-3 py-2 font-semibold", children: parseInline(header, `${keyPrefix}-th-${idx}`) }, `${keyPrefix}-th-${idx}`)) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { "code-path": "src/components/cabinet/MarkdownContent.tsx:71:9", children: rows.map((row, rowIdx) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { "code-path": "src/components/cabinet/MarkdownContent.tsx:73:13", className: "odd:bg-cabinet-paper even:bg-cabinet-bg/50", children: headers.map((_, cellIdx) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "code-path": "src/components/cabinet/MarkdownContent.tsx:75:17", className: "border-t border-cabinet-border px-3 py-2 align-top", children: parseInline(row[cellIdx] || "", `${keyPrefix}-td-${rowIdx}-${cellIdx}`) }, `${keyPrefix}-td-${rowIdx}-${cellIdx}`)) }, `${keyPrefix}-tr-${rowIdx}`)) })
  ] }) }, `${keyPrefix}-table`);
}
function flushParagraph(paragraph, blocks, keyPrefix) {
  if (!paragraph.length) return;
  const text = paragraph.join("\n").trim();
  if (!text) return;
  blocks.push(
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/cabinet/MarkdownContent.tsx:92:5", className: "my-3 leading-[1.75] whitespace-pre-wrap break-words", children: parseInline(text, `${keyPrefix}-p-${blocks.length}`) }, `${keyPrefix}-p-${blocks.length}`)
  );
  paragraph.length = 0;
}
function MarkdownContent({ content, className = "", maxLength }) {
  const raw = String(content || "").trim();
  const source = maxLength && raw.length > maxLength ? `${raw.slice(0, maxLength)}…` : raw;
  if (!source) return null;
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const paragraph = [];
  let index2 = 0;
  while (index2 < lines.length) {
    const line = lines[index2];
    const trimmed = line.trim();
    const keyPrefix = `md-${index2}-${blocks.length}`;
    if (!trimmed) {
      flushParagraph(paragraph, blocks, keyPrefix);
      index2 += 1;
      continue;
    }
    if (trimmed.startsWith("```")) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const language = trimmed.slice(3).trim();
      const code = [];
      index2 += 1;
      while (index2 < lines.length && !lines[index2].trim().startsWith("```")) {
        code.push(lines[index2]);
        index2 += 1;
      }
      blocks.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("pre", { "code-path": "src/components/cabinet/MarkdownContent.tsx:130:9", className: "my-4 max-h-[520px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4 text-[13px] leading-relaxed text-cabinet-ink whitespace-pre-wrap break-words", children: [
          language && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/MarkdownContent.tsx:131:24", className: "mb-2 text-[12px] text-cabinet-inkMuted", children: language }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { "code-path": "src/components/cabinet/MarkdownContent.tsx:132:11", children: code.join("\n") })
        ] }, `${keyPrefix}-code`)
      );
      index2 += 1;
      continue;
    }
    const table = parseTable(lines.slice(index2, index2 + Math.max(2, lines.length - index2)).filter((item) => item.trim().includes("|")), keyPrefix);
    if (trimmed.includes("|") && index2 + 1 < lines.length && lines[index2 + 1].includes("|") && table) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const tableLines = [];
      while (index2 < lines.length && lines[index2].trim().includes("|")) {
        tableLines.push(lines[index2]);
        index2 += 1;
      }
      blocks.push(parseTable(tableLines, keyPrefix));
      continue;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const level = heading[1].length;
      const sizes = ["text-[22px]", "text-[19px]", "text-[17px]", "text-[15px]", "text-[14px]", "text-[13px]"];
      blocks.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/MarkdownContent.tsx:157:9", className: `${sizes[level - 1]} mt-5 mb-2 font-semibold leading-snug text-cabinet-ink break-words`, children: parseInline(heading[2], `${keyPrefix}-h`) }, `${keyPrefix}-h`)
      );
      index2 += 1;
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const quote = [];
      while (index2 < lines.length && /^>\s?/.test(lines[index2].trim())) {
        quote.push(lines[index2].trim().replace(/^>\s?/, ""));
        index2 += 1;
      }
      blocks.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { "code-path": "src/components/cabinet/MarkdownContent.tsx:173:9", className: "my-4 border-l-4 border-cabinet-blue bg-cabinet-bg px-4 py-3 text-[14px] text-cabinet-inkMuted", children: parseInline(quote.join("\n"), `${keyPrefix}-quote`) }, `${keyPrefix}-quote`)
      );
      continue;
    }
    if (/^([-*+] |\d+[.)]\s+)/.test(trimmed)) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items = [];
      while (index2 < lines.length && /^([-*+] |\d+[.)]\s+)/.test(lines[index2].trim())) {
        items.push(lines[index2].trim().replace(/^([-*+] |\d+[.)]\s+)/, ""));
        index2 += 1;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tag, { "code-path": "src/components/cabinet/MarkdownContent.tsx:190:9", className: `my-3 space-y-1 pl-5 text-[15px] leading-[1.7] ${ordered ? "list-decimal" : "list-disc"}`, children: items.map((item, itemIdx) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { "code-path": "src/components/cabinet/MarkdownContent.tsx:192:13", className: "break-words", children: parseInline(item, `${keyPrefix}-li-${itemIdx}`) }, `${keyPrefix}-li-${itemIdx}`)) }, `${keyPrefix}-list`)
      );
      continue;
    }
    paragraph.push(line);
    index2 += 1;
  }
  flushParagraph(paragraph, blocks, "md-end");
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/MarkdownContent.tsx:207:10", className: `text-[15px] leading-[1.7] text-cabinet-ink ${className}`, children: blocks });
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function MetadataGrid({ rows }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:24:5", className: "grid grid-cols-2 gap-x-6 gap-y-2 mt-4", children: rows.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:26:9", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:27:11", className: "text-[13px] text-cabinet-inkMuted", children: row.label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:28:11", className: "text-[14px] text-cabinet-ink break-all", children: row.value })
  ] }, row.label)) });
}
function firstText(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}
function looksLikeUrl(value) {
  return /^https?:\/\//i.test(value.trim());
}
function urlHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function readableTitle(...values) {
  const candidates = values.filter((value) => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
  const title = candidates.find((value) => !looksLikeUrl(value));
  if (title) return title;
  return candidates[0] ? urlHost(candidates[0]) : "";
}
function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}
function webReferences(node) {
  const refs = node.data?.option?.references || node.data?.references || node.data?.sourceCard?.references;
  return Array.isArray(refs) ? refs : [];
}
function webContentText(content) {
  if (!content || typeof content !== "object") return "";
  return firstText(content.mainContent, content.markdown, content.text, content.body, content.content, content.summary, content.description);
}
function ImageAssetDetail({ asset, nodes }) {
  const { t } = useI18n();
  const url = buildAssetUrl(asset.hash, asset.kind);
  const title = asset.fileName || (asset.kind === "generated" ? t("asset.generatedImage") : t("asset.uploadedFile"));
  const matchingNode = nodes?.find((n) => n.data?.imageHash === asset.hash);
  const explanation = matchingNode?.data?.explanation;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:82:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:83:7",
        src: url,
        alt: title,
        loading: "lazy",
        className: "max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      MetadataGrid,
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:89:7",
        rows: [
          { label: t("detail.fileName"), value: asset.fileName || "—" },
          { label: t("detail.mimeType"), value: asset.mimeType },
          { label: t("detail.size"), value: formatBytes(asset.fileSize) },
          { label: t("detail.hash"), value: `${asset.hash.slice(0, 16)}...` },
          { label: t("detail.created"), value: new Date(asset.createdAt).toLocaleString() }
        ]
      }
    ),
    explanation && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:99:9", className: "mt-4 p-4 bg-cabinet-bg rounded-3xl border border-cabinet-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:100:11", className: "text-xs font-medium text-cabinet-inkMuted mb-1", children: t("detail.explanation") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:101:11", content: explanation, className: "text-sm" })
    ] })
  ] });
}
function VideoAssetDetail({ asset, nodes }) {
  const { t } = useI18n();
  const url = buildAssetUrl(asset.hash, asset.kind);
  const title = asset.fileName || t("asset.generatedVideo");
  const matchingNode = nodes?.find((n) => n.data?.videoHash === asset.hash);
  const explanation = matchingNode?.data?.explanation;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:115:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:116:7",
        src: url,
        controls: true,
        playsInline: true,
        preload: "metadata",
        className: "max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] bg-black"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:123:7", className: "text-[18px] font-medium text-cabinet-ink leading-tight mt-5 break-words", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      MetadataGrid,
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:124:7",
        rows: [
          { label: t("detail.fileName"), value: asset.fileName || "—" },
          { label: t("detail.mimeType"), value: asset.mimeType },
          { label: t("detail.size"), value: formatBytes(asset.fileSize) },
          { label: t("detail.hash"), value: `${asset.hash.slice(0, 16)}...` },
          { label: t("detail.created"), value: new Date(asset.createdAt).toLocaleString() }
        ]
      }
    ),
    explanation && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:134:9", className: "mt-4 p-4 bg-cabinet-bg rounded-3xl border border-cabinet-border", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:135:11", className: "text-xs font-medium text-cabinet-inkMuted mb-1", children: t("detail.prompt") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:136:11", content: explanation, className: "text-sm" })
    ] })
  ] });
}
function FileAssetDetail({ asset }) {
  const { t } = useI18n();
  const [preview, setPreview] = reactExports.useState(null);
  reactExports.useEffect(() => {
    if (!asset.mimeType.startsWith("text/")) return;
    let cancelled = false;
    fetch(`/api/assets/${asset.hash}?kind=upload`).then((res) => {
      if (!res.ok) throw new Error("Failed to load file");
      return res.text();
    }).then((text) => {
      if (!cancelled) setPreview(text.slice(0, 2e3));
    }).catch(() => {
      if (!cancelled) setPreview(null);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.hash, asset.mimeType]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:165:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:166:7", className: "flex flex-col items-center justify-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(File, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:167:9", size: 64, className: "text-cabinet-inkMuted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:168:9", className: "text-[15px] text-cabinet-ink mt-4 font-medium", children: asset.fileName || t("asset.uploadedFile") })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      MetadataGrid,
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:172:7",
        rows: [
          { label: t("detail.fileName"), value: asset.fileName || "—" },
          { label: t("detail.mimeType"), value: asset.mimeType },
          { label: t("detail.size"), value: formatBytes(asset.fileSize) },
          { label: t("detail.hash"), value: `${asset.hash.slice(0, 16)}...` },
          { label: t("detail.created"), value: new Date(asset.createdAt).toLocaleString() }
        ]
      }
    ),
    preview !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:182:9", className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:183:11", className: "text-[13px] text-cabinet-inkMuted mb-1", children: t("detail.preview") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:184:11", className: "max-h-[360px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:185:13", content: preview }) })
    ] })
  ] });
}
function LinkAssetDetail({ node }) {
  const { t } = useI18n();
  const refs = webReferences(node);
  const firstRef = refs.find((ref) => typeof ref?.url === "string" && ref.url);
  const content = node.data?.option?.content && typeof node.data.option.content === "object" ? node.data.option.content : {};
  const url = firstText(content.url, node.data?.sourceUrl, node.data?.sourceCard?.sourceUrl, firstRef?.url);
  const title = readableTitle(content.title, node.data?.option?.title, node.data?.sourceCard?.title, node.data?.fileName, firstRef?.title, url);
  const description = firstText(content.description, node.data?.option?.description, node.data?.sourceCard?.summary, firstRef?.description, node.data?.summary);
  const mainContent = firstText(webContentText(content), node.data?.sourceCard?.sourceText, node.data?.sourceText, description);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:203:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:204:7", className: "flex items-start gap-4 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:205:9", className: "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cabinet-blue/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:206:11", size: 22, className: "text-cabinet-blue" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:208:9", className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:209:11", className: "text-[22px] font-medium text-cabinet-ink leading-tight break-words", children: title || t("asset.webLink") }),
        url && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            "code-path": "src/components/cabinet/AssetDetailPane.tsx:211:13",
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "mt-2 block text-[14px] text-cabinet-blue hover:underline break-all",
            children: url
          }
        )
      ] })
    ] }),
    description && description !== mainContent && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:223:9", className: "mt-6 rounded-3xl border border-cabinet-border bg-cabinet-bg px-5 py-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:224:11", className: "text-[13px] font-medium text-cabinet-inkMuted mb-2", children: t("detail.webSummary") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:225:11", content: description })
    ] }),
    mainContent && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:229:9", className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:230:11", className: "text-[13px] font-medium text-cabinet-inkMuted mb-2", children: t("detail.webMainContent") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:231:11", content: mainContent, maxLength: 12e3, className: "rounded-3xl border border-cabinet-border bg-cabinet-paper p-5" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceList, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:234:7", references: refs, label: t("history.references") }),
    !mainContent && !description && url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:236:9", className: "mt-6 rounded-3xl border border-cabinet-border bg-cabinet-bg px-5 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:237:11", content: url }) })
  ] });
}
function TextNodeDetail({ node }) {
  const { t } = useI18n();
  const title = node.data?.fileName || t("asset.document");
  const sourceText = String(node.data?.sourceText || "");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:249:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:250:7", className: "flex flex-col items-center justify-center py-10", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(File, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:251:9", size: 64, className: "text-cabinet-inkMuted" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:252:9", className: "text-[15px] text-cabinet-ink mt-4 font-medium text-center", children: title })
    ] }),
    sourceText && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:257:9", className: "mt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:258:11", className: "text-[13px] text-cabinet-inkMuted mb-1", children: t("detail.preview") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:259:11", className: "max-h-[520px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:260:13", content: sourceText, maxLength: 12e3 }) })
    ] })
  ] });
}
function ReferenceList({ references, label }) {
  if (!references?.length) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:271:5", className: "mt-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:272:7", className: "text-[13px] font-medium text-cabinet-inkMuted mb-2", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:273:7", className: "space-y-2", children: references.map((ref, idx) => {
      const url = typeof ref?.url === "string" ? ref.url : "";
      const title = String(ref?.title || url || "Reference");
      const description = ref?.description ? String(ref.description) : "";
      return /* @__PURE__ */ jsxRuntimeExports.jsx(
        "li",
        {
          "code-path": "src/components/cabinet/AssetDetailPane.tsx:279:13",
          className: "rounded-2xl border border-cabinet-border bg-cabinet-bg px-4 py-3",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:283:15", className: "flex items-start gap-2", children: [
            ref?.type === "image" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:285:21", size: 16, className: "text-cabinet-blue mt-0.5 flex-shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:286:21", size: 16, className: "text-cabinet-blue mt-0.5 flex-shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:287:17", className: "min-w-0 flex-1", children: [
              url ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  "code-path": "src/components/cabinet/AssetDetailPane.tsx:289:21",
                  href: url,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "text-[14px] font-medium text-cabinet-blue hover:underline break-all",
                  children: title
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:298:21", className: "text-[14px] font-medium text-cabinet-ink break-all", children: title }),
              description && /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:301:21", content: description, className: "mt-1 text-[13px] text-cabinet-inkMuted" })
            ] })
          ] })
        },
        `${url}-${idx}`
      );
    }) })
  ] });
}
function optionContentPreview(content) {
  if (!content || typeof content !== "object") return "";
  const direct = String(content.mainContent || content.markdown || content.text || content.body || content.content || content.summary || content.description || "").trim();
  if (direct) return direct;
  if (Array.isArray(content.sections)) {
    return content.sections.map((section) => {
      const record = asRecord(section);
      return [`## ${record.title || ""}`.trim(), String(record.body || record.text || "").trim()].filter(Boolean).join("\n\n");
    }).filter(Boolean).join("\n\n");
  }
  if (Array.isArray(content.steps)) {
    return content.steps.map((step, index2) => {
      const record = asRecord(step);
      const label = String(record.title || record.name || (typeof step === "string" ? step : "")).trim();
      return `${index2 + 1}. ${label}${record.description ? `
   ${String(record.description).trim()}` : ""}`;
    }).join("\n");
  }
  if (Array.isArray(content.items)) {
    return content.items.map((item) => {
      const record = asRecord(item);
      const label = String(record.text || record.title || record.label || (typeof item === "string" ? item : "")).trim();
      return `- ${label}${record.description ? ` — ${String(record.description).trim()}` : ""}`;
    }).join("\n");
  }
  if (Array.isArray(content.metrics)) {
    return content.metrics.map((item) => {
      const record = asRecord(item);
      return `- ${String(record.label || "").trim()}: ${String(record.value || "").trim()}${record.note ? ` — ${String(record.note).trim()}` : ""}`;
    }).join("\n");
  }
  if (Array.isArray(content.quotes)) {
    return content.quotes.map((item) => {
      const record = asRecord(item);
      const text = String(record.text || record.quote || (typeof item === "string" ? item : "")).trim();
      return `> ${text}${record.source ? `
— ${String(record.source).trim()}` : ""}`;
    }).join("\n\n");
  }
  if (Array.isArray(content.columns) && Array.isArray(content.rows)) {
    const columns = content.columns.map((column) => String(column || "").trim());
    const rows = content.rows.slice(0, 80).map((row) => {
      if (Array.isArray(row)) return row.map((cell) => String(cell ?? "").trim());
      const record = asRecord(row);
      return columns.map((column) => String(record[column] ?? record[column.toLowerCase()] ?? "").trim());
    });
    return [
      `| ${columns.join(" | ")} |`,
      `| ${columns.map(() => "---").join(" | ")} |`,
      ...rows.map((row) => `| ${row.join(" | ")} |`)
    ].join("\n");
  }
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return "";
  }
}
function OptionNodeDetail({ node }) {
  const { t } = useI18n();
  const option = node.data?.option || {};
  const references = Array.isArray(option.references) ? option.references : Array.isArray(node.data?.references) ? node.data.references : [];
  const firstWebRef = references.find((ref) => typeof ref?.url === "string" && ref.url);
  const content = option.content && typeof option.content === "object" ? option.content : null;
  const isWeb = Boolean(firstWebRef || content?.url || option.nodeType === "link");
  const title = isWeb ? readableTitle(content?.title, option.title, node.data?.title, firstWebRef?.title, content?.url, firstWebRef?.url, t("asset.webLink")) : String(option.title || node.data?.title || t("history.deepThinkGroup"));
  const description = isWeb ? firstText(content?.description, option.description, node.data?.description, firstWebRef?.description) : String(option.description || node.data?.description || "");
  const tone = option.tone ? String(option.tone) : null;
  const prompt = option.prompt ? String(option.prompt) : "";
  const contentText = firstText(optionContentPreview(content), isWeb ? description : "");
  const isDeepThink = option.layoutHint === "deep-think";
  const webUrl = firstText(content?.url, firstWebRef?.url);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:401:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:402:7", className: "flex items-center gap-3 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:403:9", className: "flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-blue/10", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:404:11", size: 20, className: "text-cabinet-blue" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:406:9", className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:407:11", className: "text-[20px] font-medium text-cabinet-ink leading-tight break-words", children: title }),
        tone && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:409:13", className: "text-[12px] text-cabinet-inkMuted mt-1", children: isDeepThink ? `${t("history.deepThinkGroup")} · ${tone}` : tone })
      ] })
    ] }),
    description && /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:416:9", content: description, className: "mt-5" }),
    isWeb && webUrl && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:419:9", className: "mt-4 flex items-start gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:420:11", size: 16, className: "text-cabinet-blue mt-1 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          "code-path": "src/components/cabinet/AssetDetailPane.tsx:421:11",
          href: webUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "text-[14px] text-cabinet-blue hover:underline break-all",
          children: webUrl
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceList, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:431:7", references, label: t("history.references") }),
    contentText && contentText !== description && contentText !== prompt && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:433:9", className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:434:11", className: "text-[13px] font-medium text-cabinet-inkMuted mb-2", children: isWeb ? t("detail.webMainContent") : t("detail.preview") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:435:11", className: "max-h-[620px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:436:13", content: contentText, maxLength: 12e3 }) })
    ] }),
    prompt && prompt !== description && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:441:9", className: "mt-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:442:11", className: "text-[13px] font-medium text-cabinet-inkMuted mb-2", children: t("detail.prompt") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:443:11", className: "rounded-2xl border border-cabinet-border bg-cabinet-bg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:444:13", content: prompt }) })
    ] })
  ] });
}
function SourceCardDetail({ node }) {
  const { t } = useI18n();
  const card = node.data?.sourceCard || {};
  const sourceUrl = firstText(card.sourceUrl, node.data?.sourceUrl);
  const title = readableTitle(card.title, card.fileName, node.data?.fileName, sourceUrl, t("asset.uploadedFile"));
  const summary = firstText(card.summary, node.data?.summary);
  const sourceVideoHash = firstText(card.sourceVideoHash, card.videoHash, node.data?.sourceVideoHash);
  const sourceVideoUrl = firstText(card.sourceVideoUrl, card.videoUrl, node.data?.sourceVideoUrl);
  const videoUrl = sourceVideoHash ? `/api/assets/${sourceVideoHash}?kind=upload` : sourceVideoUrl;
  const remoteImageUrl = typeof card.imageUrl === "string" ? card.imageUrl : typeof node.data?.imageUrl === "string" ? node.data.imageUrl : "";
  const imageHash = typeof card.imageHash === "string" ? card.imageHash : typeof node.data?.imageHash === "string" ? node.data.imageHash : "";
  const localImageUrl = imageHash && /^[a-f0-9]{64}$/i.test(imageHash) ? `/api/assets/${imageHash}?kind=upload` : "";
  const imageUrl = localImageUrl || remoteImageUrl;
  const sourceText = firstText(card.mainContent, card.markdown, card.sourceText, node.data?.sourceText);
  const refs = webReferences(node);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:469:5", className: "flex flex-col px-8 pb-12", children: [
    videoUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:471:9",
        src: videoUrl,
        controls: true,
        playsInline: true,
        preload: "metadata",
        className: "max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] bg-black mt-2"
      }
    ) : imageUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        "code-path": "src/components/cabinet/AssetDetailPane.tsx:479:9",
        src: imageUrl,
        alt: title,
        loading: "lazy",
        className: "max-w-full rounded-[19px] border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)] mt-2"
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:486:9", className: "flex flex-col items-center justify-center py-10", children: card.sourceType === "video" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:487:42", size: 64, className: "text-cabinet-inkMuted" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(File, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:487:98", size: 64, className: "text-cabinet-inkMuted" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:490:7", className: "text-[18px] font-medium text-cabinet-ink leading-tight mt-5 break-words", children: title }),
    summary && /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:492:9", content: summary, className: "mt-2 text-[14px]" }),
    sourceUrl && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:495:9", className: "mt-4 flex items-start gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:496:11", size: 16, className: "text-cabinet-blue mt-1 flex-shrink-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          "code-path": "src/components/cabinet/AssetDetailPane.tsx:497:11",
          href: sourceUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "text-[14px] text-cabinet-blue hover:underline break-all",
          children: sourceUrl
        }
      )
    ] }),
    sourceText && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:508:9", className: "mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:509:11", className: "text-[13px] text-cabinet-inkMuted mb-1", children: sourceUrl ? t("detail.webMainContent") : t("detail.preview") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:510:11", className: "max-h-[620px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:511:13", content: sourceText, maxLength: 12e3 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceList, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:515:7", references: refs, label: t("history.references") })
  ] });
}
function ChatAssetDetail({ msg }) {
  const { t } = useI18n();
  const thinkingContent = typeof msg.thinkingContent === "string" ? msg.thinkingContent.trim() : "";
  const references = Array.isArray(msg.references) ? msg.references : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:525:5", className: "flex flex-col px-8 pb-12", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:526:7", className: "flex items-center gap-2 mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          "code-path": "src/components/cabinet/AssetDetailPane.tsx:527:9",
          className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${msg.role === "user" ? "bg-cabinet-itemBg text-cabinet-ink" : "bg-cabinet-blue text-cabinet-paper"}`,
          children: msg.role === "user" ? t("detail.you") : t("detail.ai")
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:536:9", className: "text-[13px] text-cabinet-inkMuted", children: new Date(msg.createdAt).toLocaleString() })
    ] }),
    thinkingContent && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:541:9", className: "mt-3 rounded-2xl border border-cabinet-border bg-cabinet-bg px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:542:11", className: "text-[13px] font-medium text-cabinet-inkMuted cursor-pointer select-none flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:543:13", size: 14, className: "text-cabinet-blue" }),
        t("history.thinkingTrace")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:546:11", content: thinkingContent, className: "mt-3 text-[13px]" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(MarkdownContent, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:549:7", content: msg.content, className: "mt-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ReferenceList, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:550:7", references, label: t("history.references") })
  ] });
}
function AssetDetailPane({ session, selectedAssetId, emptyMessage }) {
  const { t } = useI18n();
  if (!selectedAssetId) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:559:7", className: "bg-cabinet-paper flex flex-col items-center justify-center min-h-[200px] py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:560:9", className: "text-sm text-cabinet-inkMuted", children: emptyMessage || t("detail.selectAsset") }) });
  }
  if (!session) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:569:7", className: "bg-cabinet-paper flex flex-col items-center justify-center min-h-[200px] py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:570:9", className: "text-sm text-cabinet-inkMuted", children: t("detail.loadingSession") }) });
  }
  const asset = session.assets.find((a) => a.id === selectedAssetId);
  if (asset) {
    if (asset.mimeType.startsWith("video/")) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:580:9", className: "bg-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(VideoAssetDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:581:11", asset, nodes: session.nodes }) });
    }
    if (asset.mimeType.startsWith("image/")) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:587:9", className: "bg-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ImageAssetDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:588:11", asset, nodes: session.nodes }) });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:593:7", className: "bg-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileAssetDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:594:9", asset }) });
  }
  const node = session.nodes.find((n) => n.id === selectedAssetId);
  if (node) {
    if (node.type === "source-card") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:604:9", className: "bg-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SourceCardDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:605:11", node }) });
    }
    if (node.type === "option") {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:611:9", className: "bg-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(OptionNodeDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:612:11", node }) });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:617:7", className: "bg-cabinet-paper", children: node.data?.sourceUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(LinkAssetDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:618:33", node }) : /* @__PURE__ */ jsxRuntimeExports.jsx(TextNodeDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:618:67", node }) });
  }
  const msg = session.chatMessages.find((m) => m.id === selectedAssetId);
  if (msg) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:627:7", className: "bg-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChatAssetDetail, { "code-path": "src/components/cabinet/AssetDetailPane.tsx:628:9", msg }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:634:5", className: "bg-cabinet-paper flex flex-col items-center justify-center min-h-[200px] py-12", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/AssetDetailPane.tsx:635:7", className: "text-sm text-cabinet-inkMuted", children: t("detail.assetNotFound") }) });
}
function SkeletonHistoryPage() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:17:5", className: "flex h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:18:7", className: "hidden md:flex w-[300px] min-w-[300px] bg-cabinet-paper border-r border-cabinet-border flex-col h-full animate-pulse", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:19:9", className: "px-5 py-5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:20:11", className: "h-4 w-24 bg-cabinet-itemBg rounded" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:22:9", className: "border-b border-cabinet-border" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:23:9", className: "flex-1 px-4 py-4 space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:24:11", className: "h-3 w-16 bg-cabinet-itemBg rounded" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:25:11", className: "h-12 bg-cabinet-itemBg rounded" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:26:11", className: "h-12 bg-cabinet-itemBg rounded" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:29:7", className: "flex-1 flex flex-col h-full overflow-hidden bg-cabinet-paper animate-pulse", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:30:9", className: "px-5 md:px-9 pt-7 pb-4 flex-shrink-0 space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:31:11", className: "h-4 w-48 bg-cabinet-itemBg rounded" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:32:11", className: "h-8 w-80 max-w-full bg-cabinet-itemBg rounded" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:34:9", className: "px-5 md:px-9 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:35:11", className: "w-full h-[180px] md:h-[240px] bg-cabinet-itemBg rounded-[24px]" }) })
    ] })
  ] });
}
function isImageAsset(asset) {
  return asset.mimeType.startsWith("image/");
}
function isVideoAsset(asset) {
  return asset.mimeType.startsWith("video/");
}
function isDocumentAsset(asset) {
  return asset.kind === "upload" && !isImageAsset(asset) && !isVideoAsset(asset);
}
function nodeImageUrl(node) {
  const direct = node.data?.imageUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.imageUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
  return typeof hash === "string" && hash ? hash : null;
}
function nodeVideoUrl(node) {
  const direct = node.data?.videoUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceVideoUrl || node.data?.sourceCard?.videoUrl;
  if (typeof card === "string" && card) return card;
  const hash = node.data?.videoHash || node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash;
  return typeof hash === "string" && hash ? hash : null;
}
function nodeWebUrl(node) {
  const contentUrl = node.data?.option?.content?.url;
  if (typeof contentUrl === "string" && contentUrl) return contentUrl;
  const direct = node.data?.sourceUrl;
  if (typeof direct === "string" && direct) return direct;
  const card = node.data?.sourceCard?.sourceUrl;
  if (typeof card === "string" && card) return card;
  const refs = node.data?.option?.references || node.data?.references || node.data?.sourceCard?.references;
  if (Array.isArray(refs)) {
    const first = refs.find((ref) => typeof ref?.url === "string" && ref.url);
    if (first?.url) return first.url;
  }
  return null;
}
function isDeepThinkDocumentNode(node) {
  if (node.type !== "option") return false;
  if (node.data?.option?.layoutHint !== "deep-think") return false;
  const refs = node.data?.option?.references || node.data?.references || [];
  return !Array.isArray(refs) || refs.length === 0 || !refs.some((ref) => ref?.url);
}
function outputIdsForKind(session, outputKind) {
  if (!session) return null;
  if (outputKind === "image") {
    const referencedHashes = new Set(session.assets.map((asset) => asset.hash));
    return [
      ...session.assets.filter(isImageAsset).map((asset) => asset.id),
      ...session.nodes.filter((node) => {
        if (node.type !== "source-card") return false;
        if (!nodeImageUrl(node)) return false;
        const hash = node.data?.imageHash || node.data?.sourceCard?.imageHash;
        return !(typeof hash === "string" && referencedHashes.has(hash));
      }).map((node) => node.id)
    ];
  }
  if (outputKind === "video") {
    const referencedHashes = new Set(session.assets.map((asset) => asset.hash));
    return [
      ...session.assets.filter(isVideoAsset).map((asset) => asset.id),
      ...session.nodes.filter((node) => {
        if (node.type !== "source-card") return false;
        if (!nodeVideoUrl(node)) return false;
        const hash = node.data?.sourceVideoHash || node.data?.sourceCard?.sourceVideoHash || node.data?.sourceCard?.videoHash;
        return !(typeof hash === "string" && referencedHashes.has(hash));
      }).map((node) => node.id)
    ];
  }
  if (outputKind === "web") {
    return session.nodes.filter((node) => nodeWebUrl(node)).map((node) => node.id);
  }
  if (outputKind === "chat") {
    return session.chatMessages.map((message) => message.id);
  }
  return [
    ...session.assets.filter(isDocumentAsset).map((asset) => asset.id),
    ...session.nodes.filter((node) => node.type === "source" && node.data?.sourceType === "text" || isDeepThinkDocumentNode(node)).map((node) => node.id)
  ];
}
function getFirstOutputId(session, outputKind) {
  return outputIdsForKind(session, outputKind)?.[0] ?? null;
}
function isOutputIdForKind(session, outputKind, id) {
  if (!id) return false;
  return Boolean(outputIdsForKind(session, outputKind)?.includes(id));
}
function HistoryPage({ sessionId, outputKind }) {
  const { session, loading, error, refetch } = useSession(sessionId);
  const [selectedAssetIdIntent, setSelectedAssetIdIntent] = reactExports.useState(null);
  const [sidebarOpen, setSidebarOpen] = reactExports.useState(false);
  const { t } = useI18n();
  const nodeCount = session?.nodeCount ?? session?.nodes.length ?? 0;
  const assetCount = session?.assetCount ?? session?.assets.length ?? 0;
  const firstOutputId = reactExports.useMemo(() => getFirstOutputId(session, outputKind), [session, outputKind]);
  const selectedAssetId = isOutputIdForKind(session, outputKind, selectedAssetIdIntent) ? selectedAssetIdIntent : firstOutputId;
  const showBlueprint = Boolean(session && selectedAssetId && selectedAssetId === firstOutputId);
  if (loading && !session) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonHistoryPage, { "code-path": "src/components/cabinet/HistoryPage.tsx:164:12" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:168:5", className: "flex h-full flex-col md:flex-row relative", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        "code-path": "src/components/cabinet/HistoryPage.tsx:169:7",
        onClick: () => setSidebarOpen(true),
        className: "md:hidden absolute top-4 left-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-cabinet-paper border border-cabinet-border shadow-[0_8px_16px_rgba(0,0,0,0.08)]",
        "aria-label": t("history.openOutputs"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { "code-path": "src/components/cabinet/HistoryPage.tsx:174:9", size: 18, className: "text-cabinet-ink" })
      }
    ),
    sidebarOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:178:9", className: "md:hidden fixed inset-0 z-50 flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          "code-path": "src/components/cabinet/HistoryPage.tsx:179:11",
          className: "fixed inset-0 bg-black/20",
          onClick: () => setSidebarOpen(false)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:183:11", className: "relative w-[300px] bg-cabinet-paper h-full shadow-lg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:184:13", className: "flex items-center justify-between px-4 py-3 border-b border-cabinet-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:185:15", className: "text-sm font-medium text-cabinet-ink", children: t("history.outputContents") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/cabinet/HistoryPage.tsx:186:15",
              onClick: () => setSidebarOpen(false),
              className: "w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-itemBg",
              "aria-label": t("cabinet.closeSidebar"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "code-path": "src/components/cabinet/HistoryPage.tsx:191:17", size: 18, className: "text-cabinet-ink" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AssetSidebar,
          {
            "code-path": "src/components/cabinet/HistoryPage.tsx:194:13",
            session,
            outputKind,
            selectedAssetId,
            onSelectAsset: (id) => {
              setSelectedAssetIdIntent(id);
              setSidebarOpen(false);
            }
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:207:7", className: "hidden md:flex w-[300px] min-w-[300px] bg-cabinet-paper border-r border-cabinet-border flex-col h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      AssetSidebar,
      {
        "code-path": "src/components/cabinet/HistoryPage.tsx:208:9",
        session,
        outputKind,
        selectedAssetId,
        onSelectAsset: setSelectedAssetIdIntent
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:216:7", className: "flex-1 flex flex-col h-full overflow-y-auto cabinet-scrollbar bg-cabinet-paper", children: [
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:218:11", className: "px-5 md:px-9 py-3 bg-cabinet-paper border-b border-cabinet-border flex items-center justify-between flex-shrink-0 sticky top-0 z-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:219:13", className: "text-sm text-[#d53b00]", children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            "code-path": "src/components/cabinet/HistoryPage.tsx:220:13",
            onClick: refetch,
            className: "text-sm text-cabinet-blue font-medium hover:underline",
            children: t("history.retry")
          }
        )
      ] }),
      session && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:230:11", className: "px-5 md:px-9 pt-7 pb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:231:13", className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:232:15", className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:233:17", className: "text-[13px] text-cabinet-inkMuted mb-3", children: [
            t("history.lastEdited"),
            " ",
            new Date(session.updatedAt || session.createdAt).toLocaleString()
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { "code-path": "src/components/cabinet/HistoryPage.tsx:236:17", className: "text-2xl md:text-[34px] font-medium text-cabinet-ink leading-tight tracking-[0] truncate", children: session.title || t("session.unnamed") }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:239:17", className: "flex items-center gap-3 mt-3 text-[13px] md:text-[14px] text-cabinet-inkMuted flex-wrap", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:240:19", children: new Date(session.createdAt).toLocaleString() }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:241:19", children: "·" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:242:19", children: [
              nodeCount,
              " ",
              t("history.nodeCount")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:243:19", children: "·" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "code-path": "src/components/cabinet/HistoryPage.tsx:244:19", children: [
              assetCount,
              " ",
              t("history.assetCount")
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            "code-path": "src/components/cabinet/HistoryPage.tsx:247:15",
            href: `/app.html?session=${session.id}`,
            className: "inline-flex items-center px-5 py-2 bg-cabinet-blue text-cabinet-paper text-sm font-medium rounded-full hover:bg-cabinet-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cabinet-blue focus-visible:ring-offset-2 flex-shrink-0",
            children: t("cabinet.openInCanvas")
          }
        )
      ] }) }),
      showBlueprint && session && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:258:11", className: "px-5 md:px-9 py-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/HistoryPage.tsx:259:13", className: "h-[180px] md:h-[245px] rounded-[24px] overflow-hidden bg-cabinet-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(NodeGraphThumbnail, { "code-path": "src/components/cabinet/HistoryPage.tsx:260:15", nodes: session.nodes, links: session.links }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        AssetDetailPane,
        {
          "code-path": "src/components/cabinet/HistoryPage.tsx:265:9",
          session,
          selectedAssetId,
          emptyMessage: t("history.noOutputsInFolder")
        }
      )
    ] })
  ] });
}
const historyHref = "/history/";
const settingsHref = "/history/?view=settings";
const guideHref = "/history/?view=guide";
function AppNavigation({ activePage, open, onClose }) {
  const { t } = useI18n();
  if (!open) return null;
  const items = [
    { key: "home", labelKey: "nav.home", href: "/", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(House, { "code-path": "src/components/AppNavigation.tsx:30:59", size: 18 }), active: "home" },
    { key: "workbench", labelKey: "nav.workbench", href: "/app.html", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(LayoutDashboard, { "code-path": "src/components/AppNavigation.tsx:31:77", size: 18 }), active: "workbench" },
    { key: "library", labelKey: "nav.materialLibrary", href: "/history/?view=library", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FolderOpen, { "code-path": "src/components/AppNavigation.tsx:32:94", size: 18 }), active: "library" },
    { key: "history", labelKey: "nav.history", href: historyHref, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(History, { "code-path": "src/components/AppNavigation.tsx:33:73", size: 18 }), active: "history" },
    { key: "guide", labelKey: "nav.guide", href: guideHref, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { "code-path": "src/components/AppNavigation.tsx:34:67", size: 18 }), active: "guide" },
    { key: "settings", labelKey: "nav.settings", href: settingsHref, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { "code-path": "src/components/AppNavigation.tsx:35:76", size: 18 }), active: "settings" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/AppNavigation.tsx:39:5", className: "fixed inset-0 z-[80]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        "code-path": "src/components/AppNavigation.tsx:40:7",
        type: "button",
        className: "absolute inset-0 bg-black/20",
        onClick: onClose,
        "aria-label": t("nav.close")
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "aside",
      {
        "code-path": "src/components/AppNavigation.tsx:46:7",
        className: "absolute left-0 top-0 flex h-full w-[280px] max-w-[86vw] flex-col bg-cabinet-black px-5 py-5 text-cabinet-paper shadow-[18px_0_42px_rgba(0,0,0,0.18)]",
        "aria-label": t("nav.label"),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/AppNavigation.tsx:50:9", className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/AppNavigation.tsx:51:11",
              type: "button",
              onClick: onClose,
              className: "flex h-9 w-9 items-center justify-center rounded-full text-cabinet-paper hover:bg-white/12",
              "aria-label": t("nav.close"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "code-path": "src/components/AppNavigation.tsx:57:13", size: 18 })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/AppNavigation.tsx:61:9", className: "mt-3 border-b border-white/14 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/AppNavigation.tsx:62:11", className: "text-[22px] font-light leading-tight tracking-[0]", children: t("nav.product") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { "code-path": "src/components/AppNavigation.tsx:65:9", className: "mt-4 grid gap-2", "aria-label": t("nav.pages"), children: items.map((item) => {
            const active = activePage === item.active;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                "code-path": "src/components/AppNavigation.tsx:69:15",
                href: item.href,
                className: `grid min-h-11 grid-cols-[30px_1fr] items-center gap-3 rounded-full px-3 py-2 text-[15px] transition-colors ${active ? "bg-cabinet-blue text-cabinet-paper" : "text-white/82 hover:bg-white/12 hover:text-cabinet-paper"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/AppNavigation.tsx:76:17", className: `flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white/22" : "bg-white/12"}`, children: item.icon }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/AppNavigation.tsx:79:17", children: t(item.labelKey) })
                ]
              },
              item.key
            );
          }) })
        ]
      }
    )
  ] });
}
const OUTPUT_TABS = [
  { kind: "image", labelKey: "history.tabImages", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Image, { "code-path": "src/components/cabinet/FileCabinet.tsx:11:57", size: 16 }) },
  { kind: "video", labelKey: "history.tabVideos", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Video, { "code-path": "src/components/cabinet/FileCabinet.tsx:12:57", size: 16 }) },
  { kind: "web", labelKey: "history.tabWeb", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Earth, { "code-path": "src/components/cabinet/FileCabinet.tsx:13:52", size: 16 }) },
  { kind: "document", labelKey: "history.tabDocuments", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { "code-path": "src/components/cabinet/FileCabinet.tsx:14:63", size: 16 }) },
  { kind: "chat", labelKey: "history.tabChat", icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { "code-path": "src/components/cabinet/FileCabinet.tsx:15:54", size: 16 }) }
];
function Spinner() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:20:5", className: "flex items-center justify-center h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:21:7", className: "w-8 h-8 border-2 border-cabinet-border border-t-cabinet-ink rounded-full animate-spin" }) });
}
function SessionList({
  sessions,
  activeSessionId,
  loading,
  searchQuery,
  searchOpen,
  searchInputId,
  onSearchChange,
  onSearchOpenChange,
  onOpenNavigation,
  onSelect,
  onRename,
  onDelete
}) {
  const { t } = useI18n();
  const searchInputRef = reactExports.useRef(null);
  const [editingId, setEditingId] = reactExports.useState(null);
  const [draftTitle, setDraftTitle] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:67:5", className: "flex h-full flex-col bg-cabinet-itemBg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:68:7", className: "flex h-[68px] items-center justify-between px-6 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          "code-path": "src/components/cabinet/FileCabinet.tsx:69:9",
          type: "button",
          onClick: onOpenNavigation,
          className: "flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-paper",
          "aria-label": t("nav.open"),
          title: t("nav.open"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { "code-path": "src/components/cabinet/FileCabinet.tsx:76:11", size: 19, className: "text-cabinet-ink2" })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          "code-path": "src/components/cabinet/FileCabinet.tsx:78:9",
          type: "button",
          onClick: () => onSearchOpenChange(!searchOpen),
          className: `flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-paper ${searchOpen ? "bg-cabinet-paper" : ""}`,
          "aria-controls": searchInputId,
          "aria-expanded": searchOpen,
          "aria-label": t("history.search"),
          title: t("history.search"),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { "code-path": "src/components/cabinet/FileCabinet.tsx:89:11", size: 18, className: "text-cabinet-ink2" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:93:7", className: "px-6 pb-4 flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:94:9", className: "text-xl font-medium text-cabinet-ink tracking-[0]", children: t("history.record") }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:95:9", className: "mt-1 text-[13px] text-cabinet-inkMuted", children: t("history.folderHint") }),
      searchOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/cabinet/FileCabinet.tsx:97:11", className: "mt-4 flex h-10 items-center gap-2 border border-cabinet-border bg-cabinet-paper px-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { "code-path": "src/components/cabinet/FileCabinet.tsx:98:13", size: 16, className: "text-cabinet-inkMuted flex-shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            "code-path": "src/components/cabinet/FileCabinet.tsx:99:13",
            id: searchInputId,
            ref: searchInputRef,
            value: searchQuery,
            onChange: (event) => onSearchChange(event.target.value),
            placeholder: t("history.searchPlaceholder"),
            className: "min-w-0 flex-1 bg-transparent text-sm text-cabinet-ink outline-none placeholder:text-cabinet-inkMuted"
          }
        ),
        searchQuery && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            "code-path": "src/components/cabinet/FileCabinet.tsx:108:15",
            type: "button",
            onClick: () => onSearchChange(""),
            className: "flex h-6 w-6 items-center justify-center text-cabinet-inkMuted hover:text-cabinet-ink",
            "aria-label": t("history.clearSearch"),
            title: t("history.clearSearch"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "code-path": "src/components/cabinet/FileCabinet.tsx:115:17", size: 14 })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:122:7", className: "flex-1 overflow-y-auto cabinet-scrollbar pb-4", children: loading && sessions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:124:11", className: "space-y-3 px-4", children: [1, 2, 3].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:126:15", className: "h-[74px] rounded bg-cabinet-paper/70 animate-pulse" }, item)) }) : sessions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:130:11", className: "px-6 py-4 text-sm text-cabinet-inkMuted", children: searchQuery ? t("history.noSearchResults") : t("history.noSessions") }) : sessions.map((session) => {
      const active = activeSessionId === session.id;
      const editing = editingId === session.id;
      const commitRename = async () => {
        const next = draftTitle.trim();
        setEditingId(null);
        if (next && next !== session.title) {
          await onRename(session.id, next);
        }
      };
      return /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          "code-path": "src/components/cabinet/FileCabinet.tsx:145:15",
          onClick: () => onSelect(session.id),
          className: `group relative w-full text-left px-6 py-4 transition-colors ${active ? "bg-cabinet-paper" : "hover:bg-cabinet-paper/70"}`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "code-path": "src/components/cabinet/FileCabinet.tsx:152:17",
                role: "button",
                tabIndex: 0,
                onClick: (event) => {
                  event.stopPropagation();
                  void onDelete(session.id, session.title || t("session.unnamed"));
                },
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    void onDelete(session.id, session.title || t("session.unnamed"));
                  }
                },
                className: "absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-cabinet-paper text-cabinet-inkMuted opacity-0 shadow-sm ring-1 ring-cabinet-border transition hover:text-[#d53b00] group-hover:opacity-100 focus:opacity-100",
                "aria-label": t("history.delete"),
                title: t("history.delete"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { "code-path": "src/components/cabinet/FileCabinet.tsx:170:19", size: 14 })
              }
            ),
            active && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:172:28", className: "absolute left-0 top-0 bottom-0 w-[3px] bg-cabinet-ink" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:173:17", className: "flex items-start gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { "code-path": "src/components/cabinet/FileCabinet.tsx:174:19", size: 17, className: "mt-[2px] text-cabinet-inkMuted flex-shrink-0" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:175:19", className: "min-w-0", children: [
                editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    "code-path": "src/components/cabinet/FileCabinet.tsx:177:23",
                    value: draftTitle,
                    onChange: (event) => setDraftTitle(event.target.value),
                    onClick: (event) => event.stopPropagation(),
                    onKeyDown: (event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitRename();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setEditingId(null);
                      }
                    },
                    onBlur: () => void commitRename(),
                    className: "w-full rounded border border-cabinet-blue bg-cabinet-paper px-2 py-1 text-[15px] font-medium text-cabinet-ink outline-none",
                    autoFocus: true
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    "code-path": "src/components/cabinet/FileCabinet.tsx:196:23",
                    className: "text-[15px] font-medium text-cabinet-ink truncate cursor-text",
                    onDoubleClick: (event) => {
                      event.stopPropagation();
                      setDraftTitle(session.title || "");
                      setEditingId(session.id);
                    },
                    title: t("history.rename"),
                    children: session.title || t("session.unnamed")
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:208:21", className: "mt-1 text-[13px] text-cabinet-inkMuted truncate", children: new Date(session.updatedAt || session.createdAt).toLocaleString() }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:211:21", className: "mt-1 text-[12px] text-cabinet-inkMuted truncate", children: [
                  session.nodeCount,
                  " ",
                  t("history.nodeCount"),
                  " · ",
                  session.assetCount,
                  " ",
                  t("history.assetCount")
                ] })
              ] })
            ] })
          ]
        },
        session.id
      );
    }) })
  ] });
}
function FileCabinet() {
  const { sessions, loading, error, refetch } = useHistory(50, 0, false);
  const [activeSessionId, setActiveSessionId] = reactExports.useState(null);
  const [activeOutputKind, setActiveOutputKind] = reactExports.useState("image");
  const [mobileSessionsOpen, setMobileSessionsOpen] = reactExports.useState(false);
  const [navigationOpen, setNavigationOpen] = reactExports.useState(false);
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [searchOpen, setSearchOpen] = reactExports.useState(false);
  const { t } = useI18n();
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSessions = normalizedSearch ? sessions.filter((session) => {
    const haystack = [
      session.title,
      new Date(session.createdAt).toLocaleString(),
      new Date(session.updatedAt || session.createdAt).toLocaleString(),
      `${session.nodeCount}`,
      `${session.assetCount}`
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedSearch);
  }) : sessions;
  const resolvedActiveSessionId = activeSessionId && filteredSessions.some((session) => session.id === activeSessionId) ? activeSessionId : filteredSessions[0]?.id ?? null;
  const handleSessionSelect = (id) => {
    setActiveSessionId(id);
    setMobileSessionsOpen(false);
  };
  const handleSessionRename = async (id, title) => {
    try {
      const response = await fetch(`/api/sessions/${id}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || response.statusText);
      }
      await refetch();
    } catch (renameError) {
      console.error("Failed to rename session", renameError);
      alert(t("history.renameFailed"));
    }
  };
  const handleSessionDelete = async (id) => {
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || response.statusText);
      }
      if (activeSessionId === id) setActiveSessionId(null);
      await refetch();
    } catch (deleteError) {
      console.error("Failed to delete session", deleteError);
      alert(t("history.deleteFailed"));
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:291:5", className: "h-screen overflow-hidden bg-cabinet-bg p-3 md:p-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AppNavigation, { "code-path": "src/components/cabinet/FileCabinet.tsx:292:7", activePage: "history", open: navigationOpen, onClose: () => setNavigationOpen(false) }),
    mobileSessionsOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:294:9", className: "lg:hidden fixed inset-0 z-50 flex", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          "code-path": "src/components/cabinet/FileCabinet.tsx:295:11",
          className: "fixed inset-0 bg-black/20",
          onClick: () => setMobileSessionsOpen(false)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:299:11", className: "relative w-[320px] max-w-[84vw] bg-cabinet-itemBg h-full shadow-lg flex flex-col", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:300:13", className: "flex items-center justify-between px-4 py-3 border-b border-cabinet-border", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/cabinet/FileCabinet.tsx:301:15", className: "text-sm font-medium text-cabinet-ink", children: t("history.record") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/cabinet/FileCabinet.tsx:302:15",
              onClick: () => setMobileSessionsOpen(false),
              className: "w-8 h-8 flex items-center justify-center rounded hover:bg-cabinet-paper",
              "aria-label": t("cabinet.closeSidebar"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "code-path": "src/components/cabinet/FileCabinet.tsx:307:17", size: 18, className: "text-cabinet-ink" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          SessionList,
          {
            "code-path": "src/components/cabinet/FileCabinet.tsx:310:13",
            sessions: filteredSessions,
            activeSessionId: resolvedActiveSessionId,
            loading,
            searchQuery,
            searchOpen,
            searchInputId: "history-search-input-mobile",
            onSearchChange: setSearchQuery,
            onSearchOpenChange: setSearchOpen,
            onOpenNavigation: () => setNavigationOpen(true),
            onSelect: handleSessionSelect,
            onRename: handleSessionRename,
            onDelete: handleSessionDelete
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:328:7", className: "mx-auto flex h-full max-w-[1760px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("aside", { "code-path": "src/components/cabinet/FileCabinet.tsx:329:9", className: "hidden lg:flex w-[320px] min-w-[320px] flex-col border-r border-cabinet-border bg-cabinet-itemBg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        SessionList,
        {
          "code-path": "src/components/cabinet/FileCabinet.tsx:330:11",
          sessions: filteredSessions,
          activeSessionId: resolvedActiveSessionId,
          loading,
          searchQuery,
          searchOpen,
          searchInputId: "history-search-input-desktop",
          onSearchChange: setSearchQuery,
          onSearchOpenChange: setSearchOpen,
          onOpenNavigation: () => setNavigationOpen(true),
          onSelect: handleSessionSelect,
          onRename: handleSessionRename,
          onDelete: handleSessionDelete
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/cabinet/FileCabinet.tsx:346:9", className: "flex min-w-0 flex-1 flex-col bg-cabinet-bg", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:347:11", className: "flex h-14 items-stretch gap-0 flex-shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/cabinet/FileCabinet.tsx:348:13",
              onClick: () => setMobileSessionsOpen(true),
              className: "lg:hidden w-12 flex items-center justify-center bg-cabinet-paper text-cabinet-ink border-r border-cabinet-border",
              "aria-label": t("cabinet.showHistory"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { "code-path": "src/components/cabinet/FileCabinet.tsx:353:15", size: 19 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:355:13", className: "flex items-stretch overflow-x-auto no-scrollbar", children: OUTPUT_TABS.map((tab, index2) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            FolderTab,
            {
              "code-path": "src/components/cabinet/FileCabinet.tsx:357:17",
              label: t(tab.labelKey),
              tabId: tab.kind,
              active: activeOutputKind === tab.kind,
              zIndex: OUTPUT_TABS.length - index2,
              overlap: false,
              onClick: () => setActiveOutputKind(tab.kind),
              inactiveColor: "#ffffff",
              inactiveText: "#000000",
              icon: tab.icon
            },
            tab.kind
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:371:13", className: "flex-1" })
        ] }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:375:13", className: "mx-3 md:mx-8 mb-2 px-5 py-2 text-sm text-[#d53b00] bg-cabinet-paper border border-cabinet-border", children: [
          t("history.error"),
          ": ",
          error
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:380:11", className: "min-h-0 flex-1 overflow-hidden bg-cabinet-paper", children: loading && sessions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Spinner, { "code-path": "src/components/cabinet/FileCabinet.tsx:382:15" }) : filteredSessions.length === 0 && !loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/cabinet/FileCabinet.tsx:384:15", className: "flex items-center justify-center h-full text-cabinet-inkMuted text-base", children: searchQuery ? t("history.noSearchResults") : t("history.noSessions") }) : /* @__PURE__ */ jsxRuntimeExports.jsx(HistoryPage, { "code-path": "src/components/cabinet/FileCabinet.tsx:388:15", sessionId: resolvedActiveSessionId, outputKind: activeOutputKind }) })
      ] })
    ] })
  ] });
}
const roles = ["analysis", "chat", "image", "video", "asr", "realtime", "deepthink"];
const emptyRole = {
  endpoint: "",
  model: "",
  apiKey: "",
  temperature: 0.7,
  options: {}
};
const optionFields = {
  analysis: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 },
    { key: "enableWebSearch", type: "checkbox" },
    { key: "jsonObjectResponse", type: "checkbox" }
  ],
  chat: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 },
    { key: "enableWebSearch", type: "checkbox" },
    { key: "enableWebExtractor", type: "checkbox" },
    { key: "enableCodeInterpreter", type: "checkbox" },
    { key: "enableCanvasTools", type: "checkbox" },
    { key: "enablePreviousResponse", type: "checkbox" }
  ],
  image: [
    { key: "size", type: "text", placeholder: "2048*2048" },
    { key: "n", type: "number", min: 1, max: 6, step: 1 },
    { key: "negative_prompt", type: "textarea" },
    { key: "prompt_extend", type: "checkbox" },
    { key: "watermark", type: "checkbox" },
    { key: "seed", type: "number", min: 0, max: 2147483647, step: 1 },
    { key: "useReferenceImage", type: "checkbox" }
  ],
  video: [
    { key: "resolution", type: "select", options: [["720P", "720P"], ["1080P", "1080P"]] },
    { key: "ratio", type: "select", options: [["16:9", "16:9"], ["9:16", "9:16"], ["1:1", "1:1"], ["4:3", "4:3"], ["3:4", "3:4"]] },
    { key: "duration", type: "number", min: 3, max: 15, step: 1 },
    { key: "watermark", type: "checkbox" },
    { key: "seed", type: "number", min: 0, max: 2147483647, step: 1 },
    { key: "useReferenceImage", type: "checkbox" },
    { key: "imageModel", type: "text", placeholder: "happyhorse-1.0-i2v" },
    { key: "textModel", type: "text", placeholder: "happyhorse-1.0-t2v" },
    { key: "pollIntervalMs", type: "number", min: 1e3, max: 6e4, step: 1e3 },
    { key: "pollAttempts", type: "number", min: 1, max: 120, step: 1 }
  ],
  asr: [
    { key: "targetLanguage", type: "select", options: [["auto", "Auto"], ["zh", "中文"], ["en", "English"]] },
    { key: "chunkMs", type: "number", min: 600, max: 6e3, step: 100 }
  ],
  realtime: [
    { key: "voice", type: "text", placeholder: "Ethan" },
    { key: "outputAudio", type: "checkbox" },
    { key: "enableSearch", type: "checkbox" },
    { key: "smoothOutput", type: "select", options: [["auto", "Auto"], ["true", "On"], ["false", "Off"]] },
    { key: "transcriptionModel", type: "text", placeholder: "qwen3-asr-flash-realtime" },
    { key: "chunkMs", type: "number", min: 800, max: 8e3, step: 100 },
    { key: "silenceThreshold", type: "number", min: 1e-3, max: 0.08, step: 1e-3 },
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 }
  ],
  deepthink: [
    { key: "top_p", type: "number", min: 0.01, max: 1, step: 0.01 },
    { key: "max_tokens", type: "number", min: 1, step: 1 },
    { key: "sourceCardMode", type: "select", options: [["list", "List"], ["cards", "Cards"], ["off", "Off"]] },
    { key: "maxCanvasCards", type: "number", min: 1, max: 25, step: 1 },
    { key: "maxReferenceCards", type: "number", min: 0, max: 25, step: 1 },
    { key: "liveCanvasCards", type: "number", min: 0, max: 25, step: 1 },
    { key: "outputFormat", type: "text", placeholder: "model_summary_report" },
    { key: "incrementalOutput", type: "checkbox" }
  ]
};
function getInitialTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}
function normalizeRole(value) {
  if (!value || typeof value !== "object") return { ...emptyRole };
  const input = value;
  return {
    endpoint: input.endpoint || "",
    model: input.model || "",
    apiKey: input.apiKey || "",
    temperature: typeof input.temperature === "number" ? input.temperature : 0.7,
    options: input.options && typeof input.options === "object" ? input.options : {}
  };
}
function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const [navOpen, setNavOpen] = reactExports.useState(false);
  const [activeRole, setActiveRole] = reactExports.useState("analysis");
  const [theme, setTheme] = reactExports.useState(getInitialTheme);
  const [settings, setSettings] = reactExports.useState({
    analysis: { ...emptyRole },
    chat: { ...emptyRole },
    image: { ...emptyRole },
    video: { ...emptyRole },
    asr: { ...emptyRole, temperature: 0 },
    realtime: { ...emptyRole },
    deepthink: { ...emptyRole }
  });
  const [status, setStatus] = reactExports.useState("");
  reactExports.useEffect(() => {
    let cancelled = false;
    fetch("/api/settings").then((res) => res.json()).then((data) => {
      if (cancelled) return;
      setSettings({
        analysis: normalizeRole(data.analysis),
        chat: normalizeRole(data.chat),
        image: normalizeRole(data.image),
        video: normalizeRole(data.video),
        asr: normalizeRole(data.asr),
        realtime: normalizeRole(data.realtime),
        deepthink: normalizeRole(data.deepthink)
      });
      if (data.theme === "light" || data.theme === "dark") {
        setTheme(data.theme);
        document.documentElement.setAttribute("data-theme", data.theme);
        localStorage.setItem("thoughtgrid-theme", data.theme);
      }
      if (data.language === "zh" || data.language === "en") {
        setLang(data.language);
      }
    }).catch(() => setStatus(t("settings.loadFailed")));
    return () => {
      cancelled = true;
    };
  }, [setLang, t]);
  const current = settings[activeRole];
  const updateRole = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [activeRole]: {
        ...prev[activeRole],
        [field]: value
      }
    }));
  };
  const updateOption = (key, value) => {
    setSettings((prev) => {
      const nextOptions = { ...prev[activeRole].options };
      if (value === "") {
        delete nextOptions[key];
      } else {
        nextOptions[key] = value;
      }
      return {
        ...prev,
        [activeRole]: {
          ...prev[activeRole],
          options: nextOptions
        }
      };
    });
  };
  const optionValue = (field) => {
    const value = current.options[field.key];
    if (field.key === "smoothOutput") {
      if (value === true) return "true";
      if (value === false) return "false";
      return "auto";
    }
    if (field.key === "sourceCardMode") {
      return ["list", "cards", "off"].includes(String(value)) ? String(value) : "list";
    }
    if (field.key === "targetLanguage") {
      return ["auto", "zh", "en"].includes(String(value)) ? String(value) : "auto";
    }
    return value === void 0 || value === null ? "" : String(value);
  };
  const saveTheme = async (nextTheme) => {
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("thoughtgrid-theme", nextTheme);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme })
    });
  };
  const saveLanguage = async (nextLang) => {
    setLang(nextLang);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: nextLang })
    });
  };
  const saveApiSettings = async () => {
    setStatus(t("settings.saving"));
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [activeRole]: settings[activeRole] })
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus(t("settings.saved"));
    } catch (error) {
      setStatus(`${t("settings.saveFailed")}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:250:5", className: "min-h-screen bg-cabinet-bg p-3 text-cabinet-ink md:p-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AppNavigation, { "code-path": "src/components/settings/SettingsPage.tsx:251:7", activePage: "settings", open: navOpen, onClose: () => setNavOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { "code-path": "src/components/settings/SettingsPage.tsx:252:7", className: "mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1160px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)] md:min-h-[calc(100vh-3.5rem)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { "code-path": "src/components/settings/SettingsPage.tsx:253:9", className: "flex h-16 items-center gap-4 border-b border-cabinet-border px-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            "code-path": "src/components/settings/SettingsPage.tsx:254:11",
            type: "button",
            onClick: () => setNavOpen(true),
            className: "flex h-10 w-10 items-center justify-center rounded hover:bg-cabinet-itemBg",
            "aria-label": t("nav.open"),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { "code-path": "src/components/settings/SettingsPage.tsx:260:13", size: 20 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:262:11", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/settings/SettingsPage.tsx:263:13", className: "text-xs text-cabinet-inkMuted", children: "织境" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { "code-path": "src/components/settings/SettingsPage.tsx:264:13", className: "text-xl font-medium tracking-[0]", children: t("settings.pageTitle") })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:268:9", className: "grid gap-8 p-5 md:grid-cols-[300px_1fr] md:p-8", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/settings/SettingsPage.tsx:269:11", className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:270:13", className: "border border-cabinet-border bg-cabinet-itemBg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/settings/SettingsPage.tsx:271:15", className: "text-sm font-medium", children: t("settings.appearance") }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/settings/SettingsPage.tsx:272:15", className: "mt-4 flex items-center justify-between gap-4 text-sm text-cabinet-inkMuted", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:273:17", children: t("settings.darkMode") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:274:17",
                  type: "checkbox",
                  checked: theme === "dark",
                  onChange: (event) => saveTheme(event.target.checked ? "dark" : "light").catch(() => setStatus(t("settings.saveFailed"))),
                  className: "h-5 w-5 accent-cabinet-blue"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/settings/SettingsPage.tsx:281:15", className: "mt-4 grid gap-2 text-sm text-cabinet-inkMuted", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:282:17", children: t("settings.language") }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:283:17",
                  value: lang,
                  onChange: (event) => saveLanguage(event.target.value).catch(() => setStatus(t("settings.saveFailed"))),
                  className: "h-10 border border-cabinet-border bg-cabinet-paper px-3 text-sm text-cabinet-ink",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { "code-path": "src/components/settings/SettingsPage.tsx:288:19", value: "zh", children: t("lang.zh") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { "code-path": "src/components/settings/SettingsPage.tsx:289:19", value: "en", children: t("lang.en") })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:293:13", className: "border border-cabinet-border bg-cabinet-itemBg p-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/settings/SettingsPage.tsx:294:15", className: "text-sm font-medium", children: t("settings.apiGroups") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/settings/SettingsPage.tsx:295:15", className: "mt-3 grid gap-2", children: roles.map((role) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                "code-path": "src/components/settings/SettingsPage.tsx:297:19",
                type: "button",
                onClick: () => setActiveRole(role),
                className: `h-10 px-3 text-left text-sm transition-colors ${activeRole === role ? "bg-cabinet-blue text-cabinet-paper" : "bg-cabinet-paper text-cabinet-ink hover:bg-white"}`,
                children: t(`settings.${role}`)
              },
              role
            )) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/settings/SettingsPage.tsx:312:11", className: "border border-cabinet-border p-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:313:13", className: "flex flex-wrap items-center justify-between gap-3 border-b border-cabinet-border pb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:314:15", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/settings/SettingsPage.tsx:315:17", className: "text-xs text-cabinet-inkMuted", children: t("settings.apiSettings") }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/settings/SettingsPage.tsx:316:17", className: "text-2xl font-medium tracking-[0]", children: t(`settings.${activeRole}`) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { "code-path": "src/components/settings/SettingsPage.tsx:318:15", type: "button", onClick: saveApiSettings, className: "h-10 bg-cabinet-blue px-5 text-sm font-medium text-cabinet-paper hover:bg-cabinet-cyan", children: t("settings.save") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:323:13", className: "mt-5 grid gap-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/settings/SettingsPage.tsx:324:15", className: "grid gap-2 text-sm text-cabinet-inkMuted", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:325:17", children: "API Endpoint" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:326:17",
                  value: current.endpoint,
                  onChange: (event) => updateRole("endpoint", event.target.value),
                  className: "h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue",
                  placeholder: "https://api.example.com/v1"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/settings/SettingsPage.tsx:333:15", className: "grid gap-2 text-sm text-cabinet-inkMuted", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:334:17", children: "Model" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:335:17",
                  value: current.model,
                  onChange: (event) => updateRole("model", event.target.value),
                  className: "h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue",
                  placeholder: "model-name"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/settings/SettingsPage.tsx:342:15", className: "grid gap-2 text-sm text-cabinet-inkMuted", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:343:17", children: "API Key" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:344:17",
                  type: "password",
                  value: current.apiKey,
                  onChange: (event) => updateRole("apiKey", event.target.value),
                  className: "h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue",
                  placeholder: "sk-..."
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { "code-path": "src/components/settings/SettingsPage.tsx:352:15", className: "grid gap-2 text-sm text-cabinet-inkMuted", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:353:17", children: "Temperature" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:354:17",
                  type: "number",
                  min: "0",
                  max: "2",
                  step: "0.1",
                  value: current.temperature,
                  onChange: (event) => updateRole("temperature", Number(event.target.value)),
                  className: "h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/settings/SettingsPage.tsx:365:15", className: "grid gap-4 border-t border-cabinet-border pt-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/settings/SettingsPage.tsx:366:17", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/settings/SettingsPage.tsx:367:19", className: "text-xs font-medium text-cabinet-ink", children: t("settings.advanced") }) }),
              optionFields[activeRole].map((field) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  "code-path": "src/components/settings/SettingsPage.tsx:370:19",
                  className: `grid gap-2 text-sm text-cabinet-inkMuted ${field.type === "checkbox" ? "grid-cols-[1fr_auto] items-center" : ""}`,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:376:21", children: t(`settings.option.${field.key}`) }),
                    field.type === "checkbox" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        "code-path": "src/components/settings/SettingsPage.tsx:378:23",
                        type: "checkbox",
                        checked: Boolean(current.options[field.key]),
                        onChange: (event) => updateOption(field.key, event.target.checked),
                        className: "h-5 w-5 accent-cabinet-blue"
                      }
                    ) : field.type === "select" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "select",
                      {
                        "code-path": "src/components/settings/SettingsPage.tsx:385:23",
                        value: optionValue(field),
                        onChange: (event) => {
                          const raw = event.target.value;
                          updateOption(field.key, field.key === "smoothOutput" ? raw === "true" ? true : raw === "false" ? false : "auto" : raw);
                        },
                        className: "h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue",
                        children: (field.options || []).map(([value, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { "code-path": "src/components/settings/SettingsPage.tsx:394:27", value, children: label }, value))
                      }
                    ) : field.type === "textarea" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "textarea",
                      {
                        "code-path": "src/components/settings/SettingsPage.tsx:400:23",
                        value: optionValue(field),
                        onChange: (event) => updateOption(field.key, event.target.value),
                        className: "min-h-[84px] resize-y border border-cabinet-border bg-cabinet-paper px-3 py-2 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue"
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        "code-path": "src/components/settings/SettingsPage.tsx:406:23",
                        type: field.type,
                        min: field.min,
                        max: field.max,
                        step: field.step,
                        value: optionValue(field),
                        onChange: (event) => updateOption(field.key, field.type === "number" ? event.target.value === "" ? "" : Number(event.target.value) : event.target.value),
                        className: "h-11 border border-cabinet-border bg-cabinet-paper px-3 text-cabinet-ink outline-none focus:ring-2 focus:ring-cabinet-blue",
                        placeholder: field.placeholder
                      }
                    ),
                    t(`settings.hint.${field.key}`) !== `settings.hint.${field.key}` && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/settings/SettingsPage.tsx:418:23", className: field.type === "checkbox" ? "col-span-2 text-xs leading-5 text-cabinet-inkMuted" : "text-xs leading-5 text-cabinet-inkMuted", children: t(`settings.hint.${field.key}`) })
                  ]
                },
                field.key
              ))
            ] })
          ] }),
          status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/settings/SettingsPage.tsx:426:24", className: "mt-4 text-sm text-cabinet-inkMuted", children: status })
        ] })
      ] })
    ] })
  ] });
}
const DEBOUNCE_MS = 300;
function useMaterials(query, sort, favoritedOnly = false) {
  const [items, setItems] = reactExports.useState([]);
  const [total, setTotal] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  const debounceRef = reactExports.useRef(void 0);
  const fetchMaterials = reactExports.useCallback(async (q, s, fav) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort: s });
      if (q.trim()) params.set("q", q.trim());
      if (fav) params.set("favorited", "1");
      const res = await fetch(`/api/materials?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMaterials(query, sort, favoritedOnly);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, sort, favoritedOnly, fetchMaterials]);
  const refetch = reactExports.useCallback(() => {
    fetchMaterials(query, sort, favoritedOnly);
  }, [query, sort, favoritedOnly, fetchMaterials]);
  return { items, total, loading, error, refetch };
}
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
function useComposedRefs(...refs) {
  return reactExports.useCallback(composeRefs(...refs), refs);
}
var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
var use = React[" use ".trim().toString()];
function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value;
}
function isLazyComponent(element) {
  return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
// @__NO_SIDE_EFFECTS__
function createSlot$4(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$4(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable$4);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
var Slot$2 = /* @__PURE__ */ createSlot$4("Slot");
// @__NO_SIDE_EFFECTS__
function createSlotClone$4(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef$5(children);
      const props2 = mergeProps$4(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$5 = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable$4(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$5;
}
function mergeProps$4(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef$5(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}
const falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
const cx = clsx;
const cva = (base, config) => (props) => {
  var _config_compoundVariants;
  if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  const { variants, defaultVariants } = config;
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant];
    const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
    if (variantProp === null) return null;
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
    return variants[variant][variantKey];
  });
  const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
    let [key, value] = param;
    if (value === void 0) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
    let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
    return Object.entries(compoundVariantOptions).every((param2) => {
      let [key, value] = param2;
      return Array.isArray(value) ? value.includes({
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key]) : {
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key] === value;
    }) ? [
      ...acc,
      cvClass,
      cvClassName
    ] : acc;
  }, []);
  return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};
const concatArrays = (array1, array2) => {
  const combinedArray = new Array(array1.length + array2.length);
  for (let i = 0; i < array1.length; i++) {
    combinedArray[i] = array1[i];
  }
  for (let i = 0; i < array2.length; i++) {
    combinedArray[array1.length + i] = array2[i];
  }
  return combinedArray;
};
const createClassValidatorObject = (classGroupId, validator) => ({
  classGroupId,
  validator
});
const createClassPartObject = (nextPart = /* @__PURE__ */ new Map(), validators = null, classGroupId) => ({
  nextPart,
  validators,
  classGroupId
});
const CLASS_PART_SEPARATOR = "-";
const EMPTY_CONFLICTS = [];
const ARBITRARY_PROPERTY_PREFIX = "arbitrary..";
const createClassGroupUtils = (config) => {
  const classMap = createClassMap(config);
  const {
    conflictingClassGroups,
    conflictingClassGroupModifiers
  } = config;
  const getClassGroupId = (className) => {
    if (className.startsWith("[") && className.endsWith("]")) {
      return getGroupIdForArbitraryProperty(className);
    }
    const classParts = className.split(CLASS_PART_SEPARATOR);
    const startIndex = classParts[0] === "" && classParts.length > 1 ? 1 : 0;
    return getGroupRecursive(classParts, startIndex, classMap);
  };
  const getConflictingClassGroupIds = (classGroupId, hasPostfixModifier) => {
    if (hasPostfixModifier) {
      const modifierConflicts = conflictingClassGroupModifiers[classGroupId];
      const baseConflicts = conflictingClassGroups[classGroupId];
      if (modifierConflicts) {
        if (baseConflicts) {
          return concatArrays(baseConflicts, modifierConflicts);
        }
        return modifierConflicts;
      }
      return baseConflicts || EMPTY_CONFLICTS;
    }
    return conflictingClassGroups[classGroupId] || EMPTY_CONFLICTS;
  };
  return {
    getClassGroupId,
    getConflictingClassGroupIds
  };
};
const getGroupRecursive = (classParts, startIndex, classPartObject) => {
  const classPathsLength = classParts.length - startIndex;
  if (classPathsLength === 0) {
    return classPartObject.classGroupId;
  }
  const currentClassPart = classParts[startIndex];
  const nextClassPartObject = classPartObject.nextPart.get(currentClassPart);
  if (nextClassPartObject) {
    const result = getGroupRecursive(classParts, startIndex + 1, nextClassPartObject);
    if (result) return result;
  }
  const validators = classPartObject.validators;
  if (validators === null) {
    return void 0;
  }
  const classRest = startIndex === 0 ? classParts.join(CLASS_PART_SEPARATOR) : classParts.slice(startIndex).join(CLASS_PART_SEPARATOR);
  const validatorsLength = validators.length;
  for (let i = 0; i < validatorsLength; i++) {
    const validatorObj = validators[i];
    if (validatorObj.validator(classRest)) {
      return validatorObj.classGroupId;
    }
  }
  return void 0;
};
const getGroupIdForArbitraryProperty = (className) => className.slice(1, -1).indexOf(":") === -1 ? void 0 : (() => {
  const content = className.slice(1, -1);
  const colonIndex = content.indexOf(":");
  const property = content.slice(0, colonIndex);
  return property ? ARBITRARY_PROPERTY_PREFIX + property : void 0;
})();
const createClassMap = (config) => {
  const {
    theme,
    classGroups
  } = config;
  return processClassGroups(classGroups, theme);
};
const processClassGroups = (classGroups, theme) => {
  const classMap = createClassPartObject();
  for (const classGroupId in classGroups) {
    const group = classGroups[classGroupId];
    processClassesRecursively(group, classMap, classGroupId, theme);
  }
  return classMap;
};
const processClassesRecursively = (classGroup, classPartObject, classGroupId, theme) => {
  const len = classGroup.length;
  for (let i = 0; i < len; i++) {
    const classDefinition = classGroup[i];
    processClassDefinition(classDefinition, classPartObject, classGroupId, theme);
  }
};
const processClassDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
  if (typeof classDefinition === "string") {
    processStringDefinition(classDefinition, classPartObject, classGroupId);
    return;
  }
  if (typeof classDefinition === "function") {
    processFunctionDefinition(classDefinition, classPartObject, classGroupId, theme);
    return;
  }
  processObjectDefinition(classDefinition, classPartObject, classGroupId, theme);
};
const processStringDefinition = (classDefinition, classPartObject, classGroupId) => {
  const classPartObjectToEdit = classDefinition === "" ? classPartObject : getPart(classPartObject, classDefinition);
  classPartObjectToEdit.classGroupId = classGroupId;
};
const processFunctionDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
  if (isThemeGetter(classDefinition)) {
    processClassesRecursively(classDefinition(theme), classPartObject, classGroupId, theme);
    return;
  }
  if (classPartObject.validators === null) {
    classPartObject.validators = [];
  }
  classPartObject.validators.push(createClassValidatorObject(classGroupId, classDefinition));
};
const processObjectDefinition = (classDefinition, classPartObject, classGroupId, theme) => {
  const entries = Object.entries(classDefinition);
  const len = entries.length;
  for (let i = 0; i < len; i++) {
    const [key, value] = entries[i];
    processClassesRecursively(value, getPart(classPartObject, key), classGroupId, theme);
  }
};
const getPart = (classPartObject, path) => {
  let current = classPartObject;
  const parts = path.split(CLASS_PART_SEPARATOR);
  const len = parts.length;
  for (let i = 0; i < len; i++) {
    const part = parts[i];
    let next = current.nextPart.get(part);
    if (!next) {
      next = createClassPartObject();
      current.nextPart.set(part, next);
    }
    current = next;
  }
  return current;
};
const isThemeGetter = (func) => "isThemeGetter" in func && func.isThemeGetter === true;
const createLruCache = (maxCacheSize) => {
  if (maxCacheSize < 1) {
    return {
      get: () => void 0,
      set: () => {
      }
    };
  }
  let cacheSize = 0;
  let cache = /* @__PURE__ */ Object.create(null);
  let previousCache = /* @__PURE__ */ Object.create(null);
  const update = (key, value) => {
    cache[key] = value;
    cacheSize++;
    if (cacheSize > maxCacheSize) {
      cacheSize = 0;
      previousCache = cache;
      cache = /* @__PURE__ */ Object.create(null);
    }
  };
  return {
    get(key) {
      let value = cache[key];
      if (value !== void 0) {
        return value;
      }
      if ((value = previousCache[key]) !== void 0) {
        update(key, value);
        return value;
      }
    },
    set(key, value) {
      if (key in cache) {
        cache[key] = value;
      } else {
        update(key, value);
      }
    }
  };
};
const IMPORTANT_MODIFIER = "!";
const MODIFIER_SEPARATOR = ":";
const EMPTY_MODIFIERS = [];
const createResultObject = (modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition, isExternal) => ({
  modifiers,
  hasImportantModifier,
  baseClassName,
  maybePostfixModifierPosition,
  isExternal
});
const createParseClassName = (config) => {
  const {
    prefix,
    experimentalParseClassName
  } = config;
  let parseClassName = (className) => {
    const modifiers = [];
    let bracketDepth = 0;
    let parenDepth = 0;
    let modifierStart = 0;
    let postfixModifierPosition;
    const len = className.length;
    for (let index2 = 0; index2 < len; index2++) {
      const currentCharacter = className[index2];
      if (bracketDepth === 0 && parenDepth === 0) {
        if (currentCharacter === MODIFIER_SEPARATOR) {
          modifiers.push(className.slice(modifierStart, index2));
          modifierStart = index2 + 1;
          continue;
        }
        if (currentCharacter === "/") {
          postfixModifierPosition = index2;
          continue;
        }
      }
      if (currentCharacter === "[") bracketDepth++;
      else if (currentCharacter === "]") bracketDepth--;
      else if (currentCharacter === "(") parenDepth++;
      else if (currentCharacter === ")") parenDepth--;
    }
    const baseClassNameWithImportantModifier = modifiers.length === 0 ? className : className.slice(modifierStart);
    let baseClassName = baseClassNameWithImportantModifier;
    let hasImportantModifier = false;
    if (baseClassNameWithImportantModifier.endsWith(IMPORTANT_MODIFIER)) {
      baseClassName = baseClassNameWithImportantModifier.slice(0, -1);
      hasImportantModifier = true;
    } else if (
      /**
       * In Tailwind CSS v3 the important modifier was at the start of the base class name. This is still supported for legacy reasons.
       * @see https://github.com/dcastil/tailwind-merge/issues/513#issuecomment-2614029864
       */
      baseClassNameWithImportantModifier.startsWith(IMPORTANT_MODIFIER)
    ) {
      baseClassName = baseClassNameWithImportantModifier.slice(1);
      hasImportantModifier = true;
    }
    const maybePostfixModifierPosition = postfixModifierPosition && postfixModifierPosition > modifierStart ? postfixModifierPosition - modifierStart : void 0;
    return createResultObject(modifiers, hasImportantModifier, baseClassName, maybePostfixModifierPosition);
  };
  if (prefix) {
    const fullPrefix = prefix + MODIFIER_SEPARATOR;
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => className.startsWith(fullPrefix) ? parseClassNameOriginal(className.slice(fullPrefix.length)) : createResultObject(EMPTY_MODIFIERS, false, className, void 0, true);
  }
  if (experimentalParseClassName) {
    const parseClassNameOriginal = parseClassName;
    parseClassName = (className) => experimentalParseClassName({
      className,
      parseClassName: parseClassNameOriginal
    });
  }
  return parseClassName;
};
const createSortModifiers = (config) => {
  const modifierWeights = /* @__PURE__ */ new Map();
  config.orderSensitiveModifiers.forEach((mod, index2) => {
    modifierWeights.set(mod, 1e6 + index2);
  });
  return (modifiers) => {
    const result = [];
    let currentSegment = [];
    for (let i = 0; i < modifiers.length; i++) {
      const modifier = modifiers[i];
      const isArbitrary = modifier[0] === "[";
      const isOrderSensitive = modifierWeights.has(modifier);
      if (isArbitrary || isOrderSensitive) {
        if (currentSegment.length > 0) {
          currentSegment.sort();
          result.push(...currentSegment);
          currentSegment = [];
        }
        result.push(modifier);
      } else {
        currentSegment.push(modifier);
      }
    }
    if (currentSegment.length > 0) {
      currentSegment.sort();
      result.push(...currentSegment);
    }
    return result;
  };
};
const createConfigUtils = (config) => ({
  cache: createLruCache(config.cacheSize),
  parseClassName: createParseClassName(config),
  sortModifiers: createSortModifiers(config),
  ...createClassGroupUtils(config)
});
const SPLIT_CLASSES_REGEX = /\s+/;
const mergeClassList = (classList, configUtils) => {
  const {
    parseClassName,
    getClassGroupId,
    getConflictingClassGroupIds,
    sortModifiers
  } = configUtils;
  const classGroupsInConflict = [];
  const classNames = classList.trim().split(SPLIT_CLASSES_REGEX);
  let result = "";
  for (let index2 = classNames.length - 1; index2 >= 0; index2 -= 1) {
    const originalClassName = classNames[index2];
    const {
      isExternal,
      modifiers,
      hasImportantModifier,
      baseClassName,
      maybePostfixModifierPosition
    } = parseClassName(originalClassName);
    if (isExternal) {
      result = originalClassName + (result.length > 0 ? " " + result : result);
      continue;
    }
    let hasPostfixModifier = !!maybePostfixModifierPosition;
    let classGroupId = getClassGroupId(hasPostfixModifier ? baseClassName.substring(0, maybePostfixModifierPosition) : baseClassName);
    if (!classGroupId) {
      if (!hasPostfixModifier) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      classGroupId = getClassGroupId(baseClassName);
      if (!classGroupId) {
        result = originalClassName + (result.length > 0 ? " " + result : result);
        continue;
      }
      hasPostfixModifier = false;
    }
    const variantModifier = modifiers.length === 0 ? "" : modifiers.length === 1 ? modifiers[0] : sortModifiers(modifiers).join(":");
    const modifierId = hasImportantModifier ? variantModifier + IMPORTANT_MODIFIER : variantModifier;
    const classId = modifierId + classGroupId;
    if (classGroupsInConflict.indexOf(classId) > -1) {
      continue;
    }
    classGroupsInConflict.push(classId);
    const conflictGroups = getConflictingClassGroupIds(classGroupId, hasPostfixModifier);
    for (let i = 0; i < conflictGroups.length; ++i) {
      const group = conflictGroups[i];
      classGroupsInConflict.push(modifierId + group);
    }
    result = originalClassName + (result.length > 0 ? " " + result : result);
  }
  return result;
};
const twJoin = (...classLists) => {
  let index2 = 0;
  let argument;
  let resolvedValue;
  let string = "";
  while (index2 < classLists.length) {
    if (argument = classLists[index2++]) {
      if (resolvedValue = toValue(argument)) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
};
const toValue = (mix) => {
  if (typeof mix === "string") {
    return mix;
  }
  let resolvedValue;
  let string = "";
  for (let k = 0; k < mix.length; k++) {
    if (mix[k]) {
      if (resolvedValue = toValue(mix[k])) {
        string && (string += " ");
        string += resolvedValue;
      }
    }
  }
  return string;
};
const createTailwindMerge = (createConfigFirst, ...createConfigRest) => {
  let configUtils;
  let cacheGet;
  let cacheSet;
  let functionToCall;
  const initTailwindMerge = (classList) => {
    const config = createConfigRest.reduce((previousConfig, createConfigCurrent) => createConfigCurrent(previousConfig), createConfigFirst());
    configUtils = createConfigUtils(config);
    cacheGet = configUtils.cache.get;
    cacheSet = configUtils.cache.set;
    functionToCall = tailwindMerge;
    return tailwindMerge(classList);
  };
  const tailwindMerge = (classList) => {
    const cachedResult = cacheGet(classList);
    if (cachedResult) {
      return cachedResult;
    }
    const result = mergeClassList(classList, configUtils);
    cacheSet(classList, result);
    return result;
  };
  functionToCall = initTailwindMerge;
  return (...args) => functionToCall(twJoin(...args));
};
const fallbackThemeArr = [];
const fromTheme = (key) => {
  const themeGetter = (theme) => theme[key] || fallbackThemeArr;
  themeGetter.isThemeGetter = true;
  return themeGetter;
};
const arbitraryValueRegex = /^\[(?:(\w[\w-]*):)?(.+)\]$/i;
const arbitraryVariableRegex = /^\((?:(\w[\w-]*):)?(.+)\)$/i;
const fractionRegex = /^\d+\/\d+$/;
const tshirtUnitRegex = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/;
const lengthUnitRegex = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/;
const colorFunctionRegex = /^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix)\(.+\)$/;
const shadowRegex = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/;
const imageRegex = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/;
const isFraction = (value) => fractionRegex.test(value);
const isNumber = (value) => !!value && !Number.isNaN(Number(value));
const isInteger = (value) => !!value && Number.isInteger(Number(value));
const isPercent = (value) => value.endsWith("%") && isNumber(value.slice(0, -1));
const isTshirtSize = (value) => tshirtUnitRegex.test(value);
const isAny = () => true;
const isLengthOnly = (value) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  lengthUnitRegex.test(value) && !colorFunctionRegex.test(value)
);
const isNever = () => false;
const isShadow = (value) => shadowRegex.test(value);
const isImage = (value) => imageRegex.test(value);
const isAnyNonArbitrary = (value) => !isArbitraryValue(value) && !isArbitraryVariable(value);
const isArbitrarySize = (value) => getIsArbitraryValue(value, isLabelSize, isNever);
const isArbitraryValue = (value) => arbitraryValueRegex.test(value);
const isArbitraryLength = (value) => getIsArbitraryValue(value, isLabelLength, isLengthOnly);
const isArbitraryNumber = (value) => getIsArbitraryValue(value, isLabelNumber, isNumber);
const isArbitraryPosition = (value) => getIsArbitraryValue(value, isLabelPosition, isNever);
const isArbitraryImage = (value) => getIsArbitraryValue(value, isLabelImage, isImage);
const isArbitraryShadow = (value) => getIsArbitraryValue(value, isLabelShadow, isShadow);
const isArbitraryVariable = (value) => arbitraryVariableRegex.test(value);
const isArbitraryVariableLength = (value) => getIsArbitraryVariable(value, isLabelLength);
const isArbitraryVariableFamilyName = (value) => getIsArbitraryVariable(value, isLabelFamilyName);
const isArbitraryVariablePosition = (value) => getIsArbitraryVariable(value, isLabelPosition);
const isArbitraryVariableSize = (value) => getIsArbitraryVariable(value, isLabelSize);
const isArbitraryVariableImage = (value) => getIsArbitraryVariable(value, isLabelImage);
const isArbitraryVariableShadow = (value) => getIsArbitraryVariable(value, isLabelShadow, true);
const getIsArbitraryValue = (value, testLabel, testValue) => {
  const result = arbitraryValueRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return testValue(result[2]);
  }
  return false;
};
const getIsArbitraryVariable = (value, testLabel, shouldMatchNoLabel = false) => {
  const result = arbitraryVariableRegex.exec(value);
  if (result) {
    if (result[1]) {
      return testLabel(result[1]);
    }
    return shouldMatchNoLabel;
  }
  return false;
};
const isLabelPosition = (label) => label === "position" || label === "percentage";
const isLabelImage = (label) => label === "image" || label === "url";
const isLabelSize = (label) => label === "length" || label === "size" || label === "bg-size";
const isLabelLength = (label) => label === "length";
const isLabelNumber = (label) => label === "number";
const isLabelFamilyName = (label) => label === "family-name";
const isLabelShadow = (label) => label === "shadow";
const getDefaultConfig = () => {
  const themeColor = fromTheme("color");
  const themeFont = fromTheme("font");
  const themeText = fromTheme("text");
  const themeFontWeight = fromTheme("font-weight");
  const themeTracking = fromTheme("tracking");
  const themeLeading = fromTheme("leading");
  const themeBreakpoint = fromTheme("breakpoint");
  const themeContainer = fromTheme("container");
  const themeSpacing = fromTheme("spacing");
  const themeRadius = fromTheme("radius");
  const themeShadow = fromTheme("shadow");
  const themeInsetShadow = fromTheme("inset-shadow");
  const themeTextShadow = fromTheme("text-shadow");
  const themeDropShadow = fromTheme("drop-shadow");
  const themeBlur = fromTheme("blur");
  const themePerspective = fromTheme("perspective");
  const themeAspect = fromTheme("aspect");
  const themeEase = fromTheme("ease");
  const themeAnimate = fromTheme("animate");
  const scaleBreak = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"];
  const scalePosition = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ];
  const scalePositionWithArbitrary = () => [...scalePosition(), isArbitraryVariable, isArbitraryValue];
  const scaleOverflow = () => ["auto", "hidden", "clip", "visible", "scroll"];
  const scaleOverscroll = () => ["auto", "contain", "none"];
  const scaleUnambiguousSpacing = () => [isArbitraryVariable, isArbitraryValue, themeSpacing];
  const scaleInset = () => [isFraction, "full", "auto", ...scaleUnambiguousSpacing()];
  const scaleGridTemplateColsRows = () => [isInteger, "none", "subgrid", isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartAndEnd = () => ["auto", {
    span: ["full", isInteger, isArbitraryVariable, isArbitraryValue]
  }, isInteger, isArbitraryVariable, isArbitraryValue];
  const scaleGridColRowStartOrEnd = () => [isInteger, "auto", isArbitraryVariable, isArbitraryValue];
  const scaleGridAutoColsRows = () => ["auto", "min", "max", "fr", isArbitraryVariable, isArbitraryValue];
  const scaleAlignPrimaryAxis = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"];
  const scaleAlignSecondaryAxis = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"];
  const scaleMargin = () => ["auto", ...scaleUnambiguousSpacing()];
  const scaleSizing = () => [isFraction, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...scaleUnambiguousSpacing()];
  const scaleColor = () => [themeColor, isArbitraryVariable, isArbitraryValue];
  const scaleBgPosition = () => [...scalePosition(), isArbitraryVariablePosition, isArbitraryPosition, {
    position: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleBgRepeat = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }];
  const scaleBgSize = () => ["auto", "cover", "contain", isArbitraryVariableSize, isArbitrarySize, {
    size: [isArbitraryVariable, isArbitraryValue]
  }];
  const scaleGradientStopPosition = () => [isPercent, isArbitraryVariableLength, isArbitraryLength];
  const scaleRadius = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    themeRadius,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleBorderWidth = () => ["", isNumber, isArbitraryVariableLength, isArbitraryLength];
  const scaleLineStyle = () => ["solid", "dashed", "dotted", "double"];
  const scaleBlendMode = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"];
  const scaleMaskImagePosition = () => [isNumber, isPercent, isArbitraryVariablePosition, isArbitraryPosition];
  const scaleBlur = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    themeBlur,
    isArbitraryVariable,
    isArbitraryValue
  ];
  const scaleRotate = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleScale = () => ["none", isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleSkew = () => [isNumber, isArbitraryVariable, isArbitraryValue];
  const scaleTranslate = () => [isFraction, "full", ...scaleUnambiguousSpacing()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [isTshirtSize],
      breakpoint: [isTshirtSize],
      color: [isAny],
      container: [isTshirtSize],
      "drop-shadow": [isTshirtSize],
      ease: ["in", "out", "in-out"],
      font: [isAnyNonArbitrary],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [isTshirtSize],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [isTshirtSize],
      shadow: [isTshirtSize],
      spacing: ["px", isNumber],
      text: [isTshirtSize],
      "text-shadow": [isTshirtSize],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", isFraction, isArbitraryValue, isArbitraryVariable, themeAspect]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [isNumber, isArbitraryValue, isArbitraryVariable, themeContainer]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": scaleBreak()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": scaleBreak()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: scalePositionWithArbitrary()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: scaleOverflow()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": scaleOverflow()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": scaleOverflow()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: scaleOverscroll()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": scaleOverscroll()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": scaleOverscroll()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: scaleInset()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": scaleInset()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": scaleInset()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: scaleInset()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: scaleInset()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: scaleInset()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: scaleInset()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: scaleInset()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: scaleInset()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [isInteger, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [isFraction, "full", "auto", themeContainer, ...scaleUnambiguousSpacing()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [isNumber, isFraction, "auto", "initial", "none", isArbitraryValue]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [isInteger, "first", "last", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": scaleGridTemplateColsRows()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: scaleGridColRowStartAndEnd()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": scaleGridColRowStartOrEnd()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": scaleGridAutoColsRows()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": scaleGridAutoColsRows()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: scaleUnambiguousSpacing()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": scaleUnambiguousSpacing()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": scaleUnambiguousSpacing()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...scaleAlignPrimaryAxis(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...scaleAlignSecondaryAxis(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...scaleAlignPrimaryAxis()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...scaleAlignSecondaryAxis(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...scaleAlignSecondaryAxis(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": scaleAlignPrimaryAxis()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...scaleAlignSecondaryAxis(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...scaleAlignSecondaryAxis()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: scaleUnambiguousSpacing()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: scaleUnambiguousSpacing()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: scaleUnambiguousSpacing()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: scaleUnambiguousSpacing()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: scaleMargin()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: scaleMargin()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: scaleMargin()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: scaleMargin()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: scaleMargin()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: scaleMargin()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: scaleMargin()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: scaleMargin()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: scaleMargin()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": scaleUnambiguousSpacing()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: scaleSizing()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [themeContainer, "screen", ...scaleSizing()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          themeContainer,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...scaleSizing()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          themeContainer,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [themeBreakpoint]
          },
          ...scaleSizing()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", "lh", ...scaleSizing()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "lh", "none", ...scaleSizing()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", "lh", ...scaleSizing()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", themeText, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [themeFontWeight, isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", isPercent, isArbitraryValue]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [isArbitraryVariableFamilyName, isArbitraryValue, themeFont]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [themeTracking, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [isNumber, "none", isArbitraryVariable, isArbitraryNumber]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          themeLeading,
          ...scaleUnambiguousSpacing()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: scaleColor()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: scaleColor()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...scaleLineStyle(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [isNumber, "from-font", "auto", isArbitraryVariable, isArbitraryLength]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: scaleColor()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [isNumber, "auto", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: scaleUnambiguousSpacing()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: scaleBgPosition()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: scaleBgRepeat()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: scaleBgSize()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, isInteger, isArbitraryVariable, isArbitraryValue],
          radial: ["", isArbitraryVariable, isArbitraryValue],
          conic: [isInteger, isArbitraryVariable, isArbitraryValue]
        }, isArbitraryVariableImage, isArbitraryImage]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: scaleColor()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: scaleGradientStopPosition()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: scaleColor()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: scaleColor()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: scaleColor()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: scaleRadius()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": scaleRadius()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": scaleRadius()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": scaleRadius()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": scaleRadius()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": scaleRadius()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": scaleRadius()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": scaleRadius()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": scaleRadius()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": scaleRadius()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": scaleRadius()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": scaleRadius()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": scaleRadius()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": scaleRadius()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": scaleRadius()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: scaleBorderWidth()
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": scaleBorderWidth()
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": scaleBorderWidth()
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": scaleBorderWidth()
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": scaleBorderWidth()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": scaleBorderWidth()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": scaleBorderWidth()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": scaleBorderWidth()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": scaleBorderWidth()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": scaleBorderWidth()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": scaleBorderWidth()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...scaleLineStyle(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: scaleColor()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": scaleColor()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": scaleColor()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": scaleColor()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": scaleColor()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": scaleColor()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": scaleColor()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": scaleColor()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": scaleColor()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: scaleColor()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...scaleLineStyle(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", isNumber, isArbitraryVariableLength, isArbitraryLength]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: scaleColor()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: scaleColor()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", themeInsetShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": scaleColor()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: scaleBorderWidth()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: scaleColor()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [isNumber, isArbitraryLength]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": scaleColor()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": scaleBorderWidth()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": scaleColor()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", themeTextShadow, isArbitraryVariableShadow, isArbitraryShadow]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": scaleColor()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...scaleBlendMode(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": scaleBlendMode()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [isNumber]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": scaleMaskImagePosition()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": scaleMaskImagePosition()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": scaleColor()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": scaleColor()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": scaleMaskImagePosition()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": scaleMaskImagePosition()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": scaleColor()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": scaleColor()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": scaleMaskImagePosition()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": scaleMaskImagePosition()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": scaleColor()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": scaleColor()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": scaleMaskImagePosition()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": scaleMaskImagePosition()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": scaleColor()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": scaleColor()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": scaleMaskImagePosition()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": scaleMaskImagePosition()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": scaleColor()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": scaleColor()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": scaleMaskImagePosition()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": scaleMaskImagePosition()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": scaleColor()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": scaleColor()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": scaleMaskImagePosition()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": scaleMaskImagePosition()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": scaleColor()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": scaleColor()
      }],
      "mask-image-radial": [{
        "mask-radial": [isArbitraryVariable, isArbitraryValue]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": scaleMaskImagePosition()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": scaleMaskImagePosition()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": scaleColor()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": scaleColor()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": scalePosition()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [isNumber]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": scaleMaskImagePosition()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": scaleMaskImagePosition()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": scaleColor()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": scaleColor()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: scaleBgPosition()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: scaleBgRepeat()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: scaleBgSize()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", isArbitraryVariable, isArbitraryValue]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: scaleBlur()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          themeDropShadow,
          isArbitraryVariableShadow,
          isArbitraryShadow
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": scaleColor()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          isArbitraryVariable,
          isArbitraryValue
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": scaleBlur()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": scaleUnambiguousSpacing()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": scaleUnambiguousSpacing()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [isNumber, "initial", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", themeEase, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [isNumber, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", themeAnimate, isArbitraryVariable, isArbitraryValue]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [themePerspective, isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": scalePositionWithArbitrary()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: scaleRotate()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": scaleRotate()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": scaleRotate()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": scaleRotate()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: scaleScale()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": scaleScale()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": scaleScale()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": scaleScale()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: scaleSkew()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": scaleSkew()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": scaleSkew()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [isArbitraryVariable, isArbitraryValue, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: scalePositionWithArbitrary()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: scaleTranslate()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": scaleTranslate()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": scaleTranslate()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": scaleTranslate()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: scaleColor()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: scaleColor()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", isArbitraryVariable, isArbitraryValue]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": scaleUnambiguousSpacing()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", isArbitraryVariable, isArbitraryValue]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...scaleColor()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [isNumber, isArbitraryVariableLength, isArbitraryLength, isArbitraryNumber]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...scaleColor()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
};
const twMerge = /* @__PURE__ */ createTailwindMerge(getDefaultConfig);
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot$2 : "span";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Comp,
    {
      "code-path": "src/components/ui/badge.tsx:38:5",
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
      ...props
    }
  );
}
function getTypeLabel(mimeType) {
  if (mimeType.startsWith("video/")) return { icon: Video, label: "Video" };
  if (mimeType === "application/pdf") return { icon: FileText, label: "PDF" };
  if (mimeType.includes("presentationml")) return { icon: Presentation, label: "PPT" };
  if (mimeType.includes("wordprocessingml")) return { icon: FileText, label: "DOC" };
  if (mimeType === "text/plain") return { icon: FileText, label: "TXT" };
  return { icon: File, label: "File" };
}
function FileIcon({ mimeType }) {
  const { icon: Icon2, label } = getTypeLabel(mimeType);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/FileIcon.tsx:22:5", className: "flex flex-col items-center justify-center gap-2 h-full", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "code-path": "src/components/material/FileIcon.tsx:23:7", size: 48, className: "text-cabinet-inkMuted" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { "code-path": "src/components/material/FileIcon.tsx:24:7", variant: "secondary", children: label })
  ] });
}
function isImageMime(mimeType) {
  return mimeType.startsWith("image/");
}
function isVideoMime(mimeType) {
  return mimeType.startsWith("video/");
}
function formatFileSize$1(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function MaterialCard({ item, onDelete, onRename, onToggleFavorite, onPreview }) {
  const { t } = useI18n();
  const isImage2 = isImageMime(item.mimeType);
  const isVideo = isVideoMime(item.mimeType);
  const [editing, setEditing] = reactExports.useState(false);
  const [draftName, setDraftName] = reactExports.useState(item.fileName);
  const commitRename = async () => {
    const next = draftName.trim();
    if (!next) {
      setDraftName(item.fileName);
      setEditing(false);
      return;
    }
    if (next !== item.fileName) {
      await onRename(item.id, next);
    }
    setEditing(false);
  };
  const favorited = Boolean(item.favorited);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "code-path": "src/components/material/MaterialCard.tsx:52:5",
      className: "group border border-cabinet-border bg-cabinet-paper rounded-lg overflow-hidden hover:shadow-sm transition-shadow cursor-pointer",
      "aria-label": item.fileName,
      onClick: () => onPreview?.(item.id),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialCard.tsx:57:7", className: "relative aspect-square overflow-hidden bg-cabinet-bg", children: [
          isImage2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              "code-path": "src/components/material/MaterialCard.tsx:59:11",
              src: `/api/materials/${item.id}/file`,
              alt: item.fileName,
              className: "w-full h-full object-cover",
              loading: "lazy"
            }
          ) : isVideo ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "video",
            {
              "code-path": "src/components/material/MaterialCard.tsx:66:11",
              src: `/api/materials/${item.id}/file`,
              className: "w-full h-full object-cover",
              muted: true,
              playsInline: true,
              preload: "metadata"
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(FileIcon, { "code-path": "src/components/material/MaterialCard.tsx:74:11", mimeType: item.mimeType, fileName: item.fileName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialCard.tsx:76:9", className: "absolute top-2 left-2 flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "a",
              {
                "code-path": "src/components/material/MaterialCard.tsx:77:11",
                href: `/api/materials/${item.id}/file?download=1`,
                download: item.fileName,
                onClick: (e) => e.stopPropagation(),
                className: "flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70",
                "aria-label": t("library.download"),
                title: t("library.download"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { "code-path": "src/components/material/MaterialCard.tsx:85:13", size: 14 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                "code-path": "src/components/material/MaterialCard.tsx:87:11",
                type: "button",
                onClick: (e) => {
                  e.stopPropagation();
                  void onToggleFavorite(item.id, !favorited);
                },
                className: `flex h-7 w-7 items-center justify-center rounded transition-opacity hover:bg-black/70 ${favorited ? "bg-amber-400/90 text-white opacity-100" : "bg-black/50 text-white opacity-0 group-hover:opacity-100"}`,
                "aria-label": favorited ? t("library.unfavorite") : t("library.favorite"),
                "aria-pressed": favorited,
                title: favorited ? t("library.unfavorite") : t("library.favorite"),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { "code-path": "src/components/material/MaterialCard.tsx:99:13", size: 14, fill: favorited ? "currentColor" : "none" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/material/MaterialCard.tsx:102:9",
              type: "button",
              onClick: (e) => {
                e.stopPropagation();
                onDelete(item.id);
              },
              className: "absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70",
              "aria-label": t("library.delete"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { "code-path": "src/components/material/MaterialCard.tsx:108:11", size: 14 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialCard.tsx:111:7", className: "px-3 py-2", children: [
          editing ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              "code-path": "src/components/material/MaterialCard.tsx:113:11",
              value: draftName,
              onChange: (event) => setDraftName(event.target.value),
              onClick: (event) => event.stopPropagation(),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void commitRename();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraftName(item.fileName);
                  setEditing(false);
                }
              },
              onBlur: () => void commitRename(),
              className: "w-full rounded border border-cabinet-blue bg-cabinet-paper px-2 py-1 text-sm font-medium text-cabinet-ink outline-none",
              autoFocus: true
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              "code-path": "src/components/material/MaterialCard.tsx:133:11",
              className: "text-sm font-medium text-cabinet-ink truncate cursor-text",
              onDoubleClick: (event) => {
                event.stopPropagation();
                setDraftName(item.fileName);
                setEditing(true);
              },
              title: t("library.rename"),
              children: item.fileName
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialCard.tsx:145:9", className: "text-xs text-cabinet-inkMuted mt-1", children: [
            formatFileSize$1(item.fileSize),
            " · ",
            new Date(item.addedAt).toLocaleDateString()
          ] })
        ] })
      ]
    }
  );
}
function MaterialGrid({ items, onDelete, onRename, onToggleFavorite, onPreview }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialGrid.tsx:14:5", className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4", children: items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    MaterialCard,
    {
      "code-path": "src/components/material/MaterialGrid.tsx:16:9",
      item,
      onDelete,
      onRename,
      onToggleFavorite,
      onPreview
    },
    item.id
  )) });
}
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      "code-path": "src/components/ui/input.tsx:7:5",
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    }
  );
}
function MaterialSearchBar({ value, onChange }) {
  const { t } = useI18n();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialSearchBar.tsx:14:5", className: "relative flex-1 max-w-sm", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { "code-path": "src/components/material/MaterialSearchBar.tsx:15:7", size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-cabinet-inkMuted pointer-events-none" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Input,
      {
        "code-path": "src/components/material/MaterialSearchBar.tsx:16:7",
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder: t("library.searchPlaceholder"),
        "aria-label": t("library.search"),
        className: "h-10 pl-9 pr-8 bg-cabinet-paper border-cabinet-border"
      }
    ),
    value && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        "code-path": "src/components/material/MaterialSearchBar.tsx:24:9",
        type: "button",
        onClick: () => onChange(""),
        className: "absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center text-cabinet-inkMuted hover:text-cabinet-ink",
        "aria-label": t("library.clearSearch"),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "code-path": "src/components/material/MaterialSearchBar.tsx:30:11", size: 14 })
      }
    )
  ] });
}
var reactDomExports = requireReactDom();
const ReactDOM = /* @__PURE__ */ getDefaultExportFromCjs(reactDomExports);
function clamp$1(value, [min2, max2]) {
  return Math.min(max2, Math.max(min2, value));
}
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
  return function handleEvent(event) {
    originalEventHandler?.(event);
    if (checkForDefaultPrevented === false || !event.defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
}
function createContext2(rootComponentName, defaultContext) {
  const Context = reactExports.createContext(defaultContext);
  const Provider = (props) => {
    const { children, ...context } = props;
    const value = reactExports.useMemo(() => context, Object.values(context));
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, { value, children });
  };
  Provider.displayName = rootComponentName + "Provider";
  function useContext2(consumerName) {
    const context = reactExports.useContext(Context);
    if (context) return context;
    if (defaultContext !== void 0) return defaultContext;
    throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
  }
  return [Provider, useContext2];
}
function createContextScope(scopeName, createContextScopeDeps = []) {
  let defaultContexts = [];
  function createContext3(rootComponentName, defaultContext) {
    const BaseContext = reactExports.createContext(defaultContext);
    const index2 = defaultContexts.length;
    defaultContexts = [...defaultContexts, defaultContext];
    const Provider = (props) => {
      const { scope, children, ...context } = props;
      const Context = scope?.[scopeName]?.[index2] || BaseContext;
      const value = reactExports.useMemo(() => context, Object.values(context));
      return /* @__PURE__ */ jsxRuntimeExports.jsx(Context.Provider, { value, children });
    };
    Provider.displayName = rootComponentName + "Provider";
    function useContext2(consumerName, scope) {
      const Context = scope?.[scopeName]?.[index2] || BaseContext;
      const context = reactExports.useContext(Context);
      if (context) return context;
      if (defaultContext !== void 0) return defaultContext;
      throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
    }
    return [Provider, useContext2];
  }
  const createScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return reactExports.createContext(defaultContext);
    });
    return function useScope(scope) {
      const contexts = scope?.[scopeName] || scopeContexts;
      return reactExports.useMemo(
        () => ({ [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts } }),
        [scope, contexts]
      );
    };
  };
  createScope.scopeName = scopeName;
  return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
  const baseScope = scopes[0];
  if (scopes.length === 1) return baseScope;
  const createScope = () => {
    const scopeHooks = scopes.map((createScope2) => ({
      useScope: createScope2(),
      scopeName: createScope2.scopeName
    }));
    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
        const scopeProps = useScope(overrideScopes);
        const currentScope = scopeProps[`__scope${scopeName}`];
        return { ...nextScopes2, ...currentScope };
      }, {});
      return reactExports.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
    };
  };
  createScope.scopeName = baseScope.scopeName;
  return createScope;
}
// @__NO_SIDE_EFFECTS__
function createSlot$3(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$3(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable$3);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone$3(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef$4(children);
      const props2 = mergeProps$3(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$4 = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable$3(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$4;
}
function mergeProps$3(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef$4(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
function createCollection(name) {
  const PROVIDER_NAME = name + "CollectionProvider";
  const [createCollectionContext, createCollectionScope2] = createContextScope(PROVIDER_NAME);
  const [CollectionProviderImpl, useCollectionContext] = createCollectionContext(
    PROVIDER_NAME,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  );
  const CollectionProvider = (props) => {
    const { scope, children } = props;
    const ref = React2.useRef(null);
    const itemMap = React2.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionProviderImpl, { scope, itemMap, collectionRef: ref, children });
  };
  CollectionProvider.displayName = PROVIDER_NAME;
  const COLLECTION_SLOT_NAME = name + "CollectionSlot";
  const CollectionSlotImpl = /* @__PURE__ */ createSlot$3(COLLECTION_SLOT_NAME);
  const CollectionSlot = React2.forwardRef(
    (props, forwardedRef) => {
      const { scope, children } = props;
      const context = useCollectionContext(COLLECTION_SLOT_NAME, scope);
      const composedRefs = useComposedRefs(forwardedRef, context.collectionRef);
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionSlotImpl, { ref: composedRefs, children });
    }
  );
  CollectionSlot.displayName = COLLECTION_SLOT_NAME;
  const ITEM_SLOT_NAME = name + "CollectionItemSlot";
  const ITEM_DATA_ATTR = "data-radix-collection-item";
  const CollectionItemSlotImpl = /* @__PURE__ */ createSlot$3(ITEM_SLOT_NAME);
  const CollectionItemSlot = React2.forwardRef(
    (props, forwardedRef) => {
      const { scope, children, ...itemData } = props;
      const ref = React2.useRef(null);
      const composedRefs = useComposedRefs(forwardedRef, ref);
      const context = useCollectionContext(ITEM_SLOT_NAME, scope);
      React2.useEffect(() => {
        context.itemMap.set(ref, { ref, ...itemData });
        return () => void context.itemMap.delete(ref);
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(CollectionItemSlotImpl, { ...{ [ITEM_DATA_ATTR]: "" }, ref: composedRefs, children });
    }
  );
  CollectionItemSlot.displayName = ITEM_SLOT_NAME;
  function useCollection2(scope) {
    const context = useCollectionContext(name + "CollectionConsumer", scope);
    const getItems = React2.useCallback(() => {
      const collectionNode = context.collectionRef.current;
      if (!collectionNode) return [];
      const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
      const items = Array.from(context.itemMap.values());
      const orderedItems = items.sort(
        (a, b) => orderedNodes.indexOf(a.ref.current) - orderedNodes.indexOf(b.ref.current)
      );
      return orderedItems;
    }, [context.collectionRef, context.itemMap]);
    return getItems;
  }
  return [
    { Provider: CollectionProvider, Slot: CollectionSlot, ItemSlot: CollectionItemSlot },
    useCollection2,
    createCollectionScope2
  ];
}
var DirectionContext = reactExports.createContext(void 0);
function useDirection(localDir) {
  const globalDir = reactExports.useContext(DirectionContext);
  return localDir || globalDir || "ltr";
}
// @__NO_SIDE_EFFECTS__
function createSlot$2(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$2(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable$2);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone$2(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef$3(children);
      const props2 = mergeProps$2(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$3 = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable$2(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$3;
}
function mergeProps$2(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef$3(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot2 = /* @__PURE__ */ createSlot$2(`Primitive.${node}`);
  const Node2 = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[/* @__PURE__ */ Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node2.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node2 };
}, {});
function dispatchDiscreteCustomEvent(target, event) {
  if (target) reactDomExports.flushSync(() => target.dispatchEvent(event));
}
function useCallbackRef$1(callback) {
  const callbackRef = reactExports.useRef(callback);
  reactExports.useEffect(() => {
    callbackRef.current = callback;
  });
  return reactExports.useMemo(() => (...args) => callbackRef.current?.(...args), []);
}
function useEscapeKeydown(onEscapeKeyDownProp, ownerDocument = globalThis?.document) {
  const onEscapeKeyDown = useCallbackRef$1(onEscapeKeyDownProp);
  reactExports.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onEscapeKeyDown(event);
      }
    };
    ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [onEscapeKeyDown, ownerDocument]);
}
var DISMISSABLE_LAYER_NAME = "DismissableLayer";
var CONTEXT_UPDATE = "dismissableLayer.update";
var POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
var FOCUS_OUTSIDE = "dismissableLayer.focusOutside";
var originalBodyPointerEvents;
var DismissableLayerContext = reactExports.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
});
var DismissableLayer = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      disableOutsidePointerEvents = false,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      onDismiss,
      ...layerProps
    } = props;
    const context = reactExports.useContext(DismissableLayerContext);
    const [node, setNode] = reactExports.useState(null);
    const ownerDocument = node?.ownerDocument ?? globalThis?.document;
    const [, force] = reactExports.useState({});
    const composedRefs = useComposedRefs(forwardedRef, (node2) => setNode(node2));
    const layers = Array.from(context.layers);
    const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
    const highestLayerWithOutsidePointerEventsDisabledIndex = layers.indexOf(highestLayerWithOutsidePointerEventsDisabled);
    const index2 = node ? layers.indexOf(node) : -1;
    const isBodyPointerEventsDisabled = context.layersWithOutsidePointerEventsDisabled.size > 0;
    const isPointerEventsEnabled = index2 >= highestLayerWithOutsidePointerEventsDisabledIndex;
    const pointerDownOutside = usePointerDownOutside((event) => {
      const target = event.target;
      const isPointerDownOnBranch = [...context.branches].some((branch) => branch.contains(target));
      if (!isPointerEventsEnabled || isPointerDownOnBranch) return;
      onPointerDownOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);
    const focusOutside = useFocusOutside((event) => {
      const target = event.target;
      const isFocusInBranch = [...context.branches].some((branch) => branch.contains(target));
      if (isFocusInBranch) return;
      onFocusOutside?.(event);
      onInteractOutside?.(event);
      if (!event.defaultPrevented) onDismiss?.();
    }, ownerDocument);
    useEscapeKeydown((event) => {
      const isHighestLayer = index2 === context.layers.size - 1;
      if (!isHighestLayer) return;
      onEscapeKeyDown?.(event);
      if (!event.defaultPrevented && onDismiss) {
        event.preventDefault();
        onDismiss();
      }
    }, ownerDocument);
    reactExports.useEffect(() => {
      if (!node) return;
      if (disableOutsidePointerEvents) {
        if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
          originalBodyPointerEvents = ownerDocument.body.style.pointerEvents;
          ownerDocument.body.style.pointerEvents = "none";
        }
        context.layersWithOutsidePointerEventsDisabled.add(node);
      }
      context.layers.add(node);
      dispatchUpdate();
      return () => {
        if (disableOutsidePointerEvents && context.layersWithOutsidePointerEventsDisabled.size === 1) {
          ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
        }
      };
    }, [node, ownerDocument, disableOutsidePointerEvents, context]);
    reactExports.useEffect(() => {
      return () => {
        if (!node) return;
        context.layers.delete(node);
        context.layersWithOutsidePointerEventsDisabled.delete(node);
        dispatchUpdate();
      };
    }, [node, context]);
    reactExports.useEffect(() => {
      const handleUpdate = () => force({});
      document.addEventListener(CONTEXT_UPDATE, handleUpdate);
      return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        ...layerProps,
        ref: composedRefs,
        style: {
          pointerEvents: isBodyPointerEventsDisabled ? isPointerEventsEnabled ? "auto" : "none" : void 0,
          ...props.style
        },
        onFocusCapture: composeEventHandlers(props.onFocusCapture, focusOutside.onFocusCapture),
        onBlurCapture: composeEventHandlers(props.onBlurCapture, focusOutside.onBlurCapture),
        onPointerDownCapture: composeEventHandlers(
          props.onPointerDownCapture,
          pointerDownOutside.onPointerDownCapture
        )
      }
    );
  }
);
DismissableLayer.displayName = DISMISSABLE_LAYER_NAME;
var BRANCH_NAME = "DismissableLayerBranch";
var DismissableLayerBranch = reactExports.forwardRef((props, forwardedRef) => {
  const context = reactExports.useContext(DismissableLayerContext);
  const ref = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, ref);
  reactExports.useEffect(() => {
    const node = ref.current;
    if (node) {
      context.branches.add(node);
      return () => {
        context.branches.delete(node);
      };
    }
  }, [context.branches]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { ...props, ref: composedRefs });
});
DismissableLayerBranch.displayName = BRANCH_NAME;
function usePointerDownOutside(onPointerDownOutside, ownerDocument = globalThis?.document) {
  const handlePointerDownOutside = useCallbackRef$1(onPointerDownOutside);
  const isPointerInsideReactTreeRef = reactExports.useRef(false);
  const handleClickRef = reactExports.useRef(() => {
  });
  reactExports.useEffect(() => {
    const handlePointerDown = (event) => {
      if (event.target && !isPointerInsideReactTreeRef.current) {
        let handleAndDispatchPointerDownOutsideEvent2 = function() {
          handleAndDispatchCustomEvent(
            POINTER_DOWN_OUTSIDE,
            handlePointerDownOutside,
            eventDetail,
            { discrete: true }
          );
        };
        const eventDetail = { originalEvent: event };
        if (event.pointerType === "touch") {
          ownerDocument.removeEventListener("click", handleClickRef.current);
          handleClickRef.current = handleAndDispatchPointerDownOutsideEvent2;
          ownerDocument.addEventListener("click", handleClickRef.current, { once: true });
        } else {
          handleAndDispatchPointerDownOutsideEvent2();
        }
      } else {
        ownerDocument.removeEventListener("click", handleClickRef.current);
      }
      isPointerInsideReactTreeRef.current = false;
    };
    const timerId = window.setTimeout(() => {
      ownerDocument.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timerId);
      ownerDocument.removeEventListener("pointerdown", handlePointerDown);
      ownerDocument.removeEventListener("click", handleClickRef.current);
    };
  }, [ownerDocument, handlePointerDownOutside]);
  return {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => isPointerInsideReactTreeRef.current = true
  };
}
function useFocusOutside(onFocusOutside, ownerDocument = globalThis?.document) {
  const handleFocusOutside = useCallbackRef$1(onFocusOutside);
  const isFocusInsideReactTreeRef = reactExports.useRef(false);
  reactExports.useEffect(() => {
    const handleFocus = (event) => {
      if (event.target && !isFocusInsideReactTreeRef.current) {
        const eventDetail = { originalEvent: event };
        handleAndDispatchCustomEvent(FOCUS_OUTSIDE, handleFocusOutside, eventDetail, {
          discrete: false
        });
      }
    };
    ownerDocument.addEventListener("focusin", handleFocus);
    return () => ownerDocument.removeEventListener("focusin", handleFocus);
  }, [ownerDocument, handleFocusOutside]);
  return {
    onFocusCapture: () => isFocusInsideReactTreeRef.current = true,
    onBlurCapture: () => isFocusInsideReactTreeRef.current = false
  };
}
function dispatchUpdate() {
  const event = new CustomEvent(CONTEXT_UPDATE);
  document.dispatchEvent(event);
}
function handleAndDispatchCustomEvent(name, handler, detail, { discrete }) {
  const target = detail.originalEvent.target;
  const event = new CustomEvent(name, { bubbles: false, cancelable: true, detail });
  if (handler) target.addEventListener(name, handler, { once: true });
  if (discrete) {
    dispatchDiscreteCustomEvent(target, event);
  } else {
    target.dispatchEvent(event);
  }
}
var count$1 = 0;
function useFocusGuards() {
  reactExports.useEffect(() => {
    const edgeGuards = document.querySelectorAll("[data-radix-focus-guard]");
    document.body.insertAdjacentElement("afterbegin", edgeGuards[0] ?? createFocusGuard());
    document.body.insertAdjacentElement("beforeend", edgeGuards[1] ?? createFocusGuard());
    count$1++;
    return () => {
      if (count$1 === 1) {
        document.querySelectorAll("[data-radix-focus-guard]").forEach((node) => node.remove());
      }
      count$1--;
    };
  }, []);
}
function createFocusGuard() {
  const element = document.createElement("span");
  element.setAttribute("data-radix-focus-guard", "");
  element.tabIndex = 0;
  element.style.outline = "none";
  element.style.opacity = "0";
  element.style.position = "fixed";
  element.style.pointerEvents = "none";
  return element;
}
var AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
var AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
var EVENT_OPTIONS = { bubbles: false, cancelable: true };
var FOCUS_SCOPE_NAME = "FocusScope";
var FocusScope = reactExports.forwardRef((props, forwardedRef) => {
  const {
    loop = false,
    trapped = false,
    onMountAutoFocus: onMountAutoFocusProp,
    onUnmountAutoFocus: onUnmountAutoFocusProp,
    ...scopeProps
  } = props;
  const [container, setContainer] = reactExports.useState(null);
  const onMountAutoFocus = useCallbackRef$1(onMountAutoFocusProp);
  const onUnmountAutoFocus = useCallbackRef$1(onUnmountAutoFocusProp);
  const lastFocusedElementRef = reactExports.useRef(null);
  const composedRefs = useComposedRefs(forwardedRef, (node) => setContainer(node));
  const focusScope = reactExports.useRef({
    paused: false,
    pause() {
      this.paused = true;
    },
    resume() {
      this.paused = false;
    }
  }).current;
  reactExports.useEffect(() => {
    if (trapped) {
      let handleFocusIn2 = function(event) {
        if (focusScope.paused || !container) return;
        const target = event.target;
        if (container.contains(target)) {
          lastFocusedElementRef.current = target;
        } else {
          focus(lastFocusedElementRef.current, { select: true });
        }
      }, handleFocusOut2 = function(event) {
        if (focusScope.paused || !container) return;
        const relatedTarget = event.relatedTarget;
        if (relatedTarget === null) return;
        if (!container.contains(relatedTarget)) {
          focus(lastFocusedElementRef.current, { select: true });
        }
      }, handleMutations2 = function(mutations) {
        const focusedElement = document.activeElement;
        if (focusedElement !== document.body) return;
        for (const mutation of mutations) {
          if (mutation.removedNodes.length > 0) focus(container);
        }
      };
      document.addEventListener("focusin", handleFocusIn2);
      document.addEventListener("focusout", handleFocusOut2);
      const mutationObserver = new MutationObserver(handleMutations2);
      if (container) mutationObserver.observe(container, { childList: true, subtree: true });
      return () => {
        document.removeEventListener("focusin", handleFocusIn2);
        document.removeEventListener("focusout", handleFocusOut2);
        mutationObserver.disconnect();
      };
    }
  }, [trapped, container, focusScope.paused]);
  reactExports.useEffect(() => {
    if (container) {
      focusScopesStack.add(focusScope);
      const previouslyFocusedElement = document.activeElement;
      const hasFocusedCandidate = container.contains(previouslyFocusedElement);
      if (!hasFocusedCandidate) {
        const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
        container.addEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
        container.dispatchEvent(mountEvent);
        if (!mountEvent.defaultPrevented) {
          focusFirst(removeLinks(getTabbableCandidates(container)), { select: true });
          if (document.activeElement === previouslyFocusedElement) {
            focus(container);
          }
        }
      }
      return () => {
        container.removeEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
        setTimeout(() => {
          const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
          container.addEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
          container.dispatchEvent(unmountEvent);
          if (!unmountEvent.defaultPrevented) {
            focus(previouslyFocusedElement ?? document.body, { select: true });
          }
          container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
          focusScopesStack.remove(focusScope);
        }, 0);
      };
    }
  }, [container, onMountAutoFocus, onUnmountAutoFocus, focusScope]);
  const handleKeyDown = reactExports.useCallback(
    (event) => {
      if (!loop && !trapped) return;
      if (focusScope.paused) return;
      const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
      const focusedElement = document.activeElement;
      if (isTabKey && focusedElement) {
        const container2 = event.currentTarget;
        const [first, last] = getTabbableEdges(container2);
        const hasTabbableElementsInside = first && last;
        if (!hasTabbableElementsInside) {
          if (focusedElement === container2) event.preventDefault();
        } else {
          if (!event.shiftKey && focusedElement === last) {
            event.preventDefault();
            if (loop) focus(first, { select: true });
          } else if (event.shiftKey && focusedElement === first) {
            event.preventDefault();
            if (loop) focus(last, { select: true });
          }
        }
      }
    },
    [loop, trapped, focusScope.paused]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { tabIndex: -1, ...scopeProps, ref: composedRefs, onKeyDown: handleKeyDown });
});
FocusScope.displayName = FOCUS_SCOPE_NAME;
function focusFirst(candidates, { select = false } = {}) {
  const previouslyFocusedElement = document.activeElement;
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (document.activeElement !== previouslyFocusedElement) return;
  }
}
function getTabbableEdges(container) {
  const candidates = getTabbableCandidates(container);
  const first = findVisible(candidates, container);
  const last = findVisible(candidates.reverse(), container);
  return [first, last];
}
function getTabbableCandidates(container) {
  const nodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
      if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
      return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}
function findVisible(elements, container) {
  for (const element of elements) {
    if (!isHidden(element, { upTo: container })) return element;
  }
}
function isHidden(node, { upTo }) {
  if (getComputedStyle(node).visibility === "hidden") return true;
  while (node) {
    if (upTo !== void 0 && node === upTo) return false;
    if (getComputedStyle(node).display === "none") return true;
    node = node.parentElement;
  }
  return false;
}
function isSelectableInput(element) {
  return element instanceof HTMLInputElement && "select" in element;
}
function focus(element, { select = false } = {}) {
  if (element && element.focus) {
    const previouslyFocusedElement = document.activeElement;
    element.focus({ preventScroll: true });
    if (element !== previouslyFocusedElement && isSelectableInput(element) && select)
      element.select();
  }
}
var focusScopesStack = createFocusScopesStack();
function createFocusScopesStack() {
  let stack = [];
  return {
    add(focusScope) {
      const activeFocusScope = stack[0];
      if (focusScope !== activeFocusScope) {
        activeFocusScope?.pause();
      }
      stack = arrayRemove(stack, focusScope);
      stack.unshift(focusScope);
    },
    remove(focusScope) {
      stack = arrayRemove(stack, focusScope);
      stack[0]?.resume();
    }
  };
}
function arrayRemove(array, item) {
  const updatedArray = [...array];
  const index2 = updatedArray.indexOf(item);
  if (index2 !== -1) {
    updatedArray.splice(index2, 1);
  }
  return updatedArray;
}
function removeLinks(items) {
  return items.filter((item) => item.tagName !== "A");
}
var useLayoutEffect2 = globalThis?.document ? reactExports.useLayoutEffect : () => {
};
var useReactId = React[" useId ".trim().toString()] || (() => void 0);
var count = 0;
function useId(deterministicId) {
  const [id, setId] = reactExports.useState(useReactId());
  useLayoutEffect2(() => {
    setId((reactId) => reactId ?? String(count++));
  }, [deterministicId]);
  return deterministicId || (id ? `radix-${id}` : "");
}
const sides = ["top", "right", "bottom", "left"];
const min = Math.min;
const max = Math.max;
const round = Math.round;
const floor = Math.floor;
const createCoords = (v) => ({
  x: v,
  y: v
});
const oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
const oppositeAlignmentMap = {
  start: "end",
  end: "start"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
const yAxisSides = /* @__PURE__ */ new Set(["top", "bottom"]);
function getSideAxis(placement) {
  return yAxisSides.has(getSide(placement)) ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(/start|end/g, (alignment) => oppositeAlignmentMap[alignment]);
}
const lrPlacement = ["left", "right"];
const rlPlacement = ["right", "left"];
const tbPlacement = ["top", "bottom"];
const btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rlPlacement : lrPlacement;
      return isStart ? lrPlacement : rlPlacement;
    case "left":
    case "right":
      return isStart ? tbPlacement : btPlacement;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, (side) => oppositeSideMap[side]);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  const {
    x,
    y,
    width,
    height
  } = rect;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y
  };
}
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case "start":
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case "end":
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}
const computePosition$1 = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2
  } = config;
  const validMiddleware = middleware.filter(Boolean);
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
  let rects = await platform2.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let middlewareData = {};
  let resetCount = 0;
  for (let i = 0; i < validMiddleware.length; i++) {
    const {
      name,
      fn
    } = validMiddleware[i];
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform: platform2,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData = {
      ...middlewareData,
      [name]: {
        ...middlewareData[name],
        ...data
      }
    };
    if (reset && resetCount <= 50) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform2.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform: platform2,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
    element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === "floating" ? {
    x,
    y,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
  const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) ? await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
const arrow$3 = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform: platform2,
      elements,
      middlewareData
    } = state;
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform2.getDimensions(element);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const min$1 = minPadding;
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset2 = clamp(min$1, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset2 && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset2,
        centerOffset: center - offset2 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
const flip$2 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform: platform2,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements = [initialPlacement, ...fallbackPlacements];
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements[nextIndex];
        if (nextPlacement) {
          const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
          if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
          // overflows the main axis.
          overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$filter2;
              const placement2 = (_overflowsData$filter2 = overflowsData.filter((d) => {
                if (hasFallbackAxisSideDirection) {
                  const currentSideAxis = getSideAxis(d.placement);
                  return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  currentSideAxis === "y";
                }
                return true;
              }).map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
function getSideOffsets(overflow, rect) {
  return {
    top: overflow.top - rect.height,
    right: overflow.right - rect.width,
    bottom: overflow.bottom - rect.height,
    left: overflow.left - rect.width
  };
}
function isAnySideFullyClipped(overflow) {
  return sides.some((side) => overflow[side] >= 0);
}
const hide$2 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "hide",
    options,
    async fn(state) {
      const {
        rects
      } = state;
      const {
        strategy = "referenceHidden",
        ...detectOverflowOptions
      } = evaluate(options, state);
      switch (strategy) {
        case "referenceHidden": {
          const overflow = await detectOverflow(state, {
            ...detectOverflowOptions,
            elementContext: "reference"
          });
          const offsets = getSideOffsets(overflow, rects.reference);
          return {
            data: {
              referenceHiddenOffsets: offsets,
              referenceHidden: isAnySideFullyClipped(offsets)
            }
          };
        }
        case "escaped": {
          const overflow = await detectOverflow(state, {
            ...detectOverflowOptions,
            altBoundary: true
          });
          const offsets = getSideOffsets(overflow, rects.floating);
          return {
            data: {
              escapedOffsets: offsets,
              escaped: isAnySideFullyClipped(offsets)
            }
          };
        }
        default: {
          return {};
        }
      }
    }
  };
};
const originSides = /* @__PURE__ */ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform: platform2,
    elements
  } = state;
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = originSides.has(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
const offset$2 = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
const shift$2 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x2,
              y: y2
            } = _ref;
            return {
              x: x2,
              y: y2
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === "y" ? "top" : "left";
        const maxSide = mainAxis === "y" ? "bottom" : "right";
        const min2 = mainAxisCoord + overflow[minSide];
        const max2 = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min2, mainAxisCoord, max2);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === "y" ? "top" : "left";
        const maxSide = crossAxis === "y" ? "bottom" : "right";
        const min2 = crossAxisCoord + overflow[minSide];
        const max2 = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min2, crossAxisCoord, max2);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};
const limitShift$2 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    options,
    fn(state) {
      const {
        x,
        y,
        placement,
        rects,
        middlewareData
      } = state;
      const {
        offset: offset2 = 0,
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const crossAxis = getSideAxis(placement);
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      const rawOffset = evaluate(offset2, state);
      const computedOffset = typeof rawOffset === "number" ? {
        mainAxis: rawOffset,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...rawOffset
      };
      if (checkMainAxis) {
        const len = mainAxis === "y" ? "height" : "width";
        const limitMin = rects.reference[mainAxis] - rects.floating[len] + computedOffset.mainAxis;
        const limitMax = rects.reference[mainAxis] + rects.reference[len] - computedOffset.mainAxis;
        if (mainAxisCoord < limitMin) {
          mainAxisCoord = limitMin;
        } else if (mainAxisCoord > limitMax) {
          mainAxisCoord = limitMax;
        }
      }
      if (checkCrossAxis) {
        var _middlewareData$offse, _middlewareData$offse2;
        const len = mainAxis === "y" ? "width" : "height";
        const isOriginSide = originSides.has(getSide(placement));
        const limitMin = rects.reference[crossAxis] - rects.floating[len] + (isOriginSide ? ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse[crossAxis]) || 0 : 0) + (isOriginSide ? 0 : computedOffset.crossAxis);
        const limitMax = rects.reference[crossAxis] + rects.reference[len] + (isOriginSide ? 0 : ((_middlewareData$offse2 = middlewareData.offset) == null ? void 0 : _middlewareData$offse2[crossAxis]) || 0) - (isOriginSide ? computedOffset.crossAxis : 0);
        if (crossAxisCoord < limitMin) {
          crossAxisCoord = limitMin;
        } else if (crossAxisCoord > limitMax) {
          crossAxisCoord = limitMax;
        }
      }
      return {
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      };
    }
  };
};
const size$2 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "size",
    options,
    async fn(state) {
      var _state$middlewareData, _state$middlewareData2;
      const {
        placement,
        rects,
        platform: platform2,
        elements
      } = state;
      const {
        apply = () => {
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === "y";
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === "top" || side === "bottom") {
        heightSide = side;
        widthSide = alignment === (await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
      } else {
        widthSide = side;
        heightSide = alignment === "end" ? "top" : "bottom";
      }
      const maximumClippingHeight = height - overflow.top - overflow.bottom;
      const maximumClippingWidth = width - overflow.left - overflow.right;
      const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
      const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
      const noShift = !state.middlewareData.shift;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if ((_state$middlewareData = state.middlewareData.shift) != null && _state$middlewareData.enabled.x) {
        availableWidth = maximumClippingWidth;
      }
      if ((_state$middlewareData2 = state.middlewareData.shift) != null && _state$middlewareData2.enabled.y) {
        availableHeight = maximumClippingHeight;
      }
      if (noShift && !alignment) {
        const xMin = max(overflow.left, 0);
        const xMax = max(overflow.right, 0);
        const yMin = max(overflow.top, 0);
        const yMax = max(overflow.bottom, 0);
        if (isYAxis) {
          availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
        } else {
          availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform2.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};
function hasWindow() {
  return typeof window !== "undefined";
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === "undefined") {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
const invalidOverflowDisplayValues = /* @__PURE__ */ new Set(["inline", "contents"]);
function isOverflowElement(element) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle$1(element);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && !invalidOverflowDisplayValues.has(display);
}
const tableElements = /* @__PURE__ */ new Set(["table", "td", "th"]);
function isTableElement(element) {
  return tableElements.has(getNodeName(element));
}
const topLayerSelectors = [":popover-open", ":modal"];
function isTopLayer(element) {
  return topLayerSelectors.some((selector) => {
    try {
      return element.matches(selector);
    } catch (_e) {
      return false;
    }
  });
}
const transformProperties = ["transform", "translate", "scale", "rotate", "perspective"];
const willChangeValues = ["transform", "translate", "scale", "rotate", "perspective", "filter"];
const containValues = ["paint", "layout", "strict", "content"];
function isContainingBlock(elementOrCss) {
  const webkit = isWebKit();
  const css = isElement(elementOrCss) ? getComputedStyle$1(elementOrCss) : elementOrCss;
  return transformProperties.some((value) => css[value] ? css[value] !== "none" : false) || (css.containerType ? css.containerType !== "normal" : false) || !webkit && (css.backdropFilter ? css.backdropFilter !== "none" : false) || !webkit && (css.filter ? css.filter !== "none" : false) || willChangeValues.some((value) => (css.willChange || "").includes(value)) || containValues.some((value) => (css.contain || "").includes(value));
}
function getContainingBlock(element) {
  let currentNode = getParentNode(element);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (typeof CSS === "undefined" || !CSS.supports) return false;
  return CSS.supports("-webkit-backdrop-filter", "none");
}
const lastTraversableNodeNames = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function isLastTraversableNode(node) {
  return lastTraversableNodeNames.has(getNodeName(node));
}
function getComputedStyle$1(element) {
  return getWindow(element).getComputedStyle(element);
}
function getNodeScroll(element) {
  if (isElement(element)) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }
  return {
    scrollLeft: element.scrollX,
    scrollTop: element.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result = (
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    isShadowRoot(node) && node.host || // Fallback.
    getDocumentElement(node)
  );
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  if (traverseIframes === void 0) {
    traverseIframes = true;
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    const frameElement = getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
  }
  return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}
function getCssDimensions(element) {
  const css = getComputedStyle$1(element);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element);
  const offsetWidth = hasOffset ? element.offsetWidth : width;
  const offsetHeight = hasOffset ? element.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}
function unwrapElement(element) {
  return !isElement(element) ? element.contextElement : element;
}
function getScale(element) {
  const domElement = unwrapElement(element);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;
  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}
const noOffsets = /* @__PURE__ */ createCoords(0);
function getVisualOffsets(element) {
  const win = getWindow(element);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element)) {
    return false;
  }
  return isFixed;
}
function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element.getBoundingClientRect();
  const domElement = unwrapElement(element);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetParent && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle$1(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}
function getWindowScrollBarX(element, rect) {
  const leftScroll = getNodeScroll(element).scrollLeft;
  if (!rect) {
    return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
  }
  return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
  const htmlRect = documentElement.getBoundingClientRect();
  const x = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
  const y = htmlRect.top + scroll.scrollTop;
  return {
    x,
    y
  };
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === "fixed";
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
  };
}
function getClientRects(element) {
  return Array.from(element.getClientRects());
}
function getDocumentRect(element) {
  const html = getDocumentElement(element);
  const scroll = getNodeScroll(element);
  const body = element.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(element);
  const y = -scroll.scrollTop;
  if (getComputedStyle$1(body).direction === "rtl") {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}
const SCROLLBAR_MAX = 25;
function getViewportRect(element, strategy) {
  const win = getWindow(element);
  const html = getDocumentElement(element);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === "fixed") {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  const windowScrollbarX = getWindowScrollBarX(html);
  if (windowScrollbarX <= 0) {
    const doc = html.ownerDocument;
    const body = doc.body;
    const bodyStyles = getComputedStyle(body);
    const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
    const clippingStableScrollbarWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
    if (clippingStableScrollbarWidth <= SCROLLBAR_MAX) {
      width -= clippingStableScrollbarWidth;
    }
  } else if (windowScrollbarX <= SCROLLBAR_MAX) {
    width += windowScrollbarX;
  }
  return {
    width,
    height,
    x,
    y
  };
}
const absoluteOrFixed = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function getInnerBoundingClientRect(element, strategy) {
  const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
  const top = clientRect.top + element.clientTop;
  const left = clientRect.left + element.clientLeft;
  const scale = isHTMLElement(element) ? getScale(element) : createCoords(1);
  const width = element.clientWidth * scale.x;
  const height = element.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === "viewport") {
    rect = getViewportRect(element, strategy);
  } else if (clippingAncestor === "document") {
    rect = getDocumentRect(getDocumentElement(element));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element);
    rect = {
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
      width: clippingAncestor.width,
      height: clippingAncestor.height
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element, stopNode) {
  const parentNode = getParentNode(element);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle$1(parentNode).position === "fixed" || hasFixedPositionAncestor(parentNode, stopNode);
}
function getClippingElementAncestors(element, cache) {
  const cachedResult = cache.get(element);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle$1(element).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element) : element;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle$1(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === "fixed") {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === "static" && !!currentContainingBlockComputedStyle && absoluteOrFixed.has(currentContainingBlockComputedStyle.position) || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element, currentNode);
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element, result);
  return result;
}
function getClippingRect(_ref) {
  let {
    element,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstClippingAncestor = clippingAncestors[0];
  const clippingRect = clippingAncestors.reduce((accRect, clippingAncestor) => {
    const rect = getClientRectFromClippingAncestor(element, clippingAncestor, strategy);
    accRect.top = max(rect.top, accRect.top);
    accRect.right = min(rect.right, accRect.right);
    accRect.bottom = min(rect.bottom, accRect.bottom);
    accRect.left = max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromClippingAncestor(element, firstClippingAncestor, strategy));
  return {
    width: clippingRect.right - clippingRect.left,
    height: clippingRect.bottom - clippingRect.top,
    x: clippingRect.left,
    y: clippingRect.top
  };
}
function getDimensions(element) {
  const {
    width,
    height
  } = getCssDimensions(element);
  return {
    width,
    height
  };
}
function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  function setLeftRTLScrollbarOffset() {
    offsets.x = getWindowScrollBarX(documentElement);
  }
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      setLeftRTLScrollbarOffset();
    }
  }
  if (isFixed && !isOffsetParentAnElement && documentElement) {
    setLeftRTLScrollbarOffset();
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  const x = rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
  const y = rect.top + scroll.scrollTop - offsets.y - htmlOffset.y;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height
  };
}
function isStaticPositioned(element) {
  return getComputedStyle$1(element).position === "static";
}
function getTrueOffsetParent(element, polyfill) {
  if (!isHTMLElement(element) || getComputedStyle$1(element).position === "fixed") {
    return null;
  }
  if (polyfill) {
    return polyfill(element);
  }
  let rawOffsetParent = element.offsetParent;
  if (getDocumentElement(element) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}
function getOffsetParent(element, polyfill) {
  const win = getWindow(element);
  if (isTopLayer(element)) {
    return win;
  }
  if (!isHTMLElement(element)) {
    let svgOffsetParent = getParentNode(element);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element) || win;
}
const getElementRects = async function(data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};
function isRTL(element) {
  return getComputedStyle$1(element).direction === "rtl";
}
const platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};
function rectsAreEqual(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
function observeMove(element, onMove) {
  let io = null;
  let timeoutId;
  const root = getDocumentElement(element);
  function cleanup() {
    var _io;
    clearTimeout(timeoutId);
    (_io = io) == null || _io.disconnect();
    io = null;
  }
  function refresh(skip, threshold) {
    if (skip === void 0) {
      skip = false;
    }
    if (threshold === void 0) {
      threshold = 1;
    }
    cleanup();
    const elementRectForRootMargin = element.getBoundingClientRect();
    const {
      left,
      top,
      width,
      height
    } = elementRectForRootMargin;
    if (!skip) {
      onMove();
    }
    if (!width || !height) {
      return;
    }
    const insetTop = floor(top);
    const insetRight = floor(root.clientWidth - (left + width));
    const insetBottom = floor(root.clientHeight - (top + height));
    const insetLeft = floor(left);
    const rootMargin = -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px";
    const options = {
      rootMargin,
      threshold: max(0, min(1, threshold)) || 1
    };
    let isFirstUpdate = true;
    function handleObserve(entries) {
      const ratio = entries[0].intersectionRatio;
      if (ratio !== threshold) {
        if (!isFirstUpdate) {
          return refresh();
        }
        if (!ratio) {
          timeoutId = setTimeout(() => {
            refresh(false, 1e-7);
          }, 1e3);
        } else {
          refresh(false, ratio);
        }
      }
      if (ratio === 1 && !rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) {
        refresh();
      }
      isFirstUpdate = false;
    }
    try {
      io = new IntersectionObserver(handleObserve, {
        ...options,
        // Handle <iframe>s
        root: root.ownerDocument
      });
    } catch (_e) {
      io = new IntersectionObserver(handleObserve, options);
    }
    io.observe(element);
  }
  refresh(true);
  return cleanup;
}
function autoUpdate(reference, floating, update, options) {
  if (options === void 0) {
    options = {};
  }
  const {
    ancestorScroll = true,
    ancestorResize = true,
    elementResize = typeof ResizeObserver === "function",
    layoutShift = typeof IntersectionObserver === "function",
    animationFrame = false
  } = options;
  const referenceEl = unwrapElement(reference);
  const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...getOverflowAncestors(floating)] : [];
  ancestors.forEach((ancestor) => {
    ancestorScroll && ancestor.addEventListener("scroll", update, {
      passive: true
    });
    ancestorResize && ancestor.addEventListener("resize", update);
  });
  const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update) : null;
  let reobserveFrame = -1;
  let resizeObserver = null;
  if (elementResize) {
    resizeObserver = new ResizeObserver((_ref) => {
      let [firstEntry] = _ref;
      if (firstEntry && firstEntry.target === referenceEl && resizeObserver) {
        resizeObserver.unobserve(floating);
        cancelAnimationFrame(reobserveFrame);
        reobserveFrame = requestAnimationFrame(() => {
          var _resizeObserver;
          (_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
        });
      }
      update();
    });
    if (referenceEl && !animationFrame) {
      resizeObserver.observe(referenceEl);
    }
    resizeObserver.observe(floating);
  }
  let frameId;
  let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
  if (animationFrame) {
    frameLoop();
  }
  function frameLoop() {
    const nextRefRect = getBoundingClientRect(reference);
    if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) {
      update();
    }
    prevRefRect = nextRefRect;
    frameId = requestAnimationFrame(frameLoop);
  }
  update();
  return () => {
    var _resizeObserver2;
    ancestors.forEach((ancestor) => {
      ancestorScroll && ancestor.removeEventListener("scroll", update);
      ancestorResize && ancestor.removeEventListener("resize", update);
    });
    cleanupIo == null || cleanupIo();
    (_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
    resizeObserver = null;
    if (animationFrame) {
      cancelAnimationFrame(frameId);
    }
  };
}
const offset$1 = offset$2;
const shift$1 = shift$2;
const flip$1 = flip$2;
const size$1 = size$2;
const hide$1 = hide$2;
const arrow$2 = arrow$3;
const limitShift$1 = limitShift$2;
const computePosition = (reference, floating, options) => {
  const cache = /* @__PURE__ */ new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition$1(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};
var isClient = typeof document !== "undefined";
var noop = function noop2() {
};
var index = isClient ? reactExports.useLayoutEffect : noop;
function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === "function" && a.toString() === b.toString()) {
    return true;
  }
  let length;
  let i;
  let keys;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) return false;
      for (i = length; i-- !== 0; ) {
        if (!deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) {
      return false;
    }
    for (i = length; i-- !== 0; ) {
      if (!{}.hasOwnProperty.call(b, keys[i])) {
        return false;
      }
    }
    for (i = length; i-- !== 0; ) {
      const key = keys[i];
      if (key === "_owner" && a.$$typeof) {
        continue;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return a !== a && b !== b;
}
function getDPR(element) {
  if (typeof window === "undefined") {
    return 1;
  }
  const win = element.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}
function roundByDPR(element, value) {
  const dpr = getDPR(element);
  return Math.round(value * dpr) / dpr;
}
function useLatestRef(value) {
  const ref = reactExports.useRef(value);
  index(() => {
    ref.current = value;
  });
  return ref;
}
function useFloating(options) {
  if (options === void 0) {
    options = {};
  }
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2,
    elements: {
      reference: externalReference,
      floating: externalFloating
    } = {},
    transform = true,
    whileElementsMounted,
    open
  } = options;
  const [data, setData] = reactExports.useState({
    x: 0,
    y: 0,
    strategy,
    placement,
    middlewareData: {},
    isPositioned: false
  });
  const [latestMiddleware, setLatestMiddleware] = reactExports.useState(middleware);
  if (!deepEqual(latestMiddleware, middleware)) {
    setLatestMiddleware(middleware);
  }
  const [_reference, _setReference] = reactExports.useState(null);
  const [_floating, _setFloating] = reactExports.useState(null);
  const setReference = reactExports.useCallback((node) => {
    if (node !== referenceRef.current) {
      referenceRef.current = node;
      _setReference(node);
    }
  }, []);
  const setFloating = reactExports.useCallback((node) => {
    if (node !== floatingRef.current) {
      floatingRef.current = node;
      _setFloating(node);
    }
  }, []);
  const referenceEl = externalReference || _reference;
  const floatingEl = externalFloating || _floating;
  const referenceRef = reactExports.useRef(null);
  const floatingRef = reactExports.useRef(null);
  const dataRef = reactExports.useRef(data);
  const hasWhileElementsMounted = whileElementsMounted != null;
  const whileElementsMountedRef = useLatestRef(whileElementsMounted);
  const platformRef = useLatestRef(platform2);
  const openRef = useLatestRef(open);
  const update = reactExports.useCallback(() => {
    if (!referenceRef.current || !floatingRef.current) {
      return;
    }
    const config = {
      placement,
      strategy,
      middleware: latestMiddleware
    };
    if (platformRef.current) {
      config.platform = platformRef.current;
    }
    computePosition(referenceRef.current, floatingRef.current, config).then((data2) => {
      const fullData = {
        ...data2,
        // The floating element's position may be recomputed while it's closed
        // but still mounted (such as when transitioning out). To ensure
        // `isPositioned` will be `false` initially on the next open, avoid
        // setting it to `true` when `open === false` (must be specified).
        isPositioned: openRef.current !== false
      };
      if (isMountedRef.current && !deepEqual(dataRef.current, fullData)) {
        dataRef.current = fullData;
        reactDomExports.flushSync(() => {
          setData(fullData);
        });
      }
    });
  }, [latestMiddleware, placement, strategy, platformRef, openRef]);
  index(() => {
    if (open === false && dataRef.current.isPositioned) {
      dataRef.current.isPositioned = false;
      setData((data2) => ({
        ...data2,
        isPositioned: false
      }));
    }
  }, [open]);
  const isMountedRef = reactExports.useRef(false);
  index(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  index(() => {
    if (referenceEl) referenceRef.current = referenceEl;
    if (floatingEl) floatingRef.current = floatingEl;
    if (referenceEl && floatingEl) {
      if (whileElementsMountedRef.current) {
        return whileElementsMountedRef.current(referenceEl, floatingEl, update);
      }
      update();
    }
  }, [referenceEl, floatingEl, update, whileElementsMountedRef, hasWhileElementsMounted]);
  const refs = reactExports.useMemo(() => ({
    reference: referenceRef,
    floating: floatingRef,
    setReference,
    setFloating
  }), [setReference, setFloating]);
  const elements = reactExports.useMemo(() => ({
    reference: referenceEl,
    floating: floatingEl
  }), [referenceEl, floatingEl]);
  const floatingStyles = reactExports.useMemo(() => {
    const initialStyles = {
      position: strategy,
      left: 0,
      top: 0
    };
    if (!elements.floating) {
      return initialStyles;
    }
    const x = roundByDPR(elements.floating, data.x);
    const y = roundByDPR(elements.floating, data.y);
    if (transform) {
      return {
        ...initialStyles,
        transform: "translate(" + x + "px, " + y + "px)",
        ...getDPR(elements.floating) >= 1.5 && {
          willChange: "transform"
        }
      };
    }
    return {
      position: strategy,
      left: x,
      top: y
    };
  }, [strategy, transform, elements.floating, data.x, data.y]);
  return reactExports.useMemo(() => ({
    ...data,
    update,
    refs,
    elements,
    floatingStyles
  }), [data, update, refs, elements, floatingStyles]);
}
const arrow$1 = (options) => {
  function isRef(value) {
    return {}.hasOwnProperty.call(value, "current");
  }
  return {
    name: "arrow",
    options,
    fn(state) {
      const {
        element,
        padding
      } = typeof options === "function" ? options(state) : options;
      if (element && isRef(element)) {
        if (element.current != null) {
          return arrow$2({
            element: element.current,
            padding
          }).fn(state);
        }
        return {};
      }
      if (element) {
        return arrow$2({
          element,
          padding
        }).fn(state);
      }
      return {};
    }
  };
};
const offset = (options, deps) => ({
  ...offset$1(options),
  options: [options, deps]
});
const shift = (options, deps) => ({
  ...shift$1(options),
  options: [options, deps]
});
const limitShift = (options, deps) => ({
  ...limitShift$1(options),
  options: [options, deps]
});
const flip = (options, deps) => ({
  ...flip$1(options),
  options: [options, deps]
});
const size = (options, deps) => ({
  ...size$1(options),
  options: [options, deps]
});
const hide = (options, deps) => ({
  ...hide$1(options),
  options: [options, deps]
});
const arrow = (options, deps) => ({
  ...arrow$1(options),
  options: [options, deps]
});
var NAME$1 = "Arrow";
var Arrow$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { children, width = 10, height = 5, ...arrowProps } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.svg,
    {
      ...arrowProps,
      ref: forwardedRef,
      width,
      height,
      viewBox: "0 0 30 10",
      preserveAspectRatio: "none",
      children: props.asChild ? children : /* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: "0,0 30,0 15,10" })
    }
  );
});
Arrow$1.displayName = NAME$1;
var Root$1 = Arrow$1;
function useSize(element) {
  const [size2, setSize] = reactExports.useState(void 0);
  useLayoutEffect2(() => {
    if (element) {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
      const resizeObserver = new ResizeObserver((entries) => {
        if (!Array.isArray(entries)) {
          return;
        }
        if (!entries.length) {
          return;
        }
        const entry = entries[0];
        let width;
        let height;
        if ("borderBoxSize" in entry) {
          const borderSizeEntry = entry["borderBoxSize"];
          const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
          width = borderSize["inlineSize"];
          height = borderSize["blockSize"];
        } else {
          width = element.offsetWidth;
          height = element.offsetHeight;
        }
        setSize({ width, height });
      });
      resizeObserver.observe(element, { box: "border-box" });
      return () => resizeObserver.unobserve(element);
    } else {
      setSize(void 0);
    }
  }, [element]);
  return size2;
}
var POPPER_NAME = "Popper";
var [createPopperContext, createPopperScope] = createContextScope(POPPER_NAME);
var [PopperProvider, usePopperContext] = createPopperContext(POPPER_NAME);
var Popper = (props) => {
  const { __scopePopper, children } = props;
  const [anchor, setAnchor] = reactExports.useState(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PopperProvider, { scope: __scopePopper, anchor, onAnchorChange: setAnchor, children });
};
Popper.displayName = POPPER_NAME;
var ANCHOR_NAME = "PopperAnchor";
var PopperAnchor = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopePopper, virtualRef, ...anchorProps } = props;
    const context = usePopperContext(ANCHOR_NAME, __scopePopper);
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const anchorRef = reactExports.useRef(null);
    reactExports.useEffect(() => {
      const previousAnchor = anchorRef.current;
      anchorRef.current = virtualRef?.current || ref.current;
      if (previousAnchor !== anchorRef.current) {
        context.onAnchorChange(anchorRef.current);
      }
    });
    return virtualRef ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { ...anchorProps, ref: composedRefs });
  }
);
PopperAnchor.displayName = ANCHOR_NAME;
var CONTENT_NAME$3 = "PopperContent";
var [PopperContentProvider, useContentContext] = createPopperContext(CONTENT_NAME$3);
var PopperContent = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopePopper,
      side = "bottom",
      sideOffset = 0,
      align = "center",
      alignOffset = 0,
      arrowPadding = 0,
      avoidCollisions = true,
      collisionBoundary = [],
      collisionPadding: collisionPaddingProp = 0,
      sticky = "partial",
      hideWhenDetached = false,
      updatePositionStrategy = "optimized",
      onPlaced,
      ...contentProps
    } = props;
    const context = usePopperContext(CONTENT_NAME$3, __scopePopper);
    const [content, setContent] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
    const [arrow$12, setArrow] = reactExports.useState(null);
    const arrowSize = useSize(arrow$12);
    const arrowWidth = arrowSize?.width ?? 0;
    const arrowHeight = arrowSize?.height ?? 0;
    const desiredPlacement = side + (align !== "center" ? "-" + align : "");
    const collisionPadding = typeof collisionPaddingProp === "number" ? collisionPaddingProp : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp };
    const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
    const hasExplicitBoundaries = boundary.length > 0;
    const detectOverflowOptions = {
      padding: collisionPadding,
      boundary: boundary.filter(isNotNull),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      altBoundary: hasExplicitBoundaries
    };
    const { refs, floatingStyles, placement, isPositioned, middlewareData } = useFloating({
      // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
      strategy: "fixed",
      placement: desiredPlacement,
      whileElementsMounted: (...args) => {
        const cleanup = autoUpdate(...args, {
          animationFrame: updatePositionStrategy === "always"
        });
        return cleanup;
      },
      elements: {
        reference: context.anchor
      },
      middleware: [
        offset({ mainAxis: sideOffset + arrowHeight, alignmentAxis: alignOffset }),
        avoidCollisions && shift({
          mainAxis: true,
          crossAxis: false,
          limiter: sticky === "partial" ? limitShift() : void 0,
          ...detectOverflowOptions
        }),
        avoidCollisions && flip({ ...detectOverflowOptions }),
        size({
          ...detectOverflowOptions,
          apply: ({ elements, rects, availableWidth, availableHeight }) => {
            const { width: anchorWidth, height: anchorHeight } = rects.reference;
            const contentStyle = elements.floating.style;
            contentStyle.setProperty("--radix-popper-available-width", `${availableWidth}px`);
            contentStyle.setProperty("--radix-popper-available-height", `${availableHeight}px`);
            contentStyle.setProperty("--radix-popper-anchor-width", `${anchorWidth}px`);
            contentStyle.setProperty("--radix-popper-anchor-height", `${anchorHeight}px`);
          }
        }),
        arrow$12 && arrow({ element: arrow$12, padding: arrowPadding }),
        transformOrigin({ arrowWidth, arrowHeight }),
        hideWhenDetached && hide({ strategy: "referenceHidden", ...detectOverflowOptions })
      ]
    });
    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
    const handlePlaced = useCallbackRef$1(onPlaced);
    useLayoutEffect2(() => {
      if (isPositioned) {
        handlePlaced?.();
      }
    }, [isPositioned, handlePlaced]);
    const arrowX = middlewareData.arrow?.x;
    const arrowY = middlewareData.arrow?.y;
    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
    const [contentZIndex, setContentZIndex] = reactExports.useState();
    useLayoutEffect2(() => {
      if (content) setContentZIndex(window.getComputedStyle(content).zIndex);
    }, [content]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        ref: refs.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...floatingStyles,
          transform: isPositioned ? floatingStyles.transform : "translate(0, -200%)",
          // keep off the page when measuring
          minWidth: "max-content",
          zIndex: contentZIndex,
          ["--radix-popper-transform-origin"]: [
            middlewareData.transformOrigin?.x,
            middlewareData.transformOrigin?.y
          ].join(" "),
          // hide the content if using the hide middleware and should be hidden
          // set visibility to hidden and disable pointer events so the UI behaves
          // as if the PopperContent isn't there at all
          ...middlewareData.hide?.referenceHidden && {
            visibility: "hidden",
            pointerEvents: "none"
          }
        },
        dir: props.dir,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          PopperContentProvider,
          {
            scope: __scopePopper,
            placedSide,
            onArrowChange: setArrow,
            arrowX,
            arrowY,
            shouldHideArrow: cannotCenterArrow,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Primitive.div,
              {
                "data-side": placedSide,
                "data-align": placedAlign,
                ...contentProps,
                ref: composedRefs,
                style: {
                  ...contentProps.style,
                  // if the PopperContent hasn't been placed yet (not all measurements done)
                  // we prevent animations so that users's animation don't kick in too early referring wrong sides
                  animation: !isPositioned ? "none" : void 0
                }
              }
            )
          }
        )
      }
    );
  }
);
PopperContent.displayName = CONTENT_NAME$3;
var ARROW_NAME$1 = "PopperArrow";
var OPPOSITE_SIDE = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
};
var PopperArrow = reactExports.forwardRef(function PopperArrow2(props, forwardedRef) {
  const { __scopePopper, ...arrowProps } = props;
  const contentContext = useContentContext(ARROW_NAME$1, __scopePopper);
  const baseSide = OPPOSITE_SIDE[contentContext.placedSide];
  return (
    // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
    // doesn't report size as we'd expect on SVG elements.
    // it reports their bounding box which is effectively the largest path inside the SVG.
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        ref: contentContext.onArrowChange,
        style: {
          position: "absolute",
          left: contentContext.arrowX,
          top: contentContext.arrowY,
          [baseSide]: 0,
          transformOrigin: {
            top: "",
            right: "0 0",
            bottom: "center 0",
            left: "100% 0"
          }[contentContext.placedSide],
          transform: {
            top: "translateY(100%)",
            right: "translateY(50%) rotate(90deg) translateX(-50%)",
            bottom: `rotate(180deg)`,
            left: "translateY(50%) rotate(-90deg) translateX(50%)"
          }[contentContext.placedSide],
          visibility: contentContext.shouldHideArrow ? "hidden" : void 0
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Root$1,
          {
            ...arrowProps,
            ref: forwardedRef,
            style: {
              ...arrowProps.style,
              // ensures the element can be measured correctly (mostly for if SVG)
              display: "block"
            }
          }
        )
      }
    )
  );
});
PopperArrow.displayName = ARROW_NAME$1;
function isNotNull(value) {
  return value !== null;
}
var transformOrigin = (options) => ({
  name: "transformOrigin",
  options,
  fn(data) {
    const { placement, rects, middlewareData } = data;
    const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
    const isArrowHidden = cannotCenterArrow;
    const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
    const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;
    const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
    const noArrowAlign = { start: "0%", center: "50%", end: "100%" }[placedAlign];
    const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
    const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;
    let x = "";
    let y = "";
    if (placedSide === "bottom") {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${-arrowHeight}px`;
    } else if (placedSide === "top") {
      x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
      y = `${rects.floating.height + arrowHeight}px`;
    } else if (placedSide === "right") {
      x = `${-arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    } else if (placedSide === "left") {
      x = `${rects.floating.width + arrowHeight}px`;
      y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
    }
    return { data: { x, y } };
  }
});
function getSideAndAlignFromPlacement(placement) {
  const [side, align = "center"] = placement.split("-");
  return [side, align];
}
var Root2$2 = Popper;
var Anchor = PopperAnchor;
var Content$1 = PopperContent;
var Arrow = PopperArrow;
var PORTAL_NAME$3 = "Portal";
var Portal$2 = reactExports.forwardRef((props, forwardedRef) => {
  const { container: containerProp, ...portalProps } = props;
  const [mounted, setMounted] = reactExports.useState(false);
  useLayoutEffect2(() => setMounted(true), []);
  const container = containerProp || mounted && globalThis?.document?.body;
  return container ? ReactDOM.createPortal(/* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { ...portalProps, ref: forwardedRef }), container) : null;
});
Portal$2.displayName = PORTAL_NAME$3;
// @__NO_SIDE_EFFECTS__
function createSlot$1(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone$1(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable$1);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone$1(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef$2(children);
      const props2 = mergeProps$1(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$2 = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable$1(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$2;
}
function mergeProps$1(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef$2(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
var useInsertionEffect = React[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState({
  prop,
  defaultProp,
  onChange = () => {
  },
  caller
}) {
  const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
    defaultProp,
    onChange
  });
  const isControlled = prop !== void 0;
  const value = isControlled ? prop : uncontrolledProp;
  {
    const isControlledRef = reactExports.useRef(prop !== void 0);
    reactExports.useEffect(() => {
      const wasControlled = isControlledRef.current;
      if (wasControlled !== isControlled) {
        const from = wasControlled ? "controlled" : "uncontrolled";
        const to = isControlled ? "controlled" : "uncontrolled";
        console.warn(
          `${caller} is changing from ${from} to ${to}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
        );
      }
      isControlledRef.current = isControlled;
    }, [isControlled, caller]);
  }
  const setValue = reactExports.useCallback(
    (nextValue) => {
      if (isControlled) {
        const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
        if (value2 !== prop) {
          onChangeRef.current?.(value2);
        }
      } else {
        setUncontrolledProp(nextValue);
      }
    },
    [isControlled, prop, setUncontrolledProp, onChangeRef]
  );
  return [value, setValue];
}
function useUncontrolledState({
  defaultProp,
  onChange
}) {
  const [value, setValue] = reactExports.useState(defaultProp);
  const prevValueRef = reactExports.useRef(value);
  const onChangeRef = reactExports.useRef(onChange);
  useInsertionEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  reactExports.useEffect(() => {
    if (prevValueRef.current !== value) {
      onChangeRef.current?.(value);
      prevValueRef.current = value;
    }
  }, [value, prevValueRef]);
  return [value, setValue, onChangeRef];
}
function isFunction(value) {
  return typeof value === "function";
}
function usePrevious(value) {
  const ref = reactExports.useRef({ value, previous: value });
  return reactExports.useMemo(() => {
    if (ref.current.value !== value) {
      ref.current.previous = ref.current.value;
      ref.current.value = value;
    }
    return ref.current.previous;
  }, [value]);
}
var VISUALLY_HIDDEN_STYLES = Object.freeze({
  // See: https://github.com/twbs/bootstrap/blob/main/scss/mixins/_visually-hidden.scss
  position: "absolute",
  border: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  wordWrap: "normal"
});
var NAME = "VisuallyHidden";
var VisuallyHidden = reactExports.forwardRef(
  (props, forwardedRef) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        ...props,
        ref: forwardedRef,
        style: { ...VISUALLY_HIDDEN_STYLES, ...props.style }
      }
    );
  }
);
VisuallyHidden.displayName = NAME;
var getDefaultParent = function(originalTarget) {
  if (typeof document === "undefined") {
    return null;
  }
  var sampleTarget = Array.isArray(originalTarget) ? originalTarget[0] : originalTarget;
  return sampleTarget.ownerDocument.body;
};
var counterMap = /* @__PURE__ */ new WeakMap();
var uncontrolledNodes = /* @__PURE__ */ new WeakMap();
var markerMap = {};
var lockCount = 0;
var unwrapHost = function(node) {
  return node && (node.host || unwrapHost(node.parentNode));
};
var correctTargets = function(parent, targets) {
  return targets.map(function(target) {
    if (parent.contains(target)) {
      return target;
    }
    var correctedTarget = unwrapHost(target);
    if (correctedTarget && parent.contains(correctedTarget)) {
      return correctedTarget;
    }
    console.error("aria-hidden", target, "in not contained inside", parent, ". Doing nothing");
    return null;
  }).filter(function(x) {
    return Boolean(x);
  });
};
var applyAttributeToOthers = function(originalTarget, parentNode, markerName, controlAttribute) {
  var targets = correctTargets(parentNode, Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
  if (!markerMap[markerName]) {
    markerMap[markerName] = /* @__PURE__ */ new WeakMap();
  }
  var markerCounter = markerMap[markerName];
  var hiddenNodes = [];
  var elementsToKeep = /* @__PURE__ */ new Set();
  var elementsToStop = new Set(targets);
  var keep = function(el) {
    if (!el || elementsToKeep.has(el)) {
      return;
    }
    elementsToKeep.add(el);
    keep(el.parentNode);
  };
  targets.forEach(keep);
  var deep = function(parent) {
    if (!parent || elementsToStop.has(parent)) {
      return;
    }
    Array.prototype.forEach.call(parent.children, function(node) {
      if (elementsToKeep.has(node)) {
        deep(node);
      } else {
        try {
          var attr = node.getAttribute(controlAttribute);
          var alreadyHidden = attr !== null && attr !== "false";
          var counterValue = (counterMap.get(node) || 0) + 1;
          var markerValue = (markerCounter.get(node) || 0) + 1;
          counterMap.set(node, counterValue);
          markerCounter.set(node, markerValue);
          hiddenNodes.push(node);
          if (counterValue === 1 && alreadyHidden) {
            uncontrolledNodes.set(node, true);
          }
          if (markerValue === 1) {
            node.setAttribute(markerName, "true");
          }
          if (!alreadyHidden) {
            node.setAttribute(controlAttribute, "true");
          }
        } catch (e) {
          console.error("aria-hidden: cannot operate on ", node, e);
        }
      }
    });
  };
  deep(parentNode);
  elementsToKeep.clear();
  lockCount++;
  return function() {
    hiddenNodes.forEach(function(node) {
      var counterValue = counterMap.get(node) - 1;
      var markerValue = markerCounter.get(node) - 1;
      counterMap.set(node, counterValue);
      markerCounter.set(node, markerValue);
      if (!counterValue) {
        if (!uncontrolledNodes.has(node)) {
          node.removeAttribute(controlAttribute);
        }
        uncontrolledNodes.delete(node);
      }
      if (!markerValue) {
        node.removeAttribute(markerName);
      }
    });
    lockCount--;
    if (!lockCount) {
      counterMap = /* @__PURE__ */ new WeakMap();
      counterMap = /* @__PURE__ */ new WeakMap();
      uncontrolledNodes = /* @__PURE__ */ new WeakMap();
      markerMap = {};
    }
  };
};
var hideOthers = function(originalTarget, parentNode, markerName) {
  if (markerName === void 0) {
    markerName = "data-aria-hidden";
  }
  var targets = Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
  var activeParentNode = getDefaultParent(originalTarget);
  if (!activeParentNode) {
    return function() {
      return null;
    };
  }
  targets.push.apply(targets, Array.from(activeParentNode.querySelectorAll("[aria-live], script")));
  return applyAttributeToOthers(targets, activeParentNode, markerName, "aria-hidden");
};
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
var zeroRightClassName = "right-scroll-bar-position";
var fullWidthClassName = "width-before-scroll-bar";
var noScrollbarsClassName = "with-scroll-bars-hidden";
var removedBarSizeVariable = "--removed-body-scroll-bar-size";
function assignRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
  return ref;
}
function useCallbackRef(initialValue, callback) {
  var ref = reactExports.useState(function() {
    return {
      // value
      value: initialValue,
      // last callback
      callback,
      // "memoized" public interface
      facade: {
        get current() {
          return ref.value;
        },
        set current(value) {
          var last = ref.value;
          if (last !== value) {
            ref.value = value;
            ref.callback(value, last);
          }
        }
      }
    };
  })[0];
  ref.callback = callback;
  return ref.facade;
}
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? reactExports.useLayoutEffect : reactExports.useEffect;
var currentValues = /* @__PURE__ */ new WeakMap();
function useMergeRefs(refs, defaultValue) {
  var callbackRef = useCallbackRef(null, function(newValue) {
    return refs.forEach(function(ref) {
      return assignRef(ref, newValue);
    });
  });
  useIsomorphicLayoutEffect(function() {
    var oldValue = currentValues.get(callbackRef);
    if (oldValue) {
      var prevRefs_1 = new Set(oldValue);
      var nextRefs_1 = new Set(refs);
      var current_1 = callbackRef.current;
      prevRefs_1.forEach(function(ref) {
        if (!nextRefs_1.has(ref)) {
          assignRef(ref, null);
        }
      });
      nextRefs_1.forEach(function(ref) {
        if (!prevRefs_1.has(ref)) {
          assignRef(ref, current_1);
        }
      });
    }
    currentValues.set(callbackRef, refs);
  }, [refs]);
  return callbackRef;
}
function ItoI(a) {
  return a;
}
function innerCreateMedium(defaults, middleware) {
  if (middleware === void 0) {
    middleware = ItoI;
  }
  var buffer = [];
  var assigned = false;
  var medium = {
    read: function() {
      if (assigned) {
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      }
      if (buffer.length) {
        return buffer[buffer.length - 1];
      }
      return defaults;
    },
    useMedium: function(data) {
      var item = middleware(data, assigned);
      buffer.push(item);
      return function() {
        buffer = buffer.filter(function(x) {
          return x !== item;
        });
      };
    },
    assignSyncMedium: function(cb) {
      assigned = true;
      while (buffer.length) {
        var cbs = buffer;
        buffer = [];
        cbs.forEach(cb);
      }
      buffer = {
        push: function(x) {
          return cb(x);
        },
        filter: function() {
          return buffer;
        }
      };
    },
    assignMedium: function(cb) {
      assigned = true;
      var pendingQueue = [];
      if (buffer.length) {
        var cbs = buffer;
        buffer = [];
        cbs.forEach(cb);
        pendingQueue = buffer;
      }
      var executeQueue = function() {
        var cbs2 = pendingQueue;
        pendingQueue = [];
        cbs2.forEach(cb);
      };
      var cycle = function() {
        return Promise.resolve().then(executeQueue);
      };
      cycle();
      buffer = {
        push: function(x) {
          pendingQueue.push(x);
          cycle();
        },
        filter: function(filter) {
          pendingQueue = pendingQueue.filter(filter);
          return buffer;
        }
      };
    }
  };
  return medium;
}
function createSidecarMedium(options) {
  if (options === void 0) {
    options = {};
  }
  var medium = innerCreateMedium(null);
  medium.options = __assign({ async: true, ssr: false }, options);
  return medium;
}
var SideCar$1 = function(_a) {
  var sideCar = _a.sideCar, rest = __rest(_a, ["sideCar"]);
  if (!sideCar) {
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  }
  var Target = sideCar.read();
  if (!Target) {
    throw new Error("Sidecar medium not found");
  }
  return reactExports.createElement(Target, __assign({}, rest));
};
SideCar$1.isSideCarExport = true;
function exportSidecar(medium, exported) {
  medium.useMedium(exported);
  return SideCar$1;
}
var effectCar = createSidecarMedium();
var nothing = function() {
  return;
};
var RemoveScroll = reactExports.forwardRef(function(props, parentRef) {
  var ref = reactExports.useRef(null);
  var _a = reactExports.useState({
    onScrollCapture: nothing,
    onWheelCapture: nothing,
    onTouchMoveCapture: nothing
  }), callbacks = _a[0], setCallbacks = _a[1];
  var forwardProps = props.forwardProps, children = props.children, className = props.className, removeScrollBar = props.removeScrollBar, enabled = props.enabled, shards = props.shards, sideCar = props.sideCar, noRelative = props.noRelative, noIsolation = props.noIsolation, inert = props.inert, allowPinchZoom = props.allowPinchZoom, _b = props.as, Container = _b === void 0 ? "div" : _b, gapMode = props.gapMode, rest = __rest(props, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]);
  var SideCar2 = sideCar;
  var containerRef = useMergeRefs([ref, parentRef]);
  var containerProps = __assign(__assign({}, rest), callbacks);
  return reactExports.createElement(
    reactExports.Fragment,
    null,
    enabled && reactExports.createElement(SideCar2, { sideCar: effectCar, removeScrollBar, shards, noRelative, noIsolation, inert, setCallbacks, allowPinchZoom: !!allowPinchZoom, lockRef: ref, gapMode }),
    forwardProps ? reactExports.cloneElement(reactExports.Children.only(children), __assign(__assign({}, containerProps), { ref: containerRef })) : reactExports.createElement(Container, __assign({}, containerProps, { className, ref: containerRef }), children)
  );
});
RemoveScroll.defaultProps = {
  enabled: true,
  removeScrollBar: true,
  inert: false
};
RemoveScroll.classNames = {
  fullWidth: fullWidthClassName,
  zeroRight: zeroRightClassName
};
var getNonce = function() {
  if (typeof __webpack_nonce__ !== "undefined") {
    return __webpack_nonce__;
  }
  return void 0;
};
function makeStyleTag() {
  if (!document)
    return null;
  var tag = document.createElement("style");
  tag.type = "text/css";
  var nonce = getNonce();
  if (nonce) {
    tag.setAttribute("nonce", nonce);
  }
  return tag;
}
function injectStyles(tag, css) {
  if (tag.styleSheet) {
    tag.styleSheet.cssText = css;
  } else {
    tag.appendChild(document.createTextNode(css));
  }
}
function insertStyleTag(tag) {
  var head = document.head || document.getElementsByTagName("head")[0];
  head.appendChild(tag);
}
var stylesheetSingleton = function() {
  var counter = 0;
  var stylesheet = null;
  return {
    add: function(style) {
      if (counter == 0) {
        if (stylesheet = makeStyleTag()) {
          injectStyles(stylesheet, style);
          insertStyleTag(stylesheet);
        }
      }
      counter++;
    },
    remove: function() {
      counter--;
      if (!counter && stylesheet) {
        stylesheet.parentNode && stylesheet.parentNode.removeChild(stylesheet);
        stylesheet = null;
      }
    }
  };
};
var styleHookSingleton = function() {
  var sheet = stylesheetSingleton();
  return function(styles, isDynamic) {
    reactExports.useEffect(function() {
      sheet.add(styles);
      return function() {
        sheet.remove();
      };
    }, [styles && isDynamic]);
  };
};
var styleSingleton = function() {
  var useStyle = styleHookSingleton();
  var Sheet = function(_a) {
    var styles = _a.styles, dynamic = _a.dynamic;
    useStyle(styles, dynamic);
    return null;
  };
  return Sheet;
};
var zeroGap = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
};
var parse = function(x) {
  return parseInt(x || "", 10) || 0;
};
var getOffset = function(gapMode) {
  var cs = window.getComputedStyle(document.body);
  var left = cs[gapMode === "padding" ? "paddingLeft" : "marginLeft"];
  var top = cs[gapMode === "padding" ? "paddingTop" : "marginTop"];
  var right = cs[gapMode === "padding" ? "paddingRight" : "marginRight"];
  return [parse(left), parse(top), parse(right)];
};
var getGapWidth = function(gapMode) {
  if (gapMode === void 0) {
    gapMode = "margin";
  }
  if (typeof window === "undefined") {
    return zeroGap;
  }
  var offsets = getOffset(gapMode);
  var documentWidth = document.documentElement.clientWidth;
  var windowWidth = window.innerWidth;
  return {
    left: offsets[0],
    top: offsets[1],
    right: offsets[2],
    gap: Math.max(0, windowWidth - documentWidth + offsets[2] - offsets[0])
  };
};
var Style = styleSingleton();
var lockAttribute = "data-scroll-locked";
var getStyles = function(_a, allowRelative, gapMode, important) {
  var left = _a.left, top = _a.top, right = _a.right, gap = _a.gap;
  if (gapMode === void 0) {
    gapMode = "margin";
  }
  return "\n  .".concat(noScrollbarsClassName, " {\n   overflow: hidden ").concat(important, ";\n   padding-right: ").concat(gap, "px ").concat(important, ";\n  }\n  body[").concat(lockAttribute, "] {\n    overflow: hidden ").concat(important, ";\n    overscroll-behavior: contain;\n    ").concat([
    allowRelative && "position: relative ".concat(important, ";"),
    gapMode === "margin" && "\n    padding-left: ".concat(left, "px;\n    padding-top: ").concat(top, "px;\n    padding-right: ").concat(right, "px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: ").concat(gap, "px ").concat(important, ";\n    "),
    gapMode === "padding" && "padding-right: ".concat(gap, "px ").concat(important, ";")
  ].filter(Boolean).join(""), "\n  }\n  \n  .").concat(zeroRightClassName, " {\n    right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(fullWidthClassName, " {\n    margin-right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(zeroRightClassName, " .").concat(zeroRightClassName, " {\n    right: 0 ").concat(important, ";\n  }\n  \n  .").concat(fullWidthClassName, " .").concat(fullWidthClassName, " {\n    margin-right: 0 ").concat(important, ";\n  }\n  \n  body[").concat(lockAttribute, "] {\n    ").concat(removedBarSizeVariable, ": ").concat(gap, "px;\n  }\n");
};
var getCurrentUseCounter = function() {
  var counter = parseInt(document.body.getAttribute(lockAttribute) || "0", 10);
  return isFinite(counter) ? counter : 0;
};
var useLockAttribute = function() {
  reactExports.useEffect(function() {
    document.body.setAttribute(lockAttribute, (getCurrentUseCounter() + 1).toString());
    return function() {
      var newCounter = getCurrentUseCounter() - 1;
      if (newCounter <= 0) {
        document.body.removeAttribute(lockAttribute);
      } else {
        document.body.setAttribute(lockAttribute, newCounter.toString());
      }
    };
  }, []);
};
var RemoveScrollBar = function(_a) {
  var noRelative = _a.noRelative, noImportant = _a.noImportant, _b = _a.gapMode, gapMode = _b === void 0 ? "margin" : _b;
  useLockAttribute();
  var gap = reactExports.useMemo(function() {
    return getGapWidth(gapMode);
  }, [gapMode]);
  return reactExports.createElement(Style, { styles: getStyles(gap, !noRelative, gapMode, !noImportant ? "!important" : "") });
};
var passiveSupported = false;
if (typeof window !== "undefined") {
  try {
    var options = Object.defineProperty({}, "passive", {
      get: function() {
        passiveSupported = true;
        return true;
      }
    });
    window.addEventListener("test", options, options);
    window.removeEventListener("test", options, options);
  } catch (err) {
    passiveSupported = false;
  }
}
var nonPassive = passiveSupported ? { passive: false } : false;
var alwaysContainsScroll = function(node) {
  return node.tagName === "TEXTAREA";
};
var elementCanBeScrolled = function(node, overflow) {
  if (!(node instanceof Element)) {
    return false;
  }
  var styles = window.getComputedStyle(node);
  return (
    // not-not-scrollable
    styles[overflow] !== "hidden" && // contains scroll inside self
    !(styles.overflowY === styles.overflowX && !alwaysContainsScroll(node) && styles[overflow] === "visible")
  );
};
var elementCouldBeVScrolled = function(node) {
  return elementCanBeScrolled(node, "overflowY");
};
var elementCouldBeHScrolled = function(node) {
  return elementCanBeScrolled(node, "overflowX");
};
var locationCouldBeScrolled = function(axis, node) {
  var ownerDocument = node.ownerDocument;
  var current = node;
  do {
    if (typeof ShadowRoot !== "undefined" && current instanceof ShadowRoot) {
      current = current.host;
    }
    var isScrollable = elementCouldBeScrolled(axis, current);
    if (isScrollable) {
      var _a = getScrollVariables(axis, current), scrollHeight = _a[1], clientHeight = _a[2];
      if (scrollHeight > clientHeight) {
        return true;
      }
    }
    current = current.parentNode;
  } while (current && current !== ownerDocument.body);
  return false;
};
var getVScrollVariables = function(_a) {
  var scrollTop = _a.scrollTop, scrollHeight = _a.scrollHeight, clientHeight = _a.clientHeight;
  return [
    scrollTop,
    scrollHeight,
    clientHeight
  ];
};
var getHScrollVariables = function(_a) {
  var scrollLeft = _a.scrollLeft, scrollWidth = _a.scrollWidth, clientWidth = _a.clientWidth;
  return [
    scrollLeft,
    scrollWidth,
    clientWidth
  ];
};
var elementCouldBeScrolled = function(axis, node) {
  return axis === "v" ? elementCouldBeVScrolled(node) : elementCouldBeHScrolled(node);
};
var getScrollVariables = function(axis, node) {
  return axis === "v" ? getVScrollVariables(node) : getHScrollVariables(node);
};
var getDirectionFactor = function(axis, direction) {
  return axis === "h" && direction === "rtl" ? -1 : 1;
};
var handleScroll = function(axis, endTarget, event, sourceDelta, noOverscroll) {
  var directionFactor = getDirectionFactor(axis, window.getComputedStyle(endTarget).direction);
  var delta = directionFactor * sourceDelta;
  var target = event.target;
  var targetInLock = endTarget.contains(target);
  var shouldCancelScroll = false;
  var isDeltaPositive = delta > 0;
  var availableScroll = 0;
  var availableScrollTop = 0;
  do {
    if (!target) {
      break;
    }
    var _a = getScrollVariables(axis, target), position = _a[0], scroll_1 = _a[1], capacity = _a[2];
    var elementScroll = scroll_1 - capacity - directionFactor * position;
    if (position || elementScroll) {
      if (elementCouldBeScrolled(axis, target)) {
        availableScroll += elementScroll;
        availableScrollTop += position;
      }
    }
    var parent_1 = target.parentNode;
    target = parent_1 && parent_1.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent_1.host : parent_1;
  } while (
    // portaled content
    !targetInLock && target !== document.body || // self content
    targetInLock && (endTarget.contains(target) || endTarget === target)
  );
  if (isDeltaPositive && (Math.abs(availableScroll) < 1 || false)) {
    shouldCancelScroll = true;
  } else if (!isDeltaPositive && (Math.abs(availableScrollTop) < 1 || false)) {
    shouldCancelScroll = true;
  }
  return shouldCancelScroll;
};
var getTouchXY = function(event) {
  return "changedTouches" in event ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
};
var getDeltaXY = function(event) {
  return [event.deltaX, event.deltaY];
};
var extractRef = function(ref) {
  return ref && "current" in ref ? ref.current : ref;
};
var deltaCompare = function(x, y) {
  return x[0] === y[0] && x[1] === y[1];
};
var generateStyle = function(id) {
  return "\n  .block-interactivity-".concat(id, " {pointer-events: none;}\n  .allow-interactivity-").concat(id, " {pointer-events: all;}\n");
};
var idCounter = 0;
var lockStack = [];
function RemoveScrollSideCar(props) {
  var shouldPreventQueue = reactExports.useRef([]);
  var touchStartRef = reactExports.useRef([0, 0]);
  var activeAxis = reactExports.useRef();
  var id = reactExports.useState(idCounter++)[0];
  var Style2 = reactExports.useState(styleSingleton)[0];
  var lastProps = reactExports.useRef(props);
  reactExports.useEffect(function() {
    lastProps.current = props;
  }, [props]);
  reactExports.useEffect(function() {
    if (props.inert) {
      document.body.classList.add("block-interactivity-".concat(id));
      var allow_1 = __spreadArray([props.lockRef.current], (props.shards || []).map(extractRef), true).filter(Boolean);
      allow_1.forEach(function(el) {
        return el.classList.add("allow-interactivity-".concat(id));
      });
      return function() {
        document.body.classList.remove("block-interactivity-".concat(id));
        allow_1.forEach(function(el) {
          return el.classList.remove("allow-interactivity-".concat(id));
        });
      };
    }
    return;
  }, [props.inert, props.lockRef.current, props.shards]);
  var shouldCancelEvent = reactExports.useCallback(function(event, parent) {
    if ("touches" in event && event.touches.length === 2 || event.type === "wheel" && event.ctrlKey) {
      return !lastProps.current.allowPinchZoom;
    }
    var touch = getTouchXY(event);
    var touchStart = touchStartRef.current;
    var deltaX = "deltaX" in event ? event.deltaX : touchStart[0] - touch[0];
    var deltaY = "deltaY" in event ? event.deltaY : touchStart[1] - touch[1];
    var currentAxis;
    var target = event.target;
    var moveDirection = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
    if ("touches" in event && moveDirection === "h" && target.type === "range") {
      return false;
    }
    var selection = window.getSelection();
    var anchorNode = selection && selection.anchorNode;
    var isTouchingSelection = anchorNode ? anchorNode === target || anchorNode.contains(target) : false;
    if (isTouchingSelection) {
      return false;
    }
    var canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
    if (!canBeScrolledInMainDirection) {
      return true;
    }
    if (canBeScrolledInMainDirection) {
      currentAxis = moveDirection;
    } else {
      currentAxis = moveDirection === "v" ? "h" : "v";
      canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
    }
    if (!canBeScrolledInMainDirection) {
      return false;
    }
    if (!activeAxis.current && "changedTouches" in event && (deltaX || deltaY)) {
      activeAxis.current = currentAxis;
    }
    if (!currentAxis) {
      return true;
    }
    var cancelingAxis = activeAxis.current || currentAxis;
    return handleScroll(cancelingAxis, parent, event, cancelingAxis === "h" ? deltaX : deltaY);
  }, []);
  var shouldPrevent = reactExports.useCallback(function(_event) {
    var event = _event;
    if (!lockStack.length || lockStack[lockStack.length - 1] !== Style2) {
      return;
    }
    var delta = "deltaY" in event ? getDeltaXY(event) : getTouchXY(event);
    var sourceEvent = shouldPreventQueue.current.filter(function(e) {
      return e.name === event.type && (e.target === event.target || event.target === e.shadowParent) && deltaCompare(e.delta, delta);
    })[0];
    if (sourceEvent && sourceEvent.should) {
      if (event.cancelable) {
        event.preventDefault();
      }
      return;
    }
    if (!sourceEvent) {
      var shardNodes = (lastProps.current.shards || []).map(extractRef).filter(Boolean).filter(function(node) {
        return node.contains(event.target);
      });
      var shouldStop = shardNodes.length > 0 ? shouldCancelEvent(event, shardNodes[0]) : !lastProps.current.noIsolation;
      if (shouldStop) {
        if (event.cancelable) {
          event.preventDefault();
        }
      }
    }
  }, []);
  var shouldCancel = reactExports.useCallback(function(name, delta, target, should) {
    var event = { name, delta, target, should, shadowParent: getOutermostShadowParent(target) };
    shouldPreventQueue.current.push(event);
    setTimeout(function() {
      shouldPreventQueue.current = shouldPreventQueue.current.filter(function(e) {
        return e !== event;
      });
    }, 1);
  }, []);
  var scrollTouchStart = reactExports.useCallback(function(event) {
    touchStartRef.current = getTouchXY(event);
    activeAxis.current = void 0;
  }, []);
  var scrollWheel = reactExports.useCallback(function(event) {
    shouldCancel(event.type, getDeltaXY(event), event.target, shouldCancelEvent(event, props.lockRef.current));
  }, []);
  var scrollTouchMove = reactExports.useCallback(function(event) {
    shouldCancel(event.type, getTouchXY(event), event.target, shouldCancelEvent(event, props.lockRef.current));
  }, []);
  reactExports.useEffect(function() {
    lockStack.push(Style2);
    props.setCallbacks({
      onScrollCapture: scrollWheel,
      onWheelCapture: scrollWheel,
      onTouchMoveCapture: scrollTouchMove
    });
    document.addEventListener("wheel", shouldPrevent, nonPassive);
    document.addEventListener("touchmove", shouldPrevent, nonPassive);
    document.addEventListener("touchstart", scrollTouchStart, nonPassive);
    return function() {
      lockStack = lockStack.filter(function(inst) {
        return inst !== Style2;
      });
      document.removeEventListener("wheel", shouldPrevent, nonPassive);
      document.removeEventListener("touchmove", shouldPrevent, nonPassive);
      document.removeEventListener("touchstart", scrollTouchStart, nonPassive);
    };
  }, []);
  var removeScrollBar = props.removeScrollBar, inert = props.inert;
  return reactExports.createElement(
    reactExports.Fragment,
    null,
    inert ? reactExports.createElement(Style2, { styles: generateStyle(id) }) : null,
    removeScrollBar ? reactExports.createElement(RemoveScrollBar, { noRelative: props.noRelative, gapMode: props.gapMode }) : null
  );
}
function getOutermostShadowParent(node) {
  var shadowParent = null;
  while (node !== null) {
    if (node instanceof ShadowRoot) {
      shadowParent = node.host;
      node = node.host;
    }
    node = node.parentNode;
  }
  return shadowParent;
}
const SideCar = exportSidecar(effectCar, RemoveScrollSideCar);
var ReactRemoveScroll = reactExports.forwardRef(function(props, ref) {
  return reactExports.createElement(RemoveScroll, __assign({}, props, { ref, sideCar: SideCar }));
});
ReactRemoveScroll.classNames = RemoveScroll.classNames;
var OPEN_KEYS = [" ", "Enter", "ArrowUp", "ArrowDown"];
var SELECTION_KEYS = [" ", "Enter"];
var SELECT_NAME = "Select";
var [Collection, useCollection, createCollectionScope] = createCollection(SELECT_NAME);
var [createSelectContext] = createContextScope(SELECT_NAME, [
  createCollectionScope,
  createPopperScope
]);
var usePopperScope = createPopperScope();
var [SelectProvider, useSelectContext] = createSelectContext(SELECT_NAME);
var [SelectNativeOptionsProvider, useSelectNativeOptionsContext] = createSelectContext(SELECT_NAME);
var Select$1 = (props) => {
  const {
    __scopeSelect,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    value: valueProp,
    defaultValue,
    onValueChange,
    dir,
    name,
    autoComplete,
    disabled,
    required,
    form
  } = props;
  const popperScope = usePopperScope(__scopeSelect);
  const [trigger, setTrigger] = reactExports.useState(null);
  const [valueNode, setValueNode] = reactExports.useState(null);
  const [valueNodeHasChildren, setValueNodeHasChildren] = reactExports.useState(false);
  const direction = useDirection(dir);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: SELECT_NAME
  });
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
    caller: SELECT_NAME
  });
  const triggerPointerDownPosRef = reactExports.useRef(null);
  const isFormControl = trigger ? form || !!trigger.closest("form") : true;
  const [nativeOptionsSet, setNativeOptionsSet] = reactExports.useState(/* @__PURE__ */ new Set());
  const nativeSelectKey = Array.from(nativeOptionsSet).map((option) => option.props.value).join(";");
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2$2, { ...popperScope, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    SelectProvider,
    {
      required,
      scope: __scopeSelect,
      trigger,
      onTriggerChange: setTrigger,
      valueNode,
      onValueNodeChange: setValueNode,
      valueNodeHasChildren,
      onValueNodeHasChildrenChange: setValueNodeHasChildren,
      contentId: useId(),
      value,
      onValueChange: setValue,
      open,
      onOpenChange: setOpen,
      dir: direction,
      triggerPointerDownPosRef,
      disabled,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Provider, { scope: __scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          SelectNativeOptionsProvider,
          {
            scope: props.__scopeSelect,
            onNativeOptionAdd: reactExports.useCallback((option) => {
              setNativeOptionsSet((prev) => new Set(prev).add(option));
            }, []),
            onNativeOptionRemove: reactExports.useCallback((option) => {
              setNativeOptionsSet((prev) => {
                const optionsSet = new Set(prev);
                optionsSet.delete(option);
                return optionsSet;
              });
            }, []),
            children
          }
        ) }),
        isFormControl ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
          SelectBubbleInput,
          {
            "aria-hidden": true,
            required,
            tabIndex: -1,
            name,
            autoComplete,
            value,
            onChange: (event) => setValue(event.target.value),
            disabled,
            form,
            children: [
              value === void 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "" }) : null,
              Array.from(nativeOptionsSet)
            ]
          },
          nativeSelectKey
        ) : null
      ]
    }
  ) });
};
Select$1.displayName = SELECT_NAME;
var TRIGGER_NAME$2 = "SelectTrigger";
var SelectTrigger$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, disabled = false, ...triggerProps } = props;
    const popperScope = usePopperScope(__scopeSelect);
    const context = useSelectContext(TRIGGER_NAME$2, __scopeSelect);
    const isDisabled = context.disabled || disabled;
    const composedRefs = useComposedRefs(forwardedRef, context.onTriggerChange);
    const getItems = useCollection(__scopeSelect);
    const pointerTypeRef = reactExports.useRef("touch");
    const [searchRef, handleTypeaheadSearch, resetTypeahead] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.value === context.value);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem !== void 0) {
        context.onValueChange(nextItem.value);
      }
    });
    const handleOpen = (pointerEvent) => {
      if (!isDisabled) {
        context.onOpenChange(true);
        resetTypeahead();
      }
      if (pointerEvent) {
        context.triggerPointerDownPosRef.current = {
          x: Math.round(pointerEvent.pageX),
          y: Math.round(pointerEvent.pageY)
        };
      }
    };
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Anchor, { asChild: true, ...popperScope, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        role: "combobox",
        "aria-controls": context.contentId,
        "aria-expanded": context.open,
        "aria-required": context.required,
        "aria-autocomplete": "none",
        dir: context.dir,
        "data-state": context.open ? "open" : "closed",
        disabled: isDisabled,
        "data-disabled": isDisabled ? "" : void 0,
        "data-placeholder": shouldShowPlaceholder(context.value) ? "" : void 0,
        ...triggerProps,
        ref: composedRefs,
        onClick: composeEventHandlers(triggerProps.onClick, (event) => {
          event.currentTarget.focus();
          if (pointerTypeRef.current !== "mouse") {
            handleOpen(event);
          }
        }),
        onPointerDown: composeEventHandlers(triggerProps.onPointerDown, (event) => {
          pointerTypeRef.current = event.pointerType;
          const target = event.target;
          if (target.hasPointerCapture(event.pointerId)) {
            target.releasePointerCapture(event.pointerId);
          }
          if (event.button === 0 && event.ctrlKey === false && event.pointerType === "mouse") {
            handleOpen(event);
            event.preventDefault();
          }
        }),
        onKeyDown: composeEventHandlers(triggerProps.onKeyDown, (event) => {
          const isTypingAhead = searchRef.current !== "";
          const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
          if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key);
          if (isTypingAhead && event.key === " ") return;
          if (OPEN_KEYS.includes(event.key)) {
            handleOpen();
            event.preventDefault();
          }
        })
      }
    ) });
  }
);
SelectTrigger$1.displayName = TRIGGER_NAME$2;
var VALUE_NAME = "SelectValue";
var SelectValue$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, className, style, children, placeholder = "", ...valueProps } = props;
    const context = useSelectContext(VALUE_NAME, __scopeSelect);
    const { onValueNodeHasChildrenChange } = context;
    const hasChildren = children !== void 0;
    const composedRefs = useComposedRefs(forwardedRef, context.onValueNodeChange);
    useLayoutEffect2(() => {
      onValueNodeHasChildrenChange(hasChildren);
    }, [onValueNodeHasChildrenChange, hasChildren]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.span,
      {
        ...valueProps,
        ref: composedRefs,
        style: { pointerEvents: "none" },
        children: shouldShowPlaceholder(context.value) ? /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: placeholder }) : children
      }
    );
  }
);
SelectValue$1.displayName = VALUE_NAME;
var ICON_NAME = "SelectIcon";
var SelectIcon = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, children, ...iconProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.span, { "aria-hidden": true, ...iconProps, ref: forwardedRef, children: children || "▼" });
  }
);
SelectIcon.displayName = ICON_NAME;
var PORTAL_NAME$2 = "SelectPortal";
var SelectPortal = (props) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$2, { asChild: true, ...props });
};
SelectPortal.displayName = PORTAL_NAME$2;
var CONTENT_NAME$2 = "SelectContent";
var SelectContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useSelectContext(CONTENT_NAME$2, props.__scopeSelect);
    const [fragment, setFragment] = reactExports.useState();
    useLayoutEffect2(() => {
      setFragment(new DocumentFragment());
    }, []);
    if (!context.open) {
      const frag = fragment;
      return frag ? reactDomExports.createPortal(
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContentProvider, { scope: props.__scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: props.__scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: props.children }) }) }),
        frag
      ) : null;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContentImpl, { ...props, ref: forwardedRef });
  }
);
SelectContent$1.displayName = CONTENT_NAME$2;
var CONTENT_MARGIN = 10;
var [SelectContentProvider, useSelectContentContext] = createSelectContext(CONTENT_NAME$2);
var CONTENT_IMPL_NAME = "SelectContentImpl";
var Slot$1 = /* @__PURE__ */ createSlot$1("SelectContent.RemoveScroll");
var SelectContentImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSelect,
      position = "item-aligned",
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      //
      // PopperContent props
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions,
      //
      ...contentProps
    } = props;
    const context = useSelectContext(CONTENT_NAME$2, __scopeSelect);
    const [content, setContent] = reactExports.useState(null);
    const [viewport, setViewport] = reactExports.useState(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
    const [selectedItem, setSelectedItem] = reactExports.useState(null);
    const [selectedItemText, setSelectedItemText] = reactExports.useState(
      null
    );
    const getItems = useCollection(__scopeSelect);
    const [isPositioned, setIsPositioned] = reactExports.useState(false);
    const firstValidItemFoundRef = reactExports.useRef(false);
    reactExports.useEffect(() => {
      if (content) return hideOthers(content);
    }, [content]);
    useFocusGuards();
    const focusFirst2 = reactExports.useCallback(
      (candidates) => {
        const [firstItem, ...restItems] = getItems().map((item) => item.ref.current);
        const [lastItem] = restItems.slice(-1);
        const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
        for (const candidate of candidates) {
          if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
          candidate?.scrollIntoView({ block: "nearest" });
          if (candidate === firstItem && viewport) viewport.scrollTop = 0;
          if (candidate === lastItem && viewport) viewport.scrollTop = viewport.scrollHeight;
          candidate?.focus();
          if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
        }
      },
      [getItems, viewport]
    );
    const focusSelectedItem = reactExports.useCallback(
      () => focusFirst2([selectedItem, content]),
      [focusFirst2, selectedItem, content]
    );
    reactExports.useEffect(() => {
      if (isPositioned) {
        focusSelectedItem();
      }
    }, [isPositioned, focusSelectedItem]);
    const { onOpenChange, triggerPointerDownPosRef } = context;
    reactExports.useEffect(() => {
      if (content) {
        let pointerMoveDelta = { x: 0, y: 0 };
        const handlePointerMove = (event) => {
          pointerMoveDelta = {
            x: Math.abs(Math.round(event.pageX) - (triggerPointerDownPosRef.current?.x ?? 0)),
            y: Math.abs(Math.round(event.pageY) - (triggerPointerDownPosRef.current?.y ?? 0))
          };
        };
        const handlePointerUp = (event) => {
          if (pointerMoveDelta.x <= 10 && pointerMoveDelta.y <= 10) {
            event.preventDefault();
          } else {
            if (!content.contains(event.target)) {
              onOpenChange(false);
            }
          }
          document.removeEventListener("pointermove", handlePointerMove);
          triggerPointerDownPosRef.current = null;
        };
        if (triggerPointerDownPosRef.current !== null) {
          document.addEventListener("pointermove", handlePointerMove);
          document.addEventListener("pointerup", handlePointerUp, { capture: true, once: true });
        }
        return () => {
          document.removeEventListener("pointermove", handlePointerMove);
          document.removeEventListener("pointerup", handlePointerUp, { capture: true });
        };
      }
    }, [content, onOpenChange, triggerPointerDownPosRef]);
    reactExports.useEffect(() => {
      const close = () => onOpenChange(false);
      window.addEventListener("blur", close);
      window.addEventListener("resize", close);
      return () => {
        window.removeEventListener("blur", close);
        window.removeEventListener("resize", close);
      };
    }, [onOpenChange]);
    const [searchRef, handleTypeaheadSearch] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.ref.current === document.activeElement);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem) {
        setTimeout(() => nextItem.ref.current.focus());
      }
    });
    const itemRefCallback = reactExports.useCallback(
      (node, value, disabled) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isSelectedItem = context.value !== void 0 && context.value === value;
        if (isSelectedItem || isFirstValidItem) {
          setSelectedItem(node);
          if (isFirstValidItem) firstValidItemFoundRef.current = true;
        }
      },
      [context.value]
    );
    const handleItemLeave = reactExports.useCallback(() => content?.focus(), [content]);
    const itemTextRefCallback = reactExports.useCallback(
      (node, value, disabled) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isSelectedItem = context.value !== void 0 && context.value === value;
        if (isSelectedItem || isFirstValidItem) {
          setSelectedItemText(node);
        }
      },
      [context.value]
    );
    const SelectPosition = position === "popper" ? SelectPopperPosition : SelectItemAlignedPosition;
    const popperContentProps = SelectPosition === SelectPopperPosition ? {
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions
    } : {};
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SelectContentProvider,
      {
        scope: __scopeSelect,
        content,
        viewport,
        onViewportChange: setViewport,
        itemRefCallback,
        selectedItem,
        onItemLeave: handleItemLeave,
        itemTextRefCallback,
        focusSelectedItem,
        selectedItemText,
        position,
        isPositioned,
        searchRef,
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReactRemoveScroll, { as: Slot$1, allowPinchZoom: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          FocusScope,
          {
            asChild: true,
            trapped: context.open,
            onMountAutoFocus: (event) => {
              event.preventDefault();
            },
            onUnmountAutoFocus: composeEventHandlers(onCloseAutoFocus, (event) => {
              context.trigger?.focus({ preventScroll: true });
              event.preventDefault();
            }),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              DismissableLayer,
              {
                asChild: true,
                disableOutsidePointerEvents: true,
                onEscapeKeyDown,
                onPointerDownOutside,
                onFocusOutside: (event) => event.preventDefault(),
                onDismiss: () => context.onOpenChange(false),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SelectPosition,
                  {
                    role: "listbox",
                    id: context.contentId,
                    "data-state": context.open ? "open" : "closed",
                    dir: context.dir,
                    onContextMenu: (event) => event.preventDefault(),
                    ...contentProps,
                    ...popperContentProps,
                    onPlaced: () => setIsPositioned(true),
                    ref: composedRefs,
                    style: {
                      // flex layout so we can place the scroll buttons properly
                      display: "flex",
                      flexDirection: "column",
                      // reset the outline by default as the content MAY get focused
                      outline: "none",
                      ...contentProps.style
                    },
                    onKeyDown: composeEventHandlers(contentProps.onKeyDown, (event) => {
                      const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
                      if (event.key === "Tab") event.preventDefault();
                      if (!isModifierKey && event.key.length === 1) handleTypeaheadSearch(event.key);
                      if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                        const items = getItems().filter((item) => !item.disabled);
                        let candidateNodes = items.map((item) => item.ref.current);
                        if (["ArrowUp", "End"].includes(event.key)) {
                          candidateNodes = candidateNodes.slice().reverse();
                        }
                        if (["ArrowUp", "ArrowDown"].includes(event.key)) {
                          const currentElement = event.target;
                          const currentIndex = candidateNodes.indexOf(currentElement);
                          candidateNodes = candidateNodes.slice(currentIndex + 1);
                        }
                        setTimeout(() => focusFirst2(candidateNodes));
                        event.preventDefault();
                      }
                    })
                  }
                )
              }
            )
          }
        ) })
      }
    );
  }
);
SelectContentImpl.displayName = CONTENT_IMPL_NAME;
var ITEM_ALIGNED_POSITION_NAME = "SelectItemAlignedPosition";
var SelectItemAlignedPosition = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeSelect, onPlaced, ...popperProps } = props;
  const context = useSelectContext(CONTENT_NAME$2, __scopeSelect);
  const contentContext = useSelectContentContext(CONTENT_NAME$2, __scopeSelect);
  const [contentWrapper, setContentWrapper] = reactExports.useState(null);
  const [content, setContent] = reactExports.useState(null);
  const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
  const getItems = useCollection(__scopeSelect);
  const shouldExpandOnScrollRef = reactExports.useRef(false);
  const shouldRepositionRef = reactExports.useRef(true);
  const { viewport, selectedItem, selectedItemText, focusSelectedItem } = contentContext;
  const position = reactExports.useCallback(() => {
    if (context.trigger && context.valueNode && contentWrapper && content && viewport && selectedItem && selectedItemText) {
      const triggerRect = context.trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const valueNodeRect = context.valueNode.getBoundingClientRect();
      const itemTextRect = selectedItemText.getBoundingClientRect();
      if (context.dir !== "rtl") {
        const itemTextOffset = itemTextRect.left - contentRect.left;
        const left = valueNodeRect.left - itemTextOffset;
        const leftDelta = triggerRect.left - left;
        const minContentWidth = triggerRect.width + leftDelta;
        const contentWidth = Math.max(minContentWidth, contentRect.width);
        const rightEdge = window.innerWidth - CONTENT_MARGIN;
        const clampedLeft = clamp$1(left, [
          CONTENT_MARGIN,
          // Prevents the content from going off the starting edge of the
          // viewport. It may still go off the ending edge, but this can be
          // controlled by the user since they may want to manage overflow in a
          // specific way.
          // https://github.com/radix-ui/primitives/issues/2049
          Math.max(CONTENT_MARGIN, rightEdge - contentWidth)
        ]);
        contentWrapper.style.minWidth = minContentWidth + "px";
        contentWrapper.style.left = clampedLeft + "px";
      } else {
        const itemTextOffset = contentRect.right - itemTextRect.right;
        const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
        const rightDelta = window.innerWidth - triggerRect.right - right;
        const minContentWidth = triggerRect.width + rightDelta;
        const contentWidth = Math.max(minContentWidth, contentRect.width);
        const leftEdge = window.innerWidth - CONTENT_MARGIN;
        const clampedRight = clamp$1(right, [
          CONTENT_MARGIN,
          Math.max(CONTENT_MARGIN, leftEdge - contentWidth)
        ]);
        contentWrapper.style.minWidth = minContentWidth + "px";
        contentWrapper.style.right = clampedRight + "px";
      }
      const items = getItems();
      const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
      const itemsHeight = viewport.scrollHeight;
      const contentStyles = window.getComputedStyle(content);
      const contentBorderTopWidth = parseInt(contentStyles.borderTopWidth, 10);
      const contentPaddingTop = parseInt(contentStyles.paddingTop, 10);
      const contentBorderBottomWidth = parseInt(contentStyles.borderBottomWidth, 10);
      const contentPaddingBottom = parseInt(contentStyles.paddingBottom, 10);
      const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth;
      const minContentHeight = Math.min(selectedItem.offsetHeight * 5, fullContentHeight);
      const viewportStyles = window.getComputedStyle(viewport);
      const viewportPaddingTop = parseInt(viewportStyles.paddingTop, 10);
      const viewportPaddingBottom = parseInt(viewportStyles.paddingBottom, 10);
      const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN;
      const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;
      const selectedItemHalfHeight = selectedItem.offsetHeight / 2;
      const itemOffsetMiddle = selectedItem.offsetTop + selectedItemHalfHeight;
      const contentTopToItemMiddle = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle;
      const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;
      const willAlignWithoutTopOverflow = contentTopToItemMiddle <= topEdgeToTriggerMiddle;
      if (willAlignWithoutTopOverflow) {
        const isLastItem = items.length > 0 && selectedItem === items[items.length - 1].ref.current;
        contentWrapper.style.bottom = "0px";
        const viewportOffsetBottom = content.clientHeight - viewport.offsetTop - viewport.offsetHeight;
        const clampedTriggerMiddleToBottomEdge = Math.max(
          triggerMiddleToBottomEdge,
          selectedItemHalfHeight + // viewport might have padding bottom, include it to avoid a scrollable viewport
          (isLastItem ? viewportPaddingBottom : 0) + viewportOffsetBottom + contentBorderBottomWidth
        );
        const height = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge;
        contentWrapper.style.height = height + "px";
      } else {
        const isFirstItem = items.length > 0 && selectedItem === items[0].ref.current;
        contentWrapper.style.top = "0px";
        const clampedTopEdgeToTriggerMiddle = Math.max(
          topEdgeToTriggerMiddle,
          contentBorderTopWidth + viewport.offsetTop + // viewport might have padding top, include it to avoid a scrollable viewport
          (isFirstItem ? viewportPaddingTop : 0) + selectedItemHalfHeight
        );
        const height = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom;
        contentWrapper.style.height = height + "px";
        viewport.scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + viewport.offsetTop;
      }
      contentWrapper.style.margin = `${CONTENT_MARGIN}px 0`;
      contentWrapper.style.minHeight = minContentHeight + "px";
      contentWrapper.style.maxHeight = availableHeight + "px";
      onPlaced?.();
      requestAnimationFrame(() => shouldExpandOnScrollRef.current = true);
    }
  }, [
    getItems,
    context.trigger,
    context.valueNode,
    contentWrapper,
    content,
    viewport,
    selectedItem,
    selectedItemText,
    context.dir,
    onPlaced
  ]);
  useLayoutEffect2(() => position(), [position]);
  const [contentZIndex, setContentZIndex] = reactExports.useState();
  useLayoutEffect2(() => {
    if (content) setContentZIndex(window.getComputedStyle(content).zIndex);
  }, [content]);
  const handleScrollButtonChange = reactExports.useCallback(
    (node) => {
      if (node && shouldRepositionRef.current === true) {
        position();
        focusSelectedItem?.();
        shouldRepositionRef.current = false;
      }
    },
    [position, focusSelectedItem]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectViewportProvider,
    {
      scope: __scopeSelect,
      contentWrapper,
      shouldExpandOnScrollRef,
      onScrollButtonChange: handleScrollButtonChange,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          ref: setContentWrapper,
          style: {
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            zIndex: contentZIndex
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            Primitive.div,
            {
              ...popperProps,
              ref: composedRefs,
              style: {
                // When we get the height of the content, it includes borders. If we were to set
                // the height without having `boxSizing: 'border-box'` it would be too big.
                boxSizing: "border-box",
                // We need to ensure the content doesn't get taller than the wrapper
                maxHeight: "100%",
                ...popperProps.style
              }
            }
          )
        }
      )
    }
  );
});
SelectItemAlignedPosition.displayName = ITEM_ALIGNED_POSITION_NAME;
var POPPER_POSITION_NAME = "SelectPopperPosition";
var SelectPopperPosition = reactExports.forwardRef((props, forwardedRef) => {
  const {
    __scopeSelect,
    align = "start",
    collisionPadding = CONTENT_MARGIN,
    ...popperProps
  } = props;
  const popperScope = usePopperScope(__scopeSelect);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Content$1,
    {
      ...popperScope,
      ...popperProps,
      ref: forwardedRef,
      align,
      collisionPadding,
      style: {
        // Ensure border-box for floating-ui calculations
        boxSizing: "border-box",
        ...popperProps.style,
        // re-namespace exposed content custom properties
        ...{
          "--radix-select-content-transform-origin": "var(--radix-popper-transform-origin)",
          "--radix-select-content-available-width": "var(--radix-popper-available-width)",
          "--radix-select-content-available-height": "var(--radix-popper-available-height)",
          "--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
          "--radix-select-trigger-height": "var(--radix-popper-anchor-height)"
        }
      }
    }
  );
});
SelectPopperPosition.displayName = POPPER_POSITION_NAME;
var [SelectViewportProvider, useSelectViewportContext] = createSelectContext(CONTENT_NAME$2, {});
var VIEWPORT_NAME = "SelectViewport";
var SelectViewport = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, nonce, ...viewportProps } = props;
    const contentContext = useSelectContentContext(VIEWPORT_NAME, __scopeSelect);
    const viewportContext = useSelectViewportContext(VIEWPORT_NAME, __scopeSelect);
    const composedRefs = useComposedRefs(forwardedRef, contentContext.onViewportChange);
    const prevScrollTopRef = reactExports.useRef(0);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: `[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}`
          },
          nonce
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Collection.Slot, { scope: __scopeSelect, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          "data-radix-select-viewport": "",
          role: "presentation",
          ...viewportProps,
          ref: composedRefs,
          style: {
            // we use position: 'relative' here on the `viewport` so that when we call
            // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
            // (independent of the scrollUpButton).
            position: "relative",
            flex: 1,
            // Viewport should only be scrollable in the vertical direction.
            // This won't work in vertical writing modes, so we'll need to
            // revisit this if/when that is supported
            // https://developer.chrome.com/blog/vertical-form-controls
            overflow: "hidden auto",
            ...viewportProps.style
          },
          onScroll: composeEventHandlers(viewportProps.onScroll, (event) => {
            const viewport = event.currentTarget;
            const { contentWrapper, shouldExpandOnScrollRef } = viewportContext;
            if (shouldExpandOnScrollRef?.current && contentWrapper) {
              const scrolledBy = Math.abs(prevScrollTopRef.current - viewport.scrollTop);
              if (scrolledBy > 0) {
                const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
                const cssMinHeight = parseFloat(contentWrapper.style.minHeight);
                const cssHeight = parseFloat(contentWrapper.style.height);
                const prevHeight = Math.max(cssMinHeight, cssHeight);
                if (prevHeight < availableHeight) {
                  const nextHeight = prevHeight + scrolledBy;
                  const clampedNextHeight = Math.min(availableHeight, nextHeight);
                  const heightDiff = nextHeight - clampedNextHeight;
                  contentWrapper.style.height = clampedNextHeight + "px";
                  if (contentWrapper.style.bottom === "0px") {
                    viewport.scrollTop = heightDiff > 0 ? heightDiff : 0;
                    contentWrapper.style.justifyContent = "flex-end";
                  }
                }
              }
            }
            prevScrollTopRef.current = viewport.scrollTop;
          })
        }
      ) })
    ] });
  }
);
SelectViewport.displayName = VIEWPORT_NAME;
var GROUP_NAME = "SelectGroup";
var [SelectGroupContextProvider, useSelectGroupContext] = createSelectContext(GROUP_NAME);
var SelectGroup = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...groupProps } = props;
    const groupId = useId();
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SelectGroupContextProvider, { scope: __scopeSelect, id: groupId, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { role: "group", "aria-labelledby": groupId, ...groupProps, ref: forwardedRef }) });
  }
);
SelectGroup.displayName = GROUP_NAME;
var LABEL_NAME = "SelectLabel";
var SelectLabel = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...labelProps } = props;
    const groupContext = useSelectGroupContext(LABEL_NAME, __scopeSelect);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { id: groupContext.id, ...labelProps, ref: forwardedRef });
  }
);
SelectLabel.displayName = LABEL_NAME;
var ITEM_NAME = "SelectItem";
var [SelectItemContextProvider, useSelectItemContext] = createSelectContext(ITEM_NAME);
var SelectItem$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeSelect,
      value,
      disabled = false,
      textValue: textValueProp,
      ...itemProps
    } = props;
    const context = useSelectContext(ITEM_NAME, __scopeSelect);
    const contentContext = useSelectContentContext(ITEM_NAME, __scopeSelect);
    const isSelected = context.value === value;
    const [textValue, setTextValue] = reactExports.useState(textValueProp ?? "");
    const [isFocused, setIsFocused] = reactExports.useState(false);
    const composedRefs = useComposedRefs(
      forwardedRef,
      (node) => contentContext.itemRefCallback?.(node, value, disabled)
    );
    const textId = useId();
    const pointerTypeRef = reactExports.useRef("touch");
    const handleSelect = () => {
      if (!disabled) {
        context.onValueChange(value);
        context.onOpenChange(false);
      }
    };
    if (value === "") {
      throw new Error(
        "A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder."
      );
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      SelectItemContextProvider,
      {
        scope: __scopeSelect,
        value,
        disabled,
        textId,
        isSelected,
        onItemTextChange: reactExports.useCallback((node) => {
          setTextValue((prevTextValue) => prevTextValue || (node?.textContent ?? "").trim());
        }, []),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Collection.ItemSlot,
          {
            scope: __scopeSelect,
            value,
            disabled,
            textValue,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              Primitive.div,
              {
                role: "option",
                "aria-labelledby": textId,
                "data-highlighted": isFocused ? "" : void 0,
                "aria-selected": isSelected && isFocused,
                "data-state": isSelected ? "checked" : "unchecked",
                "aria-disabled": disabled || void 0,
                "data-disabled": disabled ? "" : void 0,
                tabIndex: disabled ? void 0 : -1,
                ...itemProps,
                ref: composedRefs,
                onFocus: composeEventHandlers(itemProps.onFocus, () => setIsFocused(true)),
                onBlur: composeEventHandlers(itemProps.onBlur, () => setIsFocused(false)),
                onClick: composeEventHandlers(itemProps.onClick, () => {
                  if (pointerTypeRef.current !== "mouse") handleSelect();
                }),
                onPointerUp: composeEventHandlers(itemProps.onPointerUp, () => {
                  if (pointerTypeRef.current === "mouse") handleSelect();
                }),
                onPointerDown: composeEventHandlers(itemProps.onPointerDown, (event) => {
                  pointerTypeRef.current = event.pointerType;
                }),
                onPointerMove: composeEventHandlers(itemProps.onPointerMove, (event) => {
                  pointerTypeRef.current = event.pointerType;
                  if (disabled) {
                    contentContext.onItemLeave?.();
                  } else if (pointerTypeRef.current === "mouse") {
                    event.currentTarget.focus({ preventScroll: true });
                  }
                }),
                onPointerLeave: composeEventHandlers(itemProps.onPointerLeave, (event) => {
                  if (event.currentTarget === document.activeElement) {
                    contentContext.onItemLeave?.();
                  }
                }),
                onKeyDown: composeEventHandlers(itemProps.onKeyDown, (event) => {
                  const isTypingAhead = contentContext.searchRef?.current !== "";
                  if (isTypingAhead && event.key === " ") return;
                  if (SELECTION_KEYS.includes(event.key)) handleSelect();
                  if (event.key === " ") event.preventDefault();
                })
              }
            )
          }
        )
      }
    );
  }
);
SelectItem$1.displayName = ITEM_NAME;
var ITEM_TEXT_NAME = "SelectItemText";
var SelectItemText = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, className, style, ...itemTextProps } = props;
    const context = useSelectContext(ITEM_TEXT_NAME, __scopeSelect);
    const contentContext = useSelectContentContext(ITEM_TEXT_NAME, __scopeSelect);
    const itemContext = useSelectItemContext(ITEM_TEXT_NAME, __scopeSelect);
    const nativeOptionsContext = useSelectNativeOptionsContext(ITEM_TEXT_NAME, __scopeSelect);
    const [itemTextNode, setItemTextNode] = reactExports.useState(null);
    const composedRefs = useComposedRefs(
      forwardedRef,
      (node) => setItemTextNode(node),
      itemContext.onItemTextChange,
      (node) => contentContext.itemTextRefCallback?.(node, itemContext.value, itemContext.disabled)
    );
    const textContent = itemTextNode?.textContent;
    const nativeOption = reactExports.useMemo(
      () => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: itemContext.value, disabled: itemContext.disabled, children: textContent }, itemContext.value),
      [itemContext.disabled, itemContext.value, textContent]
    );
    const { onNativeOptionAdd, onNativeOptionRemove } = nativeOptionsContext;
    useLayoutEffect2(() => {
      onNativeOptionAdd(nativeOption);
      return () => onNativeOptionRemove(nativeOption);
    }, [onNativeOptionAdd, onNativeOptionRemove, nativeOption]);
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.span, { id: itemContext.textId, ...itemTextProps, ref: composedRefs }),
      itemContext.isSelected && context.valueNode && !context.valueNodeHasChildren ? reactDomExports.createPortal(itemTextProps.children, context.valueNode) : null
    ] });
  }
);
SelectItemText.displayName = ITEM_TEXT_NAME;
var ITEM_INDICATOR_NAME = "SelectItemIndicator";
var SelectItemIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...itemIndicatorProps } = props;
    const itemContext = useSelectItemContext(ITEM_INDICATOR_NAME, __scopeSelect);
    return itemContext.isSelected ? /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.span, { "aria-hidden": true, ...itemIndicatorProps, ref: forwardedRef }) : null;
  }
);
SelectItemIndicator.displayName = ITEM_INDICATOR_NAME;
var SCROLL_UP_BUTTON_NAME = "SelectScrollUpButton";
var SelectScrollUpButton$1 = reactExports.forwardRef((props, forwardedRef) => {
  const contentContext = useSelectContentContext(SCROLL_UP_BUTTON_NAME, props.__scopeSelect);
  const viewportContext = useSelectViewportContext(SCROLL_UP_BUTTON_NAME, props.__scopeSelect);
  const [canScrollUp, setCanScrollUp] = reactExports.useState(false);
  const composedRefs = useComposedRefs(forwardedRef, viewportContext.onScrollButtonChange);
  useLayoutEffect2(() => {
    if (contentContext.viewport && contentContext.isPositioned) {
      let handleScroll2 = function() {
        const canScrollUp2 = viewport.scrollTop > 0;
        setCanScrollUp(canScrollUp2);
      };
      const viewport = contentContext.viewport;
      handleScroll2();
      viewport.addEventListener("scroll", handleScroll2);
      return () => viewport.removeEventListener("scroll", handleScroll2);
    }
  }, [contentContext.viewport, contentContext.isPositioned]);
  return canScrollUp ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectScrollButtonImpl,
    {
      ...props,
      ref: composedRefs,
      onAutoScroll: () => {
        const { viewport, selectedItem } = contentContext;
        if (viewport && selectedItem) {
          viewport.scrollTop = viewport.scrollTop - selectedItem.offsetHeight;
        }
      }
    }
  ) : null;
});
SelectScrollUpButton$1.displayName = SCROLL_UP_BUTTON_NAME;
var SCROLL_DOWN_BUTTON_NAME = "SelectScrollDownButton";
var SelectScrollDownButton$1 = reactExports.forwardRef((props, forwardedRef) => {
  const contentContext = useSelectContentContext(SCROLL_DOWN_BUTTON_NAME, props.__scopeSelect);
  const viewportContext = useSelectViewportContext(SCROLL_DOWN_BUTTON_NAME, props.__scopeSelect);
  const [canScrollDown, setCanScrollDown] = reactExports.useState(false);
  const composedRefs = useComposedRefs(forwardedRef, viewportContext.onScrollButtonChange);
  useLayoutEffect2(() => {
    if (contentContext.viewport && contentContext.isPositioned) {
      let handleScroll2 = function() {
        const maxScroll = viewport.scrollHeight - viewport.clientHeight;
        const canScrollDown2 = Math.ceil(viewport.scrollTop) < maxScroll;
        setCanScrollDown(canScrollDown2);
      };
      const viewport = contentContext.viewport;
      handleScroll2();
      viewport.addEventListener("scroll", handleScroll2);
      return () => viewport.removeEventListener("scroll", handleScroll2);
    }
  }, [contentContext.viewport, contentContext.isPositioned]);
  return canScrollDown ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    SelectScrollButtonImpl,
    {
      ...props,
      ref: composedRefs,
      onAutoScroll: () => {
        const { viewport, selectedItem } = contentContext;
        if (viewport && selectedItem) {
          viewport.scrollTop = viewport.scrollTop + selectedItem.offsetHeight;
        }
      }
    }
  ) : null;
});
SelectScrollDownButton$1.displayName = SCROLL_DOWN_BUTTON_NAME;
var SelectScrollButtonImpl = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeSelect, onAutoScroll, ...scrollIndicatorProps } = props;
  const contentContext = useSelectContentContext("SelectScrollButton", __scopeSelect);
  const autoScrollTimerRef = reactExports.useRef(null);
  const getItems = useCollection(__scopeSelect);
  const clearAutoScrollTimer = reactExports.useCallback(() => {
    if (autoScrollTimerRef.current !== null) {
      window.clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);
  reactExports.useEffect(() => {
    return () => clearAutoScrollTimer();
  }, [clearAutoScrollTimer]);
  useLayoutEffect2(() => {
    const activeItem = getItems().find((item) => item.ref.current === document.activeElement);
    activeItem?.ref.current?.scrollIntoView({ block: "nearest" });
  }, [getItems]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.div,
    {
      "aria-hidden": true,
      ...scrollIndicatorProps,
      ref: forwardedRef,
      style: { flexShrink: 0, ...scrollIndicatorProps.style },
      onPointerDown: composeEventHandlers(scrollIndicatorProps.onPointerDown, () => {
        if (autoScrollTimerRef.current === null) {
          autoScrollTimerRef.current = window.setInterval(onAutoScroll, 50);
        }
      }),
      onPointerMove: composeEventHandlers(scrollIndicatorProps.onPointerMove, () => {
        contentContext.onItemLeave?.();
        if (autoScrollTimerRef.current === null) {
          autoScrollTimerRef.current = window.setInterval(onAutoScroll, 50);
        }
      }),
      onPointerLeave: composeEventHandlers(scrollIndicatorProps.onPointerLeave, () => {
        clearAutoScrollTimer();
      })
    }
  );
});
var SEPARATOR_NAME = "SelectSeparator";
var SelectSeparator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...separatorProps } = props;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.div, { "aria-hidden": true, ...separatorProps, ref: forwardedRef });
  }
);
SelectSeparator.displayName = SEPARATOR_NAME;
var ARROW_NAME = "SelectArrow";
var SelectArrow = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeSelect, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeSelect);
    const context = useSelectContext(ARROW_NAME, __scopeSelect);
    const contentContext = useSelectContentContext(ARROW_NAME, __scopeSelect);
    return context.open && contentContext.position === "popper" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Arrow, { ...popperScope, ...arrowProps, ref: forwardedRef }) : null;
  }
);
SelectArrow.displayName = ARROW_NAME;
var BUBBLE_INPUT_NAME = "SelectBubbleInput";
var SelectBubbleInput = reactExports.forwardRef(
  ({ __scopeSelect, value, ...props }, forwardedRef) => {
    const ref = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const prevValue = usePrevious(value);
    reactExports.useEffect(() => {
      const select = ref.current;
      if (!select) return;
      const selectProto = window.HTMLSelectElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(
        selectProto,
        "value"
      );
      const setValue = descriptor.set;
      if (prevValue !== value && setValue) {
        const event = new Event("change", { bubbles: true });
        setValue.call(select, value);
        select.dispatchEvent(event);
      }
    }, [prevValue, value]);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.select,
      {
        ...props,
        style: { ...VISUALLY_HIDDEN_STYLES, ...props.style },
        ref: composedRefs,
        defaultValue: value
      }
    );
  }
);
SelectBubbleInput.displayName = BUBBLE_INPUT_NAME;
function shouldShowPlaceholder(value) {
  return value === "" || value === void 0;
}
function useTypeaheadSearch(onSearchChange) {
  const handleSearchChange = useCallbackRef$1(onSearchChange);
  const searchRef = reactExports.useRef("");
  const timerRef = reactExports.useRef(0);
  const handleTypeaheadSearch = reactExports.useCallback(
    (key) => {
      const search = searchRef.current + key;
      handleSearchChange(search);
      (function updateSearch(value) {
        searchRef.current = value;
        window.clearTimeout(timerRef.current);
        if (value !== "") timerRef.current = window.setTimeout(() => updateSearch(""), 1e3);
      })(search);
    },
    [handleSearchChange]
  );
  const resetTypeahead = reactExports.useCallback(() => {
    searchRef.current = "";
    window.clearTimeout(timerRef.current);
  }, []);
  reactExports.useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);
  return [searchRef, handleTypeaheadSearch, resetTypeahead];
}
function findNextItem(items, search, currentItem) {
  const isRepeated = search.length > 1 && Array.from(search).every((char) => char === search[0]);
  const normalizedSearch = isRepeated ? search[0] : search;
  const currentItemIndex = currentItem ? items.indexOf(currentItem) : -1;
  let wrappedItems = wrapArray(items, Math.max(currentItemIndex, 0));
  const excludeCurrentItem = normalizedSearch.length === 1;
  if (excludeCurrentItem) wrappedItems = wrappedItems.filter((v) => v !== currentItem);
  const nextItem = wrappedItems.find(
    (item) => item.textValue.toLowerCase().startsWith(normalizedSearch.toLowerCase())
  );
  return nextItem !== currentItem ? nextItem : void 0;
}
function wrapArray(array, startIndex) {
  return array.map((_, index2) => array[(startIndex + index2) % array.length]);
}
var Root2$1 = Select$1;
var Trigger$1 = SelectTrigger$1;
var Value = SelectValue$1;
var Icon = SelectIcon;
var Portal$1 = SelectPortal;
var Content2$1 = SelectContent$1;
var Viewport = SelectViewport;
var Item = SelectItem$1;
var ItemText = SelectItemText;
var ItemIndicator = SelectItemIndicator;
var ScrollUpButton = SelectScrollUpButton$1;
var ScrollDownButton = SelectScrollDownButton$1;
function Select({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2$1, { "code-path": "src/components/ui/select.tsx:10:10", "data-slot": "select", ...props });
}
function SelectValue({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Value, { "code-path": "src/components/ui/select.tsx:22:10", "data-slot": "select-value", ...props });
}
function SelectTrigger({
  className,
  size: size2 = "default",
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Trigger$1,
    {
      "code-path": "src/components/ui/select.tsx:34:5",
      "data-slot": "select-trigger",
      "data-size": size2,
      className: cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { "code-path": "src/components/ui/select.tsx:44:7", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { "code-path": "src/components/ui/select.tsx:45:9", className: "size-4 opacity-50" }) })
      ]
    }
  );
}
function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$1, { "code-path": "src/components/ui/select.tsx:59:5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Content2$1,
    {
      "code-path": "src/components/ui/select.tsx:60:7",
      "data-slot": "select-content",
      className: cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      ),
      position,
      align,
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectScrollUpButton, { "code-path": "src/components/ui/select.tsx:72:9" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Viewport,
          {
            "code-path": "src/components/ui/select.tsx:73:9",
            className: cn(
              "p-1",
              position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
            ),
            children
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(SelectScrollDownButton, { "code-path": "src/components/ui/select.tsx:82:9" })
      ]
    }
  ) });
}
function SelectItem({
  className,
  children,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Item,
    {
      "code-path": "src/components/ui/select.tsx:107:5",
      "data-slot": "select-item",
      className: cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            "code-path": "src/components/ui/select.tsx:115:7",
            "data-slot": "select-item-indicator",
            className: "absolute right-2 flex size-3.5 items-center justify-center",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ItemIndicator, { "code-path": "src/components/ui/select.tsx:119:9", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { "code-path": "src/components/ui/select.tsx:120:11", className: "size-4" }) })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ItemText, { "code-path": "src/components/ui/select.tsx:123:7", children })
      ]
    }
  );
}
function SelectScrollUpButton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollUpButton,
    {
      "code-path": "src/components/ui/select.tsx:146:5",
      "data-slot": "select-scroll-up-button",
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { "code-path": "src/components/ui/select.tsx:154:7", className: "size-4" })
    }
  );
}
function SelectScrollDownButton({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ScrollDownButton,
    {
      "code-path": "src/components/ui/select.tsx:164:5",
      "data-slot": "select-scroll-down-button",
      className: cn(
        "flex cursor-default items-center justify-center py-1",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { "code-path": "src/components/ui/select.tsx:172:7", className: "size-4" })
    }
  );
}
const SORT_OPTIONS = [
  { value: "date", labelKey: "library.sort.date" },
  { value: "added", labelKey: "library.sort.added" },
  { value: "name", labelKey: "library.sort.name" },
  { value: "size", labelKey: "library.sort.size" }
];
function MaterialSortSelect({ value, onChange }) {
  const { t } = useI18n();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { "code-path": "src/components/material/MaterialSortSelect.tsx:27:5", value, onValueChange: (v) => onChange(v), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { "code-path": "src/components/material/MaterialSortSelect.tsx:28:7", className: "h-9 w-[140px] bg-cabinet-paper border-cabinet-border", "aria-label": t("library.sortBy"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { "code-path": "src/components/material/MaterialSortSelect.tsx:29:9" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { "code-path": "src/components/material/MaterialSortSelect.tsx:31:7", children: SORT_OPTIONS.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { "code-path": "src/components/material/MaterialSortSelect.tsx:33:11", value: option.value, children: t(option.labelKey) }, option.value)) })
  ] });
}
function MaterialEmptyState({ isSearch, isFavoritesView = false }) {
  const { t } = useI18n();
  let titleKey = "library.empty";
  let hintKey = "library.emptyHint";
  let Icon2 = FolderOpen;
  if (isSearch) {
    titleKey = "library.noResults";
    hintKey = null;
  } else if (isFavoritesView) {
    titleKey = "library.emptyFavorites";
    hintKey = "library.emptyFavoritesHint";
    Icon2 = Star;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialEmptyState.tsx:26:5", className: "flex flex-col items-center justify-center h-full py-16", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Icon2, { "code-path": "src/components/material/MaterialEmptyState.tsx:27:7", size: 48, className: "text-cabinet-inkMuted mb-4" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/material/MaterialEmptyState.tsx:28:7", className: "text-xl font-medium text-cabinet-ink", children: t(titleKey) }),
    hintKey && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/material/MaterialEmptyState.tsx:30:9", className: "text-sm text-cabinet-inkMuted mt-2 text-center max-w-sm", children: t(hintKey) })
  ] });
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant = "default",
  size: size2 = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot$2 : "button";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Comp,
    {
      "code-path": "src/components/ui/button.tsx:52:5",
      "data-slot": "button",
      "data-variant": variant,
      "data-size": size2,
      className: cn(buttonVariants({ variant, size: size2, className })),
      ...props
    }
  );
}
function useStateMachine(initialState, machine) {
  return reactExports.useReducer((state, event) => {
    const nextState = machine[state][event];
    return nextState ?? state;
  }, initialState);
}
var Presence = (props) => {
  const { present, children } = props;
  const presence = usePresence(present);
  const child = typeof children === "function" ? children({ present: presence.isPresent }) : reactExports.Children.only(children);
  const ref = useComposedRefs(presence.ref, getElementRef$1(child));
  const forceMount = typeof children === "function";
  return forceMount || presence.isPresent ? reactExports.cloneElement(child, { ref }) : null;
};
Presence.displayName = "Presence";
function usePresence(present) {
  const [node, setNode] = reactExports.useState();
  const stylesRef = reactExports.useRef(null);
  const prevPresentRef = reactExports.useRef(present);
  const prevAnimationNameRef = reactExports.useRef("none");
  const initialState = present ? "mounted" : "unmounted";
  const [state, send] = useStateMachine(initialState, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  reactExports.useEffect(() => {
    const currentAnimationName = getAnimationName(stylesRef.current);
    prevAnimationNameRef.current = state === "mounted" ? currentAnimationName : "none";
  }, [state]);
  useLayoutEffect2(() => {
    const styles = stylesRef.current;
    const wasPresent = prevPresentRef.current;
    const hasPresentChanged = wasPresent !== present;
    if (hasPresentChanged) {
      const prevAnimationName = prevAnimationNameRef.current;
      const currentAnimationName = getAnimationName(styles);
      if (present) {
        send("MOUNT");
      } else if (currentAnimationName === "none" || styles?.display === "none") {
        send("UNMOUNT");
      } else {
        const isAnimating = prevAnimationName !== currentAnimationName;
        if (wasPresent && isAnimating) {
          send("ANIMATION_OUT");
        } else {
          send("UNMOUNT");
        }
      }
      prevPresentRef.current = present;
    }
  }, [present, send]);
  useLayoutEffect2(() => {
    if (node) {
      let timeoutId;
      const ownerWindow = node.ownerDocument.defaultView ?? window;
      const handleAnimationEnd = (event) => {
        const currentAnimationName = getAnimationName(stylesRef.current);
        const isCurrentAnimation = currentAnimationName.includes(CSS.escape(event.animationName));
        if (event.target === node && isCurrentAnimation) {
          send("ANIMATION_END");
          if (!prevPresentRef.current) {
            const currentFillMode = node.style.animationFillMode;
            node.style.animationFillMode = "forwards";
            timeoutId = ownerWindow.setTimeout(() => {
              if (node.style.animationFillMode === "forwards") {
                node.style.animationFillMode = currentFillMode;
              }
            });
          }
        }
      };
      const handleAnimationStart = (event) => {
        if (event.target === node) {
          prevAnimationNameRef.current = getAnimationName(stylesRef.current);
        }
      };
      node.addEventListener("animationstart", handleAnimationStart);
      node.addEventListener("animationcancel", handleAnimationEnd);
      node.addEventListener("animationend", handleAnimationEnd);
      return () => {
        ownerWindow.clearTimeout(timeoutId);
        node.removeEventListener("animationstart", handleAnimationStart);
        node.removeEventListener("animationcancel", handleAnimationEnd);
        node.removeEventListener("animationend", handleAnimationEnd);
      };
    } else {
      send("ANIMATION_END");
    }
  }, [node, send]);
  return {
    isPresent: ["mounted", "unmountSuspended"].includes(state),
    ref: reactExports.useCallback((node2) => {
      stylesRef.current = node2 ? getComputedStyle(node2) : null;
      setNode(node2);
    }, [])
  };
}
function getAnimationName(styles) {
  return styles?.animationName || "none";
}
function getElementRef$1(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    const { children, ...slotProps } = props;
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER$1 = /* @__PURE__ */ Symbol("radix.slottable");
function isSlottable(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER$1;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
var DIALOG_NAME = "Dialog";
var [createDialogContext, createDialogScope] = createContextScope(DIALOG_NAME);
var [DialogProvider, useDialogContext] = createDialogContext(DIALOG_NAME);
var Dialog = (props) => {
  const {
    __scopeDialog,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    modal = true
  } = props;
  const triggerRef = reactExports.useRef(null);
  const contentRef = reactExports.useRef(null);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
    caller: DIALOG_NAME
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    DialogProvider,
    {
      scope: __scopeDialog,
      triggerRef,
      contentRef,
      contentId: useId(),
      titleId: useId(),
      descriptionId: useId(),
      open,
      onOpenChange: setOpen,
      onOpenToggle: reactExports.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
      modal,
      children
    }
  );
};
Dialog.displayName = DIALOG_NAME;
var TRIGGER_NAME$1 = "DialogTrigger";
var DialogTrigger = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...triggerProps } = props;
    const context = useDialogContext(TRIGGER_NAME$1, __scopeDialog);
    const composedTriggerRef = useComposedRefs(forwardedRef, context.triggerRef);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": context.open,
        "aria-controls": context.contentId,
        "data-state": getState(context.open),
        ...triggerProps,
        ref: composedTriggerRef,
        onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
      }
    );
  }
);
DialogTrigger.displayName = TRIGGER_NAME$1;
var PORTAL_NAME$1 = "DialogPortal";
var [PortalProvider, usePortalContext] = createDialogContext(PORTAL_NAME$1, {
  forceMount: void 0
});
var DialogPortal = (props) => {
  const { __scopeDialog, forceMount, children, container } = props;
  const context = useDialogContext(PORTAL_NAME$1, __scopeDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(PortalProvider, { scope: __scopeDialog, forceMount, children: reactExports.Children.map(children, (child) => /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Portal$2, { asChild: true, container, children: child }) })) });
};
DialogPortal.displayName = PORTAL_NAME$1;
var OVERLAY_NAME$1 = "DialogOverlay";
var DialogOverlay = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(OVERLAY_NAME$1, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME$1, props.__scopeDialog);
    return context.modal ? /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogOverlayImpl, { ...overlayProps, ref: forwardedRef }) }) : null;
  }
);
DialogOverlay.displayName = OVERLAY_NAME$1;
var Slot = /* @__PURE__ */ createSlot("DialogOverlay.RemoveScroll");
var DialogOverlayImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...overlayProps } = props;
    const context = useDialogContext(OVERLAY_NAME$1, __scopeDialog);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReactRemoveScroll, { as: Slot, allowPinchZoom: true, shards: [context.contentRef], children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Primitive.div,
        {
          "data-state": getState(context.open),
          ...overlayProps,
          ref: forwardedRef,
          style: { pointerEvents: "auto", ...overlayProps.style }
        }
      ) })
    );
  }
);
var CONTENT_NAME$1 = "DialogContent";
var DialogContent = reactExports.forwardRef(
  (props, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME$1, props.__scopeDialog);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME$1, props.__scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Presence, { present: forceMount || context.open, children: context.modal ? /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentModal, { ...contentProps, ref: forwardedRef }) : /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContentNonModal, { ...contentProps, ref: forwardedRef }) });
  }
);
DialogContent.displayName = CONTENT_NAME$1;
var DialogContentModal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME$1, props.__scopeDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, context.contentRef, contentRef);
    reactExports.useEffect(() => {
      const content = contentRef.current;
      if (content) return hideOthers(content);
    }, []);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DialogContentImpl,
      {
        ...props,
        ref: composedRefs,
        trapFocus: context.open,
        disableOutsidePointerEvents: true,
        onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
          event.preventDefault();
          context.triggerRef.current?.focus();
        }),
        onPointerDownOutside: composeEventHandlers(props.onPointerDownOutside, (event) => {
          const originalEvent = event.detail.originalEvent;
          const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
          const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
          if (isRightClick) event.preventDefault();
        }),
        onFocusOutside: composeEventHandlers(
          props.onFocusOutside,
          (event) => event.preventDefault()
        )
      }
    );
  }
);
var DialogContentNonModal = reactExports.forwardRef(
  (props, forwardedRef) => {
    const context = useDialogContext(CONTENT_NAME$1, props.__scopeDialog);
    const hasInteractedOutsideRef = reactExports.useRef(false);
    const hasPointerDownOutsideRef = reactExports.useRef(false);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      DialogContentImpl,
      {
        ...props,
        ref: forwardedRef,
        trapFocus: false,
        disableOutsidePointerEvents: false,
        onCloseAutoFocus: (event) => {
          props.onCloseAutoFocus?.(event);
          if (!event.defaultPrevented) {
            if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
            event.preventDefault();
          }
          hasInteractedOutsideRef.current = false;
          hasPointerDownOutsideRef.current = false;
        },
        onInteractOutside: (event) => {
          props.onInteractOutside?.(event);
          if (!event.defaultPrevented) {
            hasInteractedOutsideRef.current = true;
            if (event.detail.originalEvent.type === "pointerdown") {
              hasPointerDownOutsideRef.current = true;
            }
          }
          const target = event.target;
          const targetIsTrigger = context.triggerRef.current?.contains(target);
          if (targetIsTrigger) event.preventDefault();
          if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.current) {
            event.preventDefault();
          }
        }
      }
    );
  }
);
var DialogContentImpl = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, trapFocus, onOpenAutoFocus, onCloseAutoFocus, ...contentProps } = props;
    const context = useDialogContext(CONTENT_NAME$1, __scopeDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    useFocusGuards();
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        FocusScope,
        {
          asChild: true,
          loop: true,
          trapped: trapFocus,
          onMountAutoFocus: onOpenAutoFocus,
          onUnmountAutoFocus: onCloseAutoFocus,
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            DismissableLayer,
            {
              role: "dialog",
              id: context.contentId,
              "aria-describedby": context.descriptionId,
              "aria-labelledby": context.titleId,
              "data-state": getState(context.open),
              ...contentProps,
              ref: composedRefs,
              onDismiss: () => context.onOpenChange(false)
            }
          )
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TitleWarning, { titleId: context.titleId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(DescriptionWarning$1, { contentRef, descriptionId: context.descriptionId })
      ] })
    ] });
  }
);
var TITLE_NAME$1 = "DialogTitle";
var DialogTitle = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...titleProps } = props;
    const context = useDialogContext(TITLE_NAME$1, __scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.h2, { id: context.titleId, ...titleProps, ref: forwardedRef });
  }
);
DialogTitle.displayName = TITLE_NAME$1;
var DESCRIPTION_NAME$1 = "DialogDescription";
var DialogDescription = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...descriptionProps } = props;
    const context = useDialogContext(DESCRIPTION_NAME$1, __scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Primitive.p, { id: context.descriptionId, ...descriptionProps, ref: forwardedRef });
  }
);
DialogDescription.displayName = DESCRIPTION_NAME$1;
var CLOSE_NAME = "DialogClose";
var DialogClose = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeDialog, ...closeProps } = props;
    const context = useDialogContext(CLOSE_NAME, __scopeDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.button,
      {
        type: "button",
        ...closeProps,
        ref: forwardedRef,
        onClick: composeEventHandlers(props.onClick, () => context.onOpenChange(false))
      }
    );
  }
);
DialogClose.displayName = CLOSE_NAME;
function getState(open) {
  return open ? "open" : "closed";
}
var TITLE_WARNING_NAME = "DialogTitleWarning";
var [WarningProvider, useWarningContext] = createContext2(TITLE_WARNING_NAME, {
  contentName: CONTENT_NAME$1,
  titleName: TITLE_NAME$1,
  docsSlug: "dialog"
});
var TitleWarning = ({ titleId }) => {
  const titleWarningContext = useWarningContext(TITLE_WARNING_NAME);
  const MESSAGE = `\`${titleWarningContext.contentName}\` requires a \`${titleWarningContext.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${titleWarningContext.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${titleWarningContext.docsSlug}`;
  reactExports.useEffect(() => {
    if (titleId) {
      const hasTitle = document.getElementById(titleId);
      if (!hasTitle) console.error(MESSAGE);
    }
  }, [MESSAGE, titleId]);
  return null;
};
var DESCRIPTION_WARNING_NAME = "DialogDescriptionWarning";
var DescriptionWarning$1 = ({ contentRef, descriptionId }) => {
  const descriptionWarningContext = useWarningContext(DESCRIPTION_WARNING_NAME);
  const MESSAGE = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${descriptionWarningContext.contentName}}.`;
  reactExports.useEffect(() => {
    const describedById = contentRef.current?.getAttribute("aria-describedby");
    if (descriptionId && describedById) {
      const hasDescription = document.getElementById(descriptionId);
      if (!hasDescription) console.warn(MESSAGE);
    }
  }, [MESSAGE, contentRef, descriptionId]);
  return null;
};
var Root = Dialog;
var Trigger = DialogTrigger;
var Portal = DialogPortal;
var Overlay = DialogOverlay;
var Content = DialogContent;
var Title = DialogTitle;
var Description = DialogDescription;
var Close = DialogClose;
var SLOTTABLE_IDENTIFIER = /* @__PURE__ */ Symbol("radix.slottable");
// @__NO_SIDE_EFFECTS__
function createSlottable(ownerName) {
  const Slottable2 = ({ children }) => {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
  };
  Slottable2.displayName = `${ownerName}.Slottable`;
  Slottable2.__radixId = SLOTTABLE_IDENTIFIER;
  return Slottable2;
}
var ROOT_NAME = "AlertDialog";
var [createAlertDialogContext] = createContextScope(ROOT_NAME, [
  createDialogScope
]);
var useDialogScope = createDialogScope();
var AlertDialog$1 = (props) => {
  const { __scopeAlertDialog, ...alertDialogProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root, { ...dialogScope, ...alertDialogProps, modal: true });
};
AlertDialog$1.displayName = ROOT_NAME;
var TRIGGER_NAME = "AlertDialogTrigger";
var AlertDialogTrigger = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...triggerProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Trigger, { ...dialogScope, ...triggerProps, ref: forwardedRef });
  }
);
AlertDialogTrigger.displayName = TRIGGER_NAME;
var PORTAL_NAME = "AlertDialogPortal";
var AlertDialogPortal$1 = (props) => {
  const { __scopeAlertDialog, ...portalProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal, { ...dialogScope, ...portalProps });
};
AlertDialogPortal$1.displayName = PORTAL_NAME;
var OVERLAY_NAME = "AlertDialogOverlay";
var AlertDialogOverlay$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...overlayProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Overlay, { ...dialogScope, ...overlayProps, ref: forwardedRef });
  }
);
AlertDialogOverlay$1.displayName = OVERLAY_NAME;
var CONTENT_NAME = "AlertDialogContent";
var [AlertDialogContentProvider, useAlertDialogContentContext] = createAlertDialogContext(CONTENT_NAME);
var Slottable = /* @__PURE__ */ createSlottable("AlertDialogContent");
var AlertDialogContent$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, children, ...contentProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    const contentRef = reactExports.useRef(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    const cancelRef = reactExports.useRef(null);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      WarningProvider,
      {
        contentName: CONTENT_NAME,
        titleName: TITLE_NAME,
        docsSlug: "alert-dialog",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogContentProvider, { scope: __scopeAlertDialog, cancelRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Content,
          {
            role: "alertdialog",
            ...dialogScope,
            ...contentProps,
            ref: composedRefs,
            onOpenAutoFocus: composeEventHandlers(contentProps.onOpenAutoFocus, (event) => {
              event.preventDefault();
              cancelRef.current?.focus({ preventScroll: true });
            }),
            onPointerDownOutside: (event) => event.preventDefault(),
            onInteractOutside: (event) => event.preventDefault(),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Slottable, { children }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(DescriptionWarning, { contentRef })
            ]
          }
        ) })
      }
    );
  }
);
AlertDialogContent$1.displayName = CONTENT_NAME;
var TITLE_NAME = "AlertDialogTitle";
var AlertDialogTitle$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...titleProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Title, { ...dialogScope, ...titleProps, ref: forwardedRef });
  }
);
AlertDialogTitle$1.displayName = TITLE_NAME;
var DESCRIPTION_NAME = "AlertDialogDescription";
var AlertDialogDescription$1 = reactExports.forwardRef((props, forwardedRef) => {
  const { __scopeAlertDialog, ...descriptionProps } = props;
  const dialogScope = useDialogScope(__scopeAlertDialog);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Description, { ...dialogScope, ...descriptionProps, ref: forwardedRef });
});
AlertDialogDescription$1.displayName = DESCRIPTION_NAME;
var ACTION_NAME = "AlertDialogAction";
var AlertDialogAction$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...actionProps } = props;
    const dialogScope = useDialogScope(__scopeAlertDialog);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Close, { ...dialogScope, ...actionProps, ref: forwardedRef });
  }
);
AlertDialogAction$1.displayName = ACTION_NAME;
var CANCEL_NAME = "AlertDialogCancel";
var AlertDialogCancel$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeAlertDialog, ...cancelProps } = props;
    const { cancelRef } = useAlertDialogContentContext(CANCEL_NAME, __scopeAlertDialog);
    const dialogScope = useDialogScope(__scopeAlertDialog);
    const ref = useComposedRefs(forwardedRef, cancelRef);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Close, { ...dialogScope, ...cancelProps, ref });
  }
);
AlertDialogCancel$1.displayName = CANCEL_NAME;
var DescriptionWarning = ({ contentRef }) => {
  const MESSAGE = `\`${CONTENT_NAME}\` requires a description for the component to be accessible for screen reader users.

You can add a description to the \`${CONTENT_NAME}\` by passing a \`${DESCRIPTION_NAME}\` component as a child, which also benefits sighted users by adding visible context to the dialog.

Alternatively, you can use your own component as a description by assigning it an \`id\` and passing the same value to the \`aria-describedby\` prop in \`${CONTENT_NAME}\`. If the description is confusing or duplicative for sighted users, you can use the \`@radix-ui/react-visually-hidden\` primitive as a wrapper around your description component.

For more information, see https://radix-ui.com/primitives/docs/components/alert-dialog`;
  reactExports.useEffect(() => {
    const hasDescription = document.getElementById(
      contentRef.current?.getAttribute("aria-describedby")
    );
    if (!hasDescription) console.warn(MESSAGE);
  }, [MESSAGE, contentRef]);
  return null;
};
var Root2 = AlertDialog$1;
var Portal2 = AlertDialogPortal$1;
var Overlay2 = AlertDialogOverlay$1;
var Content2 = AlertDialogContent$1;
var Action = AlertDialogAction$1;
var Cancel = AlertDialogCancel$1;
var Title2 = AlertDialogTitle$1;
var Description2 = AlertDialogDescription$1;
function AlertDialog({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Root2, { "code-path": "src/components/ui/alert-dialog.tsx:10:10", "data-slot": "alert-dialog", ...props });
}
function AlertDialogPortal({
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Portal2, { "code-path": "src/components/ui/alert-dialog.tsx:25:5", "data-slot": "alert-dialog-portal", ...props });
}
function AlertDialogOverlay({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Overlay2,
    {
      "code-path": "src/components/ui/alert-dialog.tsx:34:5",
      "data-slot": "alert-dialog-overlay",
      className: cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      ),
      ...props
    }
  );
}
function AlertDialogContent({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogPortal, { "code-path": "src/components/ui/alert-dialog.tsx:50:5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogOverlay, { "code-path": "src/components/ui/alert-dialog.tsx:51:7" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Content2,
      {
        "code-path": "src/components/ui/alert-dialog.tsx:52:7",
        "data-slot": "alert-dialog-content",
        className: cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        ),
        ...props
      }
    )
  ] });
}
function AlertDialogHeader({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "code-path": "src/components/ui/alert-dialog.tsx:69:5",
      "data-slot": "alert-dialog-header",
      className: cn("flex flex-col gap-2 text-center sm:text-left", className),
      ...props
    }
  );
}
function AlertDialogFooter({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "code-path": "src/components/ui/alert-dialog.tsx:82:5",
      "data-slot": "alert-dialog-footer",
      className: cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      ),
      ...props
    }
  );
}
function AlertDialogTitle({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Title2,
    {
      "code-path": "src/components/ui/alert-dialog.tsx:98:5",
      "data-slot": "alert-dialog-title",
      className: cn("text-lg font-semibold", className),
      ...props
    }
  );
}
function AlertDialogDescription({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Description2,
    {
      "code-path": "src/components/ui/alert-dialog.tsx:111:5",
      "data-slot": "alert-dialog-description",
      className: cn("text-muted-foreground text-sm", className),
      ...props
    }
  );
}
function AlertDialogAction({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Action,
    {
      "code-path": "src/components/ui/alert-dialog.tsx:124:5",
      className: cn(buttonVariants(), className),
      ...props
    }
  );
}
function AlertDialogCancel({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Cancel,
    {
      "code-path": "src/components/ui/alert-dialog.tsx:136:5",
      className: cn(buttonVariants({ variant: "outline" }), className),
      ...props
    }
  );
}
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "video/mp4",
  "video/webm"
].join(",");
function SkeletonGrid() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:35:5", className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4", children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:37:9", className: "rounded-lg border border-cabinet-border bg-cabinet-paper overflow-hidden animate-pulse", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:38:11", className: "aspect-square bg-cabinet-bg" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:39:11", className: "px-3 py-2 space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:40:13", className: "h-4 w-3/4 bg-cabinet-itemBg rounded" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:41:13", className: "h-3 w-1/2 bg-cabinet-itemBg rounded" })
    ] })
  ] }, i)) });
}
function MaterialLibraryPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = reactExports.useState("");
  const [sort, setSort] = reactExports.useState("added");
  const [favoritedOnly, setFavoritedOnly] = reactExports.useState(false);
  const [navigationOpen, setNavigationOpen] = reactExports.useState(false);
  const { items, total, loading, error, refetch } = useMaterials(searchQuery, sort, favoritedOnly);
  const [deleteTarget, setDeleteTarget] = reactExports.useState(null);
  const [deleting, setDeleting] = reactExports.useState(false);
  const [uploading, setUploading] = reactExports.useState(false);
  const [previewItemId, setPreviewItemId] = reactExports.useState(null);
  const fileInputRef = reactExports.useRef(null);
  const previewItem = previewItemId ? items.find((i) => i.id === previewItemId) || null : null;
  const handleDelete = reactExports.useCallback((id) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setDeleteTarget({ id: item.id, name: item.fileName });
    }
  }, [items]);
  const confirmDelete = reactExports.useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/materials/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
      alert(t("library.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refetch, t]);
  const handleRename = reactExports.useCallback(async (id, fileName) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      refetch();
    } catch (err) {
      console.error("Rename failed:", err);
      alert(t("library.renameFailed"));
    }
  }, [refetch, t]);
  const handleToggleFavorite = reactExports.useCallback(async (id, favorited) => {
    try {
      const res = await fetch(`/api/materials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorited })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      refetch();
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      alert(t("library.favoriteFailed"));
    }
  }, [refetch, t]);
  const handleUpload = reactExports.useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      refetch();
    } catch (err) {
      console.error("Upload failed:", err);
      alert(t("library.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [refetch, t]);
  const handlePreview = reactExports.useCallback((id) => {
    setPreviewItemId(id);
  }, []);
  const closePreview = reactExports.useCallback(() => {
    setPreviewItemId(null);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:171:5", className: "h-screen overflow-hidden bg-cabinet-bg p-3 md:p-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AppNavigation, { "code-path": "src/components/material/MaterialLibraryPage.tsx:172:7", activePage: "library", open: navigationOpen, onClose: () => setNavigationOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:174:7", className: "mx-auto flex h-full max-w-[1760px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:175:9", className: "flex min-w-0 flex-1 flex-col h-full", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:177:11", className: "flex-shrink-0 px-5 md:px-9 pt-7 pb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:178:13", className: "flex items-center gap-3 mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:179:15",
              type: "button",
              onClick: () => setNavigationOpen(true),
              className: "flex h-9 w-9 items-center justify-center rounded hover:bg-cabinet-itemBg",
              "aria-label": t("nav.open"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { "code-path": "src/components/material/MaterialLibraryPage.tsx:185:17", size: 19, className: "text-cabinet-ink2" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:187:15", className: "flex-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { "code-path": "src/components/material/MaterialLibraryPage.tsx:188:17", className: "text-xl font-medium text-cabinet-ink tracking-[0]", children: favoritedOnly ? t("library.favorites") : t("library.title") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/material/MaterialLibraryPage.tsx:191:17", className: "text-[13px] text-cabinet-inkMuted mt-0.5", children: t("library.subtitle") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:193:15",
              ref: fileInputRef,
              type: "file",
              accept: ACCEPTED_TYPES,
              onChange: handleUpload,
              className: "hidden",
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:201:15",
              size: "sm",
              variant: favoritedOnly ? "default" : "outline",
              onClick: () => setFavoritedOnly((v) => !v),
              className: "gap-1.5",
              "aria-pressed": favoritedOnly,
              title: favoritedOnly ? t("library.favoritesAll") : t("library.favorites"),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { "code-path": "src/components/material/MaterialLibraryPage.tsx:209:17", size: 15, fill: favoritedOnly ? "currentColor" : "none" }),
                favoritedOnly ? t("library.favoritesAll") : t("library.favorites")
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:212:15",
              size: "sm",
              onClick: () => fileInputRef.current?.click(),
              disabled: uploading,
              className: "gap-1.5",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Upload, { "code-path": "src/components/material/MaterialLibraryPage.tsx:218:17", size: 15 }),
                uploading ? t("library.uploading") : t("library.upload")
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:224:13", className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(MaterialSearchBar, { "code-path": "src/components/material/MaterialLibraryPage.tsx:225:15", value: searchQuery, onChange: setSearchQuery }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:226:15", className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/material/MaterialLibraryPage.tsx:227:17", className: "text-xs text-cabinet-inkMuted hidden sm:inline", children: t("library.sortBy") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MaterialSortSelect, { "code-path": "src/components/material/MaterialLibraryPage.tsx:228:17", value: sort, onChange: setSort })
          ] })
        ] }),
        !loading && !error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:234:15", className: "mt-3 text-[13px] text-cabinet-inkMuted", children: t("library.itemCount", { count: total }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:241:11", className: "flex-1 min-h-0 overflow-y-auto px-5 md:px-9 pb-6", children: [
        error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:243:15", className: "mb-4 px-5 py-2 text-sm text-[#d53b00] bg-cabinet-paper border border-cabinet-border flex items-center justify-between", role: "alert", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { "code-path": "src/components/material/MaterialLibraryPage.tsx:244:17", children: [
            t("library.loadError"),
            ": ",
            error
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { "code-path": "src/components/material/MaterialLibraryPage.tsx:245:17", onClick: refetch, className: "text-sm text-cabinet-blue font-medium hover:underline", children: t("library.retry") })
        ] }),
        loading && items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(SkeletonGrid, { "code-path": "src/components/material/MaterialLibraryPage.tsx:252:15" }) : items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(MaterialEmptyState, { "code-path": "src/components/material/MaterialLibraryPage.tsx:254:15", isSearch: !!searchQuery.trim(), isFavoritesView: favoritedOnly }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
          MaterialGrid,
          {
            "code-path": "src/components/material/MaterialLibraryPage.tsx:256:15",
            items,
            onDelete: handleDelete,
            onRename: handleRename,
            onToggleFavorite: handleToggleFavorite,
            onPreview: handlePreview
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialog, { "code-path": "src/components/material/MaterialLibraryPage.tsx:269:7", open: !!deleteTarget, onOpenChange: (open) => {
      if (!open) setDeleteTarget(null);
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogContent, { "code-path": "src/components/material/MaterialLibraryPage.tsx:270:9", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogHeader, { "code-path": "src/components/material/MaterialLibraryPage.tsx:271:11", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogTitle, { "code-path": "src/components/material/MaterialLibraryPage.tsx:272:13", children: t("library.deleteConfirmTitle") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogDescription, { "code-path": "src/components/material/MaterialLibraryPage.tsx:273:13", children: t("library.deleteConfirmDesc", { name: deleteTarget?.name || "" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(AlertDialogFooter, { "code-path": "src/components/material/MaterialLibraryPage.tsx:277:11", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(AlertDialogCancel, { "code-path": "src/components/material/MaterialLibraryPage.tsx:278:13", disabled: deleting, children: t("detail.close") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AlertDialogAction,
          {
            "code-path": "src/components/material/MaterialLibraryPage.tsx:279:13",
            onClick: confirmDelete,
            disabled: deleting,
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            children: deleting ? "..." : t("library.delete")
          }
        )
      ] })
    ] }) }),
    previewItemId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      MaterialPreviewModal,
      {
        "code-path": "src/components/material/MaterialLibraryPage.tsx:292:9",
        items,
        previewItem,
        previewItemId,
        onSelect: setPreviewItemId,
        onClose: closePreview
      }
    )
  ] });
}
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function isTextMime(mimeType) {
  return mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "application/json";
}
function MaterialPreviewModal({ items, previewItem, previewItemId, onSelect, onClose }) {
  const { t } = useI18n();
  const [textPreview, setTextPreview] = reactExports.useState(null);
  const previewTextId = previewItem && isTextMime(previewItem.mimeType) ? previewItem.id : null;
  const activeTextPreview = textPreview?.itemId === previewTextId ? textPreview : null;
  reactExports.useEffect(() => {
    if (!previewTextId) return;
    let cancelled = false;
    fetch(`/api/materials/${previewTextId}/file`).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!cancelled) setTextPreview({ itemId: previewTextId, content: text.slice(0, 1e4), error: null });
    }).catch((err) => {
      if (!cancelled) setTextPreview({ itemId: previewTextId, content: null, error: err instanceof Error ? err.message : String(err) });
    });
    return () => {
      cancelled = true;
    };
  }, [previewTextId]);
  reactExports.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "code-path": "src/components/material/MaterialLibraryPage.tsx:369:5",
      className: "fixed inset-0 z-50 flex bg-black/80",
      onClick: (e) => {
        if (e.currentTarget === e.target) onClose();
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:376:7", className: "flex-shrink-0 w-[88px] h-full overflow-y-auto bg-black/40 border-r border-white/10 py-2 space-y-2 px-1.5", children: items.map((item) => {
          const isImage2 = item.mimeType.startsWith("image/");
          const isVideo = item.mimeType.startsWith("video/");
          const selected = item.id === previewItemId;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:382:13",
              type: "button",
              onClick: () => onSelect(item.id),
              className: `w-full aspect-square rounded overflow-hidden border-2 transition-colors ${selected ? "border-blue-500" : "border-transparent hover:border-white/30"}`,
              "aria-label": item.fileName,
              title: item.fileName,
              children: isImage2 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  "code-path": "src/components/material/MaterialLibraryPage.tsx:393:17",
                  src: `/api/materials/${item.id}/file`,
                  alt: item.fileName,
                  className: "w-full h-full object-cover",
                  loading: "lazy"
                }
              ) : isVideo ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                "video",
                {
                  "code-path": "src/components/material/MaterialLibraryPage.tsx:400:17",
                  src: `/api/materials/${item.id}/file`,
                  className: "w-full h-full object-cover",
                  muted: true,
                  playsInline: true,
                  preload: "metadata"
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:408:17", className: "w-full h-full bg-cabinet-paper flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileIcon, { "code-path": "src/components/material/MaterialLibraryPage.tsx:409:19", mimeType: item.mimeType, fileName: item.fileName }) })
            },
            item.id
          );
        }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:418:7", className: "flex-1 min-w-0 h-full flex flex-col", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:420:9", className: "flex-shrink-0 flex items-center justify-end px-4 py-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:421:11",
              type: "button",
              onClick: onClose,
              className: "flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors",
              "aria-label": t("detail.close"),
              title: t("detail.close"),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { "code-path": "src/components/material/MaterialLibraryPage.tsx:428:13", size: 20 })
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:433:9", className: "flex-1 min-h-0 overflow-auto px-4 pb-4", children: previewItem ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            PreviewContent,
            {
              "code-path": "src/components/material/MaterialLibraryPage.tsx:435:13",
              item: previewItem,
              textContent: activeTextPreview?.content ?? null,
              textError: activeTextPreview?.error ?? null
            }
          ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:441:13", className: "flex h-full items-center justify-center text-white/60 text-sm", children: t("library.itemNotFound") }) })
        ] })
      ]
    }
  );
}
function PreviewContent({
  item,
  textContent,
  textError
}) {
  const { t } = useI18n();
  if (item.mimeType.startsWith("image/")) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:464:7", className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "img",
      {
        "code-path": "src/components/material/MaterialLibraryPage.tsx:465:9",
        src: `/api/materials/${item.id}/file`,
        alt: item.fileName,
        className: "max-w-full max-h-full object-contain"
      }
    ) });
  }
  if (item.mimeType.startsWith("video/")) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:476:7", className: "flex h-full items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "video",
      {
        "code-path": "src/components/material/MaterialLibraryPage.tsx:477:9",
        src: `/api/materials/${item.id}/file`,
        controls: true,
        playsInline: true,
        preload: "metadata",
        className: "max-w-full max-h-full rounded bg-black"
      }
    ) });
  }
  if (item.mimeType === "application/pdf") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "iframe",
      {
        "code-path": "src/components/material/MaterialLibraryPage.tsx:490:7",
        src: `/api/materials/${item.id}/file`,
        title: item.fileName,
        className: "w-full h-full border-0 rounded"
      }
    );
  }
  if (isTextMime(item.mimeType)) {
    if (textError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:501:9", className: "flex h-full items-center justify-center text-white/60 text-sm", children: [
        t("library.loadError"),
        ": ",
        textError
      ] });
    }
    if (textContent === null) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:508:9", className: "flex h-full items-center justify-center text-white/60 text-sm", children: t("library.loading") });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { "code-path": "src/components/material/MaterialLibraryPage.tsx:514:7", className: "w-full h-full overflow-auto bg-black/30 text-white/90 text-sm p-4 rounded whitespace-pre-wrap break-words", children: textContent });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:522:5", className: "flex h-full flex-col items-center justify-center gap-4 text-white", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:523:7", className: "scale-150", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileIcon, { "code-path": "src/components/material/MaterialLibraryPage.tsx:524:9", mimeType: item.mimeType, fileName: item.fileName }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:526:7", className: "text-center space-y-1", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:527:9", className: "text-lg font-medium", children: item.fileName }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:528:9", className: "text-sm text-white/60", children: [
        formatFileSize(item.fileSize),
        " · ",
        item.mimeType
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/material/MaterialLibraryPage.tsx:531:9", className: "text-sm text-white/60", children: new Date(item.addedAt).toLocaleDateString() })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "a",
      {
        "code-path": "src/components/material/MaterialLibraryPage.tsx:535:7",
        href: `/api/materials/${item.id}/file?download=1`,
        download: item.fileName,
        className: "inline-flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { "code-path": "src/components/material/MaterialLibraryPage.tsx:540:9", size: 16 }),
          t("library.download")
        ]
      }
    )
  ] });
}
const zhSections = [
  {
    id: "start",
    title: "开始一次会话",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileUp, { "code-path": "src/components/guide/UserGuidePage.tsx:39:11", size: 20 }),
    items: [
      { action: "直接开聊", detail: "不上传、不选卡也可以直接说需求，例如“帮我拆解一个短片创意方案”，AI 会自己生成卡片。" },
      { action: "上传文件", detail: "源卡片支持图片、视频、PDF、Word、PPT、TXT/MD/JSON。" },
      { action: "输入链接", detail: "切到“链接”后粘贴 URL，点击“分析链接”。" },
      { action: "分析 / 探索", detail: "有素材时，在源卡片右侧“研究”里选择分析或探索；探索会更慢，但会生成更深入的卡片。" },
      { action: "继续追问", detail: "底部聊天框会结合当前会话里的卡片、素材和上下文；选中卡片只是让问题更聚焦。" }
    ]
  },
  {
    id: "canvas",
    title: "画布移动与视图",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointer2, { "code-path": "src/components/guide/UserGuidePage.tsx:51:11", size: 20 }),
    items: [
      { action: "拖动画布空白处", detail: "平移整张画布。" },
      { action: "滚轮", detail: "上下滚动画布；Shift + 滚轮横向移动。" },
      { action: "Ctrl / ⌘ + 滚轮", detail: "缩放画布。" },
      { action: "右上视图按钮", detail: "可放大、缩小、适配视图、自动整理。" },
      { action: "小地图", detail: "在聊天框“+”菜单里打开；点击小地图可快速跳转画布位置。" }
    ]
  },
  {
    id: "cards",
    title: "卡片选择、移动、尺寸",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { "code-path": "src/components/guide/UserGuidePage.tsx:63:11", size: 20 }),
    items: [
      { action: "拖动卡片", detail: "移动卡片；多选后拖动任意一张会一起移动。" },
      { action: "双击卡片", detail: "需要围绕某张卡追问时，双击它作为聊天上下文；如果卡片有引用，则打开引用面板。" },
      { action: "双击标题", detail: "重命名源卡片、生成卡片或蓝图里的卡片标题。" },
      { action: "拖动边缘/角点", detail: "调整卡片宽高。" },
      { action: "Shift / Ctrl / ⌘ + 点击", detail: "加入或移出多选。" },
      { action: "Shift + 拖动画布空白处", detail: "框选多张卡片；出现工具条后可分组、解除分组或整理选中区域。" }
    ]
  },
  {
    id: "links",
    title: "连线、收纳、蓝图",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { "code-path": "src/components/guide/UserGuidePage.tsx:76:11", size: 20 }),
    items: [
      { action: "拖卡片左右边缘小把手", detail: "拉到另一张卡片上创建连接。" },
      { action: "双击主画布连线", detail: "弹出确认后删除这条连线。" },
      { action: "点击卡片左侧收纳点", detail: "收起/展开非生成类后续卡片。" },
      { action: "双击收纳点", detail: "收起/展开该卡片的全部后续分支。" },
      { action: "三击收纳点", detail: "展开所有已收起分支。" },
      { action: "多卡片聚合节点", detail: "多张卡片互相连接时，会聚合成小圆点节点，减少复杂连线干扰并保留卡片之间的关系。" },
      { action: "双击聚合圆点", detail: "打开蓝图；蓝图里可拖卡片、拉关系线、选择上游/下游/并列，并在成图时作为关系参考。" },
      { action: "双击蓝图关系线", detail: "给两张卡片之间的关系添加说明；可调蓝图参考强度，控制生成图片时对关系的遵循程度。" }
    ]
  },
  {
    id: "chat",
    title: "聊天区、Agent 与 + 功能区",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { "code-path": "src/components/guide/UserGuidePage.tsx:91:11", size: 20 }),
    items: [
      { action: "直接输入问题", detail: "不选卡片也可以对话，让 AI 自己规划、生成卡片和连线；双击卡片只是把上下文限定到那张卡。" },
      { action: "输入 /", detail: "打开命令区，可保存、导入/导出、搜索卡片、新建卡片、适配视图或自动整理。" },
      { action: "+ 功能区", detail: "上传素材、从素材库导入、打开小地图、启动深入研究、新建空白画布或允许 Subagents 拆解复杂任务。" },
      { action: "Agent 面板", detail: "适合更长目标；描述任务后可让 AI 拆解步骤、调用画布操作，并在需要时启用 Subagents。" },
      { action: "新建对话", detail: "聊天区顶部“+”开启新线程；历史按钮可回到旧线程。" },
      { action: "实时语音控制", detail: "麦克风按钮支持语音转写；配置实时语音后，可直接说出指令并让工作台结合画布上下文响应。" }
    ]
  },
  {
    id: "outputs",
    title: "生成、保存、回看",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { "code-path": "src/components/guide/UserGuidePage.tsx:104:11", size: 20 }),
    items: [
      { action: "生成图片/视频", detail: "可以先让 AI 生成方向卡，也可以围绕选中卡片补充风格、比例和约束后生成。" },
      { action: "图片编辑界面", detail: "先用图片卡片左下角的编辑按钮进入；打开图片详情后，可重生成、输入修改要求、用“选择”涂抹局部区域、换宽高比或下载。" },
      { action: "分享界面", detail: "先用图片卡片右下角或图片详情里的分享按钮进入；可给单图命名、生成/复制分享链接，也能重命名或下载。" },
      { action: "保存", detail: "会话会自动保存，也可用 /save 手动保存。" },
      { action: "历史记录", detail: "回看会话里的图片、视频、网页、文档和聊天输出。" },
      { action: "素材库", detail: "管理上传素材；公开 demo 中每个匿名访客只看到自己的历史和素材。" }
    ]
  }
];
const enSections = [
  {
    id: "start",
    title: "Start a session",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(FileUp, { "code-path": "src/components/guide/UserGuidePage.tsx:120:11", size: 20 }),
    items: [
      { action: "Start by chatting", detail: "You can skip uploads and card selection: type a goal such as “break down a campaign idea” and AI can create cards." },
      { action: "Upload files", detail: "The source card supports images, videos, PDFs, Word, PPT, TXT/MD/JSON." },
      { action: "Paste a link", detail: "Switch to Link, paste a URL, then click Analyze Link." },
      { action: "Analyze / Explore", detail: "When material exists, use Research on the source card. Explore is slower but creates deeper cards." },
      { action: "Keep asking", detail: "The bottom chat uses cards, materials, and session context; selecting a card only makes the context more focused." }
    ]
  },
  {
    id: "canvas",
    title: "Canvas navigation",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MousePointer2, { "code-path": "src/components/guide/UserGuidePage.tsx:132:11", size: 20 }),
    items: [
      { action: "Drag blank canvas", detail: "Pan the whole canvas." },
      { action: "Mouse wheel", detail: "Scroll the canvas; Shift + wheel moves horizontally." },
      { action: "Ctrl / ⌘ + wheel", detail: "Zoom the canvas." },
      { action: "View controls", detail: "Zoom in/out, fit view, or auto-arrange." },
      { action: "Minimap", detail: "Open it from the chat + menu; click it to jump around the canvas." }
    ]
  },
  {
    id: "cards",
    title: "Cards: select, move, resize",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Layers, { "code-path": "src/components/guide/UserGuidePage.tsx:144:11", size: 20 }),
    items: [
      { action: "Drag a card", detail: "Move it. If multiple cards are selected, they move together." },
      { action: "Double-click a card", detail: "Use this only when you want focused chat context; cards with references open the reference panel." },
      { action: "Double-click a title", detail: "Rename source, generated, or blueprint cards." },
      { action: "Drag edges/corners", detail: "Resize a card." },
      { action: "Shift / Ctrl / ⌘ + click", detail: "Add or remove a card from multi-select." },
      { action: "Shift + drag blank canvas", detail: "Marquee-select cards, then group, ungroup, or arrange the selection." }
    ]
  },
  {
    id: "links",
    title: "Links, collapse, blueprint",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(GitBranch, { "code-path": "src/components/guide/UserGuidePage.tsx:157:11", size: 20 }),
    items: [
      { action: "Drag side handles", detail: "Connect one card to another." },
      { action: "Double-click a canvas link", detail: "Confirm and delete that link." },
      { action: "Click the left collapse dot", detail: "Hide/show non-generated downstream cards." },
      { action: "Double-click the collapse dot", detail: "Collapse/expand all downstream branches." },
      { action: "Triple-click the collapse dot", detail: "Expand all collapsed branches." },
      { action: "Multi-card junction", detail: "When several cards connect, they can gather into a small junction dot that reduces link clutter while preserving relationships." },
      { action: "Double-click a junction dot", detail: "Open Blueprint; arrange mini-cards, draw upstream/downstream/parallel relationships, and use them as image-generation context." },
      { action: "Double-click a blueprint link", detail: "Add a relationship note; adjust blueprint reference strength to control how strongly image generation follows the relationships." }
    ]
  },
  {
    id: "chat",
    title: "Chat, Agent, and + actions",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MessageSquare, { "code-path": "src/components/guide/UserGuidePage.tsx:172:11", size: 20 }),
    items: [
      { action: "Ask directly", detail: "You can chat without selecting a card and let AI plan, create cards, and connect them. Double-clicking only focuses context on one card." },
      { action: "Type /", detail: "Open the command area for save, import/export, card search, new cards, fit view, and auto-arrange." },
      { action: "+ action area", detail: "Upload files, import from materials, open the minimap, start deep research, start a blank canvas, or allow Subagents for complex tasks." },
      { action: "Agent panel", detail: "Use it for longer goals; describe a task and let AI break it into steps, canvas actions, and optional Subagents." },
      { action: "New thread", detail: "Use the chat header + button; history returns to previous threads." },
      { action: "Realtime voice control", detail: "The microphone buttons support speech-to-text; when realtime is configured, speak instructions while keeping canvas context." }
    ]
  },
  {
    id: "outputs",
    title: "Generate, save, revisit",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Share2, { "code-path": "src/components/guide/UserGuidePage.tsx:185:11", size: 20 }),
    items: [
      { action: "Generate image/video", detail: "Let AI create direction cards first, or select a card and add style, ratio, and constraints before generation." },
      { action: "Image editing", detail: "Start from the edit button at the lower-left of an image card; in Image Details you can regenerate, describe edits, brush a local region, change aspect ratio, or download." },
      { action: "Share panel", detail: "Start from the share button at the lower-right of an image card or from Image Details; name one image, create/copy a link, rename it, or download it." },
      { action: "Save", detail: "Sessions auto-save; /save also saves manually." },
      { action: "History", detail: "Review images, videos, web sources, documents, and chats." },
      { action: "Material library", detail: "Manage uploads. In the public demo, each anonymous visitor only sees their own data." }
    ]
  }
];
const zhCommands = [
  { command: "/save", detail: "保存当前会话" },
  { command: "/export", detail: "导出会话 JSON" },
  { command: "/import", detail: "导入会话 JSON" },
  { command: "/sessions", detail: "打开历史会话面板" },
  { command: "/fit", detail: "适配当前画布视图" },
  { command: "/arrange", detail: "自动整理画布" },
  { command: "/new-card 文本", detail: "新建一张文本卡片" },
  { command: "/search 关键词", detail: "搜索并定位画布卡片" },
  { command: "/material 关键词", detail: "从素材库导入" }
];
const enCommands = [
  { command: "/save", detail: "Save current session" },
  { command: "/export", detail: "Export session JSON" },
  { command: "/import", detail: "Import session JSON" },
  { command: "/sessions", detail: "Open session panel" },
  { command: "/fit", detail: "Fit current canvas" },
  { command: "/arrange", detail: "Auto-arrange canvas" },
  { command: "/new-card text", detail: "Create a text card" },
  { command: "/search keyword", detail: "Find and focus a card" },
  { command: "/material keyword", detail: "Import from material library" }
];
function contentFor(lang) {
  return lang === "en" ? {
    sections: enSections,
    commands: enCommands,
    title: "ThoughtGrid quick guide",
    kicker: "Operation cheat sheet",
    intro: "A concise reference for the actions that are easy to miss on the canvas.",
    projectTitle: "What you can actually do here",
    projectIntro: "Use ThoughtGrid like a visual AI desk: type a goal, upload a file, paste a link, or start from an image. AI can turn the work into cards, connect them, keep researching, generate images/videos, edit images, and leave you with a saved trail you can revisit or share.",
    projectFeatures: [
      { label: "Start from nothing", detail: "Type a rough request in chat and let AI create the first cards, plan branches, and links for you." },
      { label: "Turn material into a map", detail: "Upload a file or paste a webpage; the source card can summarize it, pull out useful points, and suggest next directions." },
      { label: "Chat globally or focus a card", detail: "No card selection is required. Double-click a card only when you want the next question to focus on that specific card." },
      { label: "Make and revise visuals", detail: "Generate images/videos from direction cards, then open Image Details to regenerate, mask-edit, change ratio, download, or share." },
      { label: "Use Agent or voice", detail: "Hand longer tasks to the Agent panel, allow Subagents when useful, or control the workbench with realtime voice if configured." },
      { label: "Keep the process", detail: "Sessions, materials, references, history, and share links make it easy to come back to the same project later." }
    ],
    projectUseCasesTitle: "Use it for",
    projectUseCases: ["Break down an idea", "Extract directions from materials", "Build a visual reference board", "Generate and edit images", "Keep a project trail"],
    openWorkbench: "Open workbench",
    openHistory: "Open history",
    sectionLabel: "Jump to section",
    flowTitle: "Basic flow",
    flow: ["Ask directly, upload, or paste a link", "Let AI create or analyze cards", "Optionally double-click a card to focus", "Ask, generate, edit images", "Save / share / revisit"],
    commandsTitle: "/ command menu",
    privacyTitle: "Public demo note",
    privacy: "History and materials are separated by anonymous browser cookie. Clearing cookies may lose the previous anonymous identity."
  } : {
    sections: zhSections,
    commands: zhCommands,
    title: "织境操作速查",
    kicker: "使用介绍",
    intro: "只保留最容易漏掉的动作细节。第一次使用时，按这页查操作即可。",
    projectTitle: "这里具体能做什么",
    projectIntro: "你可以把织境当成一个可视化 AI 工作台：直接说一个目标、上传一份资料、贴一个网页，或从一张图片开始。AI 会把过程拆成卡片、连成关系，继续研究、生成图片/视频、局部改图，并把过程保存下来方便回看和分享。",
    projectFeatures: [
      { label: "空白也能开始", detail: "直接在聊天框输入想法，例如“帮我拆一个短片创意方案”，AI 可以自己生成第一批卡片和连线。" },
      { label: "资料变成地图", detail: "上传文件或粘贴网页后，源卡片能提炼摘要、重点、结构和后续可探索方向。" },
      { label: "全局聊天或聚焦卡片", detail: "不必先选卡；只有当你希望下一轮围绕某张卡深入时，才需要双击卡片。" },
      { label: "生成并修改视觉", detail: "从方向卡生成图片/视频，再进入图片详情重生成、局部改图、换比例、下载或分享。" },
      { label: "使用 Agent 或语音", detail: "长任务可交给 Agent 面板，必要时启用 Subagents；配置实时语音后也能直接说话控制工作台。" },
      { label: "沉淀整个过程", detail: "会话、素材、引用、历史记录和分享链接都会留下，方便之后继续同一个项目。" }
    ],
    projectUseCasesTitle: "可以用来",
    projectUseCases: ["拆一个想法", "读资料找方向", "做视觉参考板", "生成和改图", "保存项目过程"],
    openWorkbench: "进入工作台",
    openHistory: "查看历史记录",
    sectionLabel: "跳转目录",
    flowTitle: "基本流程",
    flow: ["直接提问、上传或粘贴链接", "让 AI 生成或分析卡片", "需要聚焦时再双击卡片", "追问、生成或局部改图", "保存 / 分享 / 回看"],
    commandsTitle: "/ 命令菜单",
    privacyTitle: "公开 demo 说明",
    privacy: "历史记录和素材库按浏览器匿名 cookie 隔离；清理 cookie 可能会失去原来的匿名身份。"
  };
}
function UserGuidePage() {
  const { lang } = useI18n();
  const [navOpen, setNavOpen] = reactExports.useState(false);
  const copy = reactExports.useMemo(() => contentFor(lang), [lang]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:285:5", className: "min-h-screen bg-cabinet-bg p-3 text-cabinet-ink md:p-7", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(AppNavigation, { "code-path": "src/components/guide/UserGuidePage.tsx:286:7", activePage: "guide", open: navOpen, onClose: () => setNavOpen(false) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { "code-path": "src/components/guide/UserGuidePage.tsx:287:7", className: "mx-auto min-h-[calc(100vh-1.5rem)] max-w-[1180px] overflow-hidden rounded-[18px] border border-cabinet-border bg-cabinet-paper shadow-[0_22px_48px_rgba(0,0,0,0.08)] md:min-h-[calc(100vh-3.5rem)]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { "code-path": "src/components/guide/UserGuidePage.tsx:288:9", className: "flex h-16 items-center gap-4 border-b border-cabinet-border px-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            "code-path": "src/components/guide/UserGuidePage.tsx:289:11",
            type: "button",
            onClick: () => setNavOpen(true),
            className: "flex h-10 w-10 items-center justify-center rounded hover:bg-cabinet-itemBg",
            "aria-label": lang === "en" ? "Open navigation" : "打开导航",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Menu, { "code-path": "src/components/guide/UserGuidePage.tsx:295:13", size: 20 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:297:11", className: "min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:298:13", className: "text-xs text-cabinet-inkMuted", children: copy.kicker }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { "code-path": "src/components/guide/UserGuidePage.tsx:299:13", className: "truncate text-xl font-medium tracking-[0]", children: copy.title })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:303:9", className: "grid gap-0 lg:grid-cols-[280px_1fr]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { "code-path": "src/components/guide/UserGuidePage.tsx:304:11", className: "border-b border-cabinet-border bg-cabinet-itemBg p-5 lg:border-b-0 lg:border-r", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:305:13", className: "rounded-[16px] bg-cabinet-paper p-5 shadow-sm ring-1 ring-cabinet-border", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:306:15", className: "flex h-11 w-11 items-center justify-center rounded-full bg-cabinet-blue text-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { "code-path": "src/components/guide/UserGuidePage.tsx:307:17", size: 20 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/guide/UserGuidePage.tsx:309:15", className: "mt-4 text-sm leading-6 text-cabinet-inkMuted", children: copy.intro }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:310:15", className: "mt-5 grid gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { "code-path": "src/components/guide/UserGuidePage.tsx:311:17", href: "/app.html", className: "flex h-10 items-center justify-between rounded-full bg-cabinet-blue px-4 text-sm font-medium text-cabinet-paper hover:bg-cabinet-cyan", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/guide/UserGuidePage.tsx:312:19", children: copy.openWorkbench }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { "code-path": "src/components/guide/UserGuidePage.tsx:313:19", size: 16 })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { "code-path": "src/components/guide/UserGuidePage.tsx:315:17", href: "/history/", className: "flex h-10 items-center justify-between rounded-full border border-cabinet-border px-4 text-sm hover:bg-cabinet-bg", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/guide/UserGuidePage.tsx:316:19", children: copy.openHistory }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { "code-path": "src/components/guide/UserGuidePage.tsx:317:19", size: 16 })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:322:13", className: "mt-5 rounded-[16px] border border-cabinet-border bg-cabinet-paper p-5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/guide/UserGuidePage.tsx:323:15", className: "text-sm font-medium", children: copy.flowTitle }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:324:15", className: "mt-4 grid gap-3", children: copy.flow.map((item, index2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:326:19", className: "grid grid-cols-[28px_1fr] items-center gap-3 text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/guide/UserGuidePage.tsx:327:21", className: "flex h-7 w-7 items-center justify-center rounded-full bg-cabinet-bg text-xs font-medium text-cabinet-inkMuted", children: index2 + 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/guide/UserGuidePage.tsx:328:21", children: item })
            ] }, item)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("nav", { "code-path": "src/components/guide/UserGuidePage.tsx:334:13", className: "mt-5 rounded-[16px] border border-cabinet-border bg-cabinet-paper p-5", "aria-label": copy.sectionLabel, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/guide/UserGuidePage.tsx:335:15", className: "text-sm font-medium", children: copy.sectionLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:336:15", className: "mt-3 grid gap-1", children: copy.sections.map((section) => /* @__PURE__ */ jsxRuntimeExports.jsx("a", { "code-path": "src/components/guide/UserGuidePage.tsx:338:19", href: `#${section.id}`, className: "rounded px-2 py-2 text-sm text-cabinet-inkMuted hover:bg-cabinet-bg hover:text-cabinet-ink", children: section.title }, section.id)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "code-path": "src/components/guide/UserGuidePage.tsx:346:11", className: "p-5 md:p-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { "code-path": "src/components/guide/UserGuidePage.tsx:347:13", className: "mb-5 rounded-[18px] border border-cabinet-border bg-cabinet-itemBg p-5 shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:348:15", className: "flex items-start gap-4", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:349:17", className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cabinet-blue text-cabinet-paper", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BookOpen, { "code-path": "src/components/guide/UserGuidePage.tsx:350:19", size: 20 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:352:17", className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/guide/UserGuidePage.tsx:353:19", className: "text-xl font-medium tracking-[0]", children: copy.projectTitle }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/guide/UserGuidePage.tsx:354:19", className: "mt-2 max-w-3xl text-sm leading-6 text-cabinet-inkMuted", children: copy.projectIntro })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:357:15", className: "mt-5 grid gap-3 md:grid-cols-2", children: copy.projectFeatures.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:359:19", className: "rounded-[14px] bg-cabinet-paper p-4 ring-1 ring-cabinet-border", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { "code-path": "src/components/guide/UserGuidePage.tsx:360:21", className: "text-sm font-medium", children: item.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/guide/UserGuidePage.tsx:361:21", className: "mt-2 text-sm leading-6 text-cabinet-inkMuted", children: item.detail })
            ] }, item.label)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:365:15", className: "mt-5 flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/guide/UserGuidePage.tsx:366:17", className: "text-sm font-medium text-cabinet-inkMuted", children: copy.projectUseCasesTitle }),
              copy.projectUseCases.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "code-path": "src/components/guide/UserGuidePage.tsx:368:19", className: "rounded-full bg-cabinet-paper px-3 py-1 text-xs text-cabinet-inkMuted ring-1 ring-cabinet-border", children: item }, item))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:373:13", className: "grid gap-4 md:grid-cols-2", children: copy.sections.map((section) => /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { "code-path": "src/components/guide/UserGuidePage.tsx:375:17", id: section.id, className: "scroll-mt-8 rounded-[18px] border border-cabinet-border bg-cabinet-paper p-5 shadow-sm", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:376:19", className: "flex items-center gap-3 border-b border-cabinet-border pb-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:377:21", className: "flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-itemBg text-cabinet-blue ring-1 ring-cabinet-border", children: section.icon }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/guide/UserGuidePage.tsx:380:21", className: "text-lg font-medium tracking-[0]", children: section.title })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("dl", { "code-path": "src/components/guide/UserGuidePage.tsx:382:19", className: "mt-4 grid gap-3", children: section.items.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:384:23", className: "grid gap-1 border-b border-cabinet-border/70 pb-3 last:border-b-0 last:pb-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { "code-path": "src/components/guide/UserGuidePage.tsx:385:25", className: "text-sm font-medium", children: item.action }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { "code-path": "src/components/guide/UserGuidePage.tsx:386:25", className: "text-sm leading-6 text-cabinet-inkMuted", children: item.detail })
            ] }, `${section.id}-${item.action}`)) })
          ] }, section.id)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:394:13", className: "mt-5 grid gap-5 lg:grid-cols-[1fr_320px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { "code-path": "src/components/guide/UserGuidePage.tsx:395:15", className: "rounded-[18px] border border-cabinet-border bg-cabinet-itemBg p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:396:17", className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:397:19", className: "flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-paper text-cabinet-blue ring-1 ring-cabinet-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Keyboard, { "code-path": "src/components/guide/UserGuidePage.tsx:398:21", size: 20 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/guide/UserGuidePage.tsx:400:19", className: "text-lg font-medium tracking-[0]", children: copy.commandsTitle })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:402:17", className: "mt-4 grid gap-2 sm:grid-cols-2", children: copy.commands.map((row) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:404:21", className: "rounded-[12px] bg-cabinet-paper p-3 ring-1 ring-cabinet-border", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("code", { "code-path": "src/components/guide/UserGuidePage.tsx:405:23", className: "text-sm font-medium text-cabinet-blue", children: row.command }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/guide/UserGuidePage.tsx:406:23", className: "mt-1 text-xs leading-5 text-cabinet-inkMuted", children: row.detail })
              ] }, row.command)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { "code-path": "src/components/guide/UserGuidePage.tsx:412:15", className: "rounded-[18px] border border-cabinet-border bg-cabinet-paper p-5", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "code-path": "src/components/guide/UserGuidePage.tsx:413:17", className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "code-path": "src/components/guide/UserGuidePage.tsx:414:19", className: "flex h-10 w-10 items-center justify-center rounded-full bg-cabinet-itemBg text-cabinet-blue ring-1 ring-cabinet-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { "code-path": "src/components/guide/UserGuidePage.tsx:415:21", size: 20 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { "code-path": "src/components/guide/UserGuidePage.tsx:417:19", className: "text-lg font-medium tracking-[0]", children: copy.privacyTitle })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { "code-path": "src/components/guide/UserGuidePage.tsx:419:17", className: "mt-4 text-sm leading-6 text-cabinet-inkMuted", children: copy.privacy })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function getCurrentView() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (view === "settings") return "settings";
  if (view === "library") return "library";
  if (view === "guide") return "guide";
  return "history";
}
function App() {
  const view = getCurrentView();
  reactExports.useEffect(() => {
    document.title = view === "settings" ? "织境 / 设置" : view === "library" ? "织境 / 素材库" : view === "guide" ? "织境 / 使用介绍" : "织境 / 历史记录";
  }, [view]);
  if (view === "settings") return /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsPage, { "code-path": "src/App.tsx:27:35" });
  if (view === "library") return /* @__PURE__ */ jsxRuntimeExports.jsx(MaterialLibraryPage, { "code-path": "src/App.tsx:28:34" });
  if (view === "guide") return /* @__PURE__ */ jsxRuntimeExports.jsx(UserGuidePage, { "code-path": "src/App.tsx:29:32" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(FileCabinet, { "code-path": "src/App.tsx:30:10" });
}
const savedLang = localStorage.getItem("thoughtgrid-lang") ?? localStorage.getItem("oryzae-lang");
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { "code-path": "src/main.tsx:11:3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BrowserRouter, { "code-path": "src/main.tsx:12:5", children: /* @__PURE__ */ jsxRuntimeExports.jsx(I18nProvider, { "code-path": "src/main.tsx:13:7", initialLang: savedLang || "zh", children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, { "code-path": "src/main.tsx:14:9" }) }) }) })
);
