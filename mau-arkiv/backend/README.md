# MAU Arkiv Backend

# Express Application

This is the Express application that serves as the backend for the MAU Arkiv application. It is responsible for handling API requests and serving the frontend application.

## Project Structure

- **src/**: Contains the source code for the Express application.
  - **app.ts**: Entry point of the application, initializes the Express app and sets up middleware.
  - **routes/**: Contains route definitions.
    - **index.ts**: Defines the routes for the application.
  - **controllers/**: Contains the logic for handling requests.
    - **index.ts**: Contains the main controller for the application.

- **public/**: Directory for static files, including the built Angular application.

## Getting Started

1. **Install Dependencies**: Navigate to the `backend` directory and run:
   ```
   npm install
   ```

2. **Run the Application**: Start the Express server by running:
   ```
   npm start
   ```

   To run the application in _dev_ mode run:
   ```
   npm run dev
   ```

3. **Build Frontend Application**: Navigate to the `frontend` directory and run:
   ```
   npm run build
   ```
   This will build the frontend application and copy the output to the `backend/public` directory.

## API Endpoints

- **GET /api/**: Serves the main page of the application.

## Logging

The application includes a comprehensive logging system built with Winston that supports:

- **Multiple outputs**: Console, file (with daily rotation), and database logging
- **Configurable log levels**: Error, warn, info, http, verbose, debug, silly
- **HTTP request/response logging**: Automatic logging of all API requests
- **Structured logging**: JSON and human-readable formats
- **Error handling**: Automatic logging of uncaught exceptions

### Configuration

Copy the `.env.example` file to `.env` and configure logging options:

```bash
cp .env.example .env
```

Key logging environment variables:
- `LOG_LEVEL`: Set log level (default: info)
- `LOG_CONSOLE_ENABLED`: Enable console output (default: true)
- `LOG_FILE_ENABLED`: Enable file logging (default: true)
- `LOG_DATABASE_ENABLED`: Enable database logging (default: false)

### Testing Logging

Test the logging system:

```bash
npm run test:logging
```

For detailed logging documentation, see [LOGGING.md](./LOGGING.md).

## Dependencies

Here a short description of any module used and its purpose is given:

- **hjson**: used to parse h-json (human json)
- **winston**: comprehensive logging library
- **winston-daily-rotate-file**: daily log file rotation
- **dotenv**: environment variables support
- **cors**: cross-origin resource sharing
- **express**: web application framework

## License

This project is licensed under the GPLv2 License.
