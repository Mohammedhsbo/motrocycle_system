import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof AppError) {
      return response.status(exception.statusCode).json({
        success: false,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      });
    }

    if (exception instanceof ZodError) {
      return response.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Validation failed",
          details: exception.flatten(),
        },
      });
    }

    if (exception instanceof BadRequestException) {
      return response.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Validation failed",
          details: exception.getResponse(),
        },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return response.status(status).json({
        success: false,
        error: {
          code: status === HttpStatus.FORBIDDEN ? "FORBIDDEN" : exception.name,
          message: exception.message,
        },
      });
    }

    console.error(exception);
    return response.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
}
