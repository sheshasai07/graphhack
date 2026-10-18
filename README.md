# FalkorDB Knowledge Graph UI

An interactive graphical dashboard and visual explorer for **FalkorDB**, designed for visualizing, querying, and navigating complex property graphs and Knowledge Graph / GraphRAG architectures.

---

## ⚡ Important Note on Live Demo Load

> **⚠️ Cold Start Delay (50–60 seconds)**
>
> The live backend instance is deployed on **Render**. Due to free-tier inactivity sleep:
> 
> 1. Launch the live demo.
> 2. Wait **1 minute** and **refresh the page**.
> 3. Verify that the **`API LIVE`** / **`FALKOR DB ACTIVE`** status banner in the top-middle header lights up **GREEN** before sending queries.

---

## ✨ Features

- 🔍 **Interactive Graph Explorer**: Visualize nodes and edge relationships seamlessly.
- 🧊 **3D Graph View**: Navigate multi-hop subgraphs and dense networks without screen clutter.
- ⚡ **Cypher Query Console**: Run raw Cypher queries directly with inline syntax highlighting.
- ☁️ **Cloud Native**: Easily connect to local Docker containers or hosted FalkorDB Cloud instances.

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** (v18.x or higher)
- **npm** or **yarn**
- Running **FalkorDB** instance (local Docker or FalkorDB Cloud)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone [https://github.com/your-username/falkordb-ui.git](https://github.com/your-username/falkordb-ui.git)
cd falkordb-ui
npm install
npm build
npm run dev


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.



