

# Tada: Interactive Data Analysis Chat App

Tada is a web application that allows users to upload CSV or Excel files and interact with their data using natural language. It leverages the Groq API to understand user queries, perform data analysis, and generate insightful visualizations and summaries.

## ✨ Features

- **File Upload**: Supports CSV and Excel file formats with a user-friendly drag-and-drop interface.
- **Natural Language Chat**: Ask questions about your data in plain English.
- **Rich Visualizations**: Generates various charts (Bar, Pie, Line, Scatter, Treemap, Bubble, Box Plot) powered by Recharts.
- **Interactive Dashboard**:
    - **Pin to Dashboard**: Pin any chart or table from the chat to a persistent dashboard.
    - **Customizable Layout**: Freely drag, drop, and resize widgets on a grid-based canvas to create custom layouts.
    - **Editable Widgets**: Edit widget titles directly on the dashboard.
    - **Export**: Export the entire dashboard as a high-quality PNG or PDF for sharing and reporting.
- **Data Tables**: Displays data in interactive tables with sorting, filtering, and pagination.
- **Automated Data Profiling**: On load, the app automatically analyzes the dataset to provide column-level statistics, identify data types (numeric/categorical), and flag quality issues.
- **Smart Data Cleaning**: Interactively fix missing values through a simple UI with common strategies (mean, median, mode). For other issues, the AI suggests and applies JavaScript code fixes.
- **Context-Aware Analysis**: Users can provide descriptions for the dataset and columns to improve the accuracy of AI-generated insights.
- **Code Transparency**: Shows the generated Python and SQL code alongside the analysis results, making it a great learning tool.
- **Suggested Questions**: The AI suggests relevant follow-up questions to guide the user's analysis.

## 🚀 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI Engine**: Groq API
- **Charting**: Recharts
- **Dashboard Layout**: React Grid Layout
- **Data Parsing**: PapaParse (for CSV), SheetJS (for Excel)
- **Interactive Tables**: TanStack Table
- **Dependencies**: Loaded via ES Modules and an `importmap` in `index.html`. No build step or `npm install` is required for this setup.

---

## 📁 File Structure & Documentation

This project is organized into components, services, and core application files.

### Core Files

- **`index.html`**: The main entry point of the application. It sets up the HTML document, includes Tailwind CSS, loads the Babel transpiler for in-browser JSX, and defines the `importmap` for browser-native ES module imports.
- **`index.tsx`**: The root of the React application. It uses `createRoot` to render the main `App` component into the DOM.
- **`App.tsx`**: The top-level component that manages the application's overall state and workflow. It orchestrates the transitions between file uploading, context input, and the main viewing area, which includes the Chat and Dashboard tabs. It handles all primary user interactions and service calls.
- **`metadata.json`**: Configuration file for the hosting environment, containing the app's name and description.
- **`types.ts`**: Defines all shared TypeScript types and interfaces used across the application, such as `Message`, `AnalysisResult`, `DashboardWidget`, and `DataProfile`. This ensures type safety and consistency.

### Components (`./components/`)

- **`FileUpload.tsx`**: The initial landing page component for uploading data.
- **`DataContextForm.tsx`**: A form displayed after a file is uploaded to provide optional context about the data.
- **`ChatInterface.tsx`**: The main chat view. It displays the conversation, provides a text input for user queries, and shows AI-suggested questions.
- **`Dashboard.tsx`**: The main dashboard view. It uses `react-grid-layout` to create a customizable canvas for pinned widgets and includes controls for exporting the dashboard.
- **`DashboardWidget.tsx`**: Renders a single resizable and draggable widget on the dashboard, containing a chart or table, an editable title, and a delete button.
- **`Message.tsx`**: Renders a single message in the chat list.
- **`ResultRenderer.tsx`**: A critical component that renders AI-generated content (tables, charts, etc.) and includes the "Pin to Dashboard" button. It also manages the tabbed view for `Answer`, `Python`, and `SQL` code.
- **`TableRenderer.tsx`**: Renders data in a feature-rich table using `@tanstack/react-table`.
- **`ChartRenderer.tsx`**: Uses `recharts` to render all supported chart types and includes a "Copy as Image" feature.
- **`ProfileRenderer.tsx`**: Renders the comprehensive data profile report and data quality alerts.
- **`MissingValueFixer.tsx`**: A modal component for interactively fixing missing data.
- **`CodeBlock.tsx`**: A component for displaying formatted code with a "Copy" button.
- **`MarkdownRenderer.tsx`**: A lightweight renderer for AI-generated summaries.
- **`AIMessageSkeleton.tsx`**: A loading state placeholder for AI responses.
- **`ActionButtons.tsx`**: Renders contextual action buttons, like "Export as CSV".
- **`icons.tsx`**: A library of all SVG icons used in the application.

### Services (`./services/`)

- **`groqService.ts`**: The engine of the application, responsible for all communication with the Groq API (generating code, questions, classifications, and cleaning suggestions).
- **`executionService.ts`**: Executes the untrusted JavaScript code received from the Groq API in a sandboxed environment with a timeout.
- **`profilingService.ts`**: Performs client-side data analysis to generate the initial data profile.

---

## ⚙️ Application Workflow

1.  **Upload**: The user uploads a CSV or Excel file on the `FileUpload` screen.
2.  **Context (Optional)**: The user provides optional descriptions for the data in the `DataContextForm`.
3.  **Initial Analysis**: The app automatically creates and displays a detailed data profile in the Chat view.
4.  **Interaction**: The user can now switch between two main views:
    - **Chat**: Ask questions in natural language. When a chart or table is generated, a "Pin" button appears.
    - **Dashboard**: View all pinned items. Users can arrange, resize, and edit widgets on the canvas.
5.  **Query Handling**: In the chat, when a user sends a message:
    - `App.tsx` calls `groqService` to get executable JavaScript code.
    - `executionService` runs the code to produce a result.
    - The result is displayed as a new AI message.
6.  **Pinning**: Clicking the "Pin" button on a result adds it as a new widget to the `Dashboard`.
7.  **Dashboard Management**: Users can customize their dashboard layout, which is saved in the app's state, and export the final view as an image or PDF.
