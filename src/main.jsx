import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            background: "#fff5f2",
            color: "#7a2e1d",
            fontFamily: "Segoe UI, sans-serif",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Runtime error</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              padding: 16,
              borderRadius: 12,
              background: "#fff",
              border: "1px solid rgba(122, 46, 29, 0.18)",
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
