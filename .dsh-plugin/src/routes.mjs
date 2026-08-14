// 路由前缀单一来源（client 与 Node half 的 HTTP 端点共用同一前缀——改前缀只改这里）。
// 零依赖纯常量：client（构建时内联）与 Node half 都可 import。
export const ROUTE_PREFIX = '/answer-pet'
export const STATE_PATH = `${ROUTE_PREFIX}/state`
export const EVENTS_PATH = `${ROUTE_PREFIX}/events`
export const CONFIG_PATH = `${ROUTE_PREFIX}/config`
