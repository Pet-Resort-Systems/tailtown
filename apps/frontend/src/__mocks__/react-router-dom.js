/**
 * Mock for react-router-dom v7 (ESM module)
 * Jest has trouble resolving ESM-only modules, so we provide a mock
 */

const React = require("react");

module.exports = {
  BrowserRouter: ({ children }) =>
    React.createElement("div", { "data-testid": "browser-router" }, children),
  Routes: ({ children }) =>
    React.createElement("div", { "data-testid": "routes" }, children),
  Route: ({ element }) => element || null,
  Navigate: () => null,
  Link: ({ children, to }) => React.createElement("a", { href: to }, children),
  NavLink: ({ children, to }) =>
    React.createElement("a", { href: to }, children),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/", search: "", hash: "", state: null }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useMatch: () => null,
  Outlet: () => null,
  useOutletContext: () => ({}),
};
