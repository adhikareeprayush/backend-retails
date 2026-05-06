import winston from "winston";
import path from "path";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define log level based on environment
const level = process.env.NODE_ENV === "production" ? "info" : "debug";

const useFileLogs =
  process.env.VERCEL !== "1" &&
  process.env.NODE_ENV !== "test";

const transports = [
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === "production"
        ? winston.format.simple()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: "YYYY-MM-DD HH:mm:ss",
            }),
            winston.format.printf(
              ({ timestamp, level, message, ...meta }) => {
                return `${timestamp} ${level}: ${message} ${
                  Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
                }`;
              }
            )
          ),
  }),
];

if (useFileLogs) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level,
  format: logFormat,
  transports,
  exceptionHandlers: useFileLogs
    ? [new winston.transports.File({ filename: "logs/exceptions.log" })]
    : [],
  exitOnError: false,
});

export default logger;
