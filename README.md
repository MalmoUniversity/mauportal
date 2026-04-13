# MAU Arkiv Application

This project is a full-stack application that consists of an Express backend, an Angular frontend and a shared package. These three parts are organized into separate directories for better maintainability and clarity.

Also in the pre-build directory a "mau-arkiv" application directory is provided. Move the entire directory to /opt/mau, and follow relevant parts in the manual.

Currently two releases are published - version 1.0.3 that handles XSL transformation in frontend and version 2.0.0 that handles XSL transformation in backend with xsltproc (that needs to be installed on your system).

## Project Structure

```
mau-arkiv
├── backend              # Contains the Express application
│   ├── src              # Source files for the Express app
│   │   ├── app.ts       # Entry point of the Express application
│   │   ├── routes       # Directory for route definitions
│   │   │   └── index.ts # Route definitions
│   │   └── controllers   # Directory for controllers
│   │       └── index.ts # Controller for handling requests
│   ├── public           # Directory for static files served by Express
│   ├── package.json     # Configuration for the Express app
│   ├── tsconfig.json    # TypeScript configuration for the Express app
│   └── README.md        # Documentation for the Express app
├── frontend             # Contains the Angular application
│   ├── src              # Source files for the Angular app
│   │   ├── app          # Main Angular component
│   │   │   └── app.component.ts # Main component logic
│   │   └── index.html   # Main HTML file for the Angular app
│   ├── angular.json     # Configuration for the Angular CLI
│   ├── package.json     # Configuration for the Angular app
│   └── README.md        # Documentation for the Angular app
└── README.md            # Overview of the full-stack application
├── shared               # Contains shared code (models, utilities, etc.) used by both backend and frontend
│   ├── dtos             # Shared data models
│   ├── utils            # Shared utility functions
│   ├── package.json     # Configuration for the shared package
│   └── README.md        # Documentation for the shared package
```

## Getting Started

### Prerequisites

- Node.js and npm installed on your machine.

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd mau-arkiv
   ```

2. Install dependencies for all the packages, shared, backend and frontend:
   ```
   npm install
   ```

### Building the frontend Application

To build the Angular application (frontend) and copy the output to the Express app's public directory, run the following command from the `backend` directory:

```
npm run build
```

This command will build the Angular app and copy the built files to `backend/public`.

### Running the Application

1. Start the Express server:
   ```
   cd backend
   npm start
   ```

2. The Angular application will be served from the Express server. You can access it at `http://localhost:3000` (or the port specified in your Express app).

## License

This project is licensed under the GPLv3 License. See the LICENSE file for details.
