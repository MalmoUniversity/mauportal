# MAU Arkiv Frontend Application



This Angular application is part of a MAU Arkiv project that works in conjunction with an Express backend. This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.2.0.

## Getting Started

To get started with the Angular application, follow these steps:

1. **Install Dependencies**: 
   Navigate to the `frontend` directory and run:
   ```
   npm install
   ```

2. **Development Server**: 
   If you want to run the application  seperately from the backend in development mode, use:
   ```
   ng serve
   ```
   
   Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

3. **Build for Production**: 
   To build the application for production, in `backend` folder run:
   ```
   npm run build
   ```
   
   This will compile the application and copy the output to the _backend_ app's public directory.

## Project Structure

- `src/app`: Contains the main application components.
- `src/index.html`: The main HTML file for the Angular application.
- `angular.json`: Configuration settings for the Angular CLI.
- `package.json`: Contains scripts and dependencies for the Angular application.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Angular Material
We are using Angular Materials as UI Component library.

## Additional Information

For more details on Angular, visit the [Angular documentation](https://angular.io/docs). 

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

This README provides a brief overview of the Frontend application and its setup. For information regarding the Backend, refer to the `backend/README.md`.

For more information about Angular Material visit the [Angular Material Website](https://material.angular.dev/).