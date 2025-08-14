import winston from "winston";
import path from 'path';
import fs from 'fs';

const timezoned = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Toronto",
  });
};

const myFormat = winston.format.printf(
  ({ level, message, label, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message}${Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : ""}`;
  },
);

export const getLogger = (modulePath) => {
  const logDir = path.join(process.cwd(), "logs", ...modulePath.split("/"));

  // Ensure directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  return winston.createLogger({
    level: process.env.NODE_ENV !== "production" ? "debug" : "info", // Log levels: error, warn, info, http, verbose, debug, silly
    format: winston.format.combine(
      winston.format.timestamp({ format: timezoned }),
      winston.format.errors({ stack: true }), // Log full stack trace
      myFormat,
      // winston.format.json() // JSON format for better parsing
    ),
    transports: [
      // only Logs to console if NODE_ENV is not production
      ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console(),
      ] : []),
      new winston.transports.File({
        filename: path.join(logDir, "error.log"),
        level: 'error',
      }), // Logs error and above
      new winston.transports.File({ filename: path.join(logDir, "combined.log") }), // Logs debug and above
    ],
  });
};
