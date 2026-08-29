import { Module } from "@nestjs/common";
import { InquiriesController } from "./inquiries.controller.js";
import { InquiriesService } from "./inquiries.service.js";
import { UploadModule } from "../upload/upload.module.js";

@Module({
  imports: [UploadModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
