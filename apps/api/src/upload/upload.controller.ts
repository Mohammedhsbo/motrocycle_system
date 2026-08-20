import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RequirePermission } from "../auth/decorators/permissions.decorator.js";
import { Resource, Action } from "@motorcycle-system/shared-types";
import { StorageService } from "./storage.service.js";
import 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller("v1/upload")
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @RequirePermission(Resource.MOTORCYCLE, Action.CREATE)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpeg|jpg|png|webp)$/i,
        })
        .addMaxSizeValidator({
          maxSize: MAX_FILE_SIZE,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY, // 422
          fileIsRequired: true,
        })
    )
    file: Express.Multer.File
  ) {
    const result = await this.storageService.uploadFile(file);
    return {
      success: true,
      data: {
        url: result.url,
        filename: result.filename,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }
}
