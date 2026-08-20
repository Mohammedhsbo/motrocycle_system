import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  Action,
  createBrandRequestSchema,
  listBrandsQuerySchema,
  Resource,
  updateBrandRequestSchema,
  type CreateBrandRequest,
  type ListBrandsQuery,
  type UpdateBrandRequest,
} from "@motorcycle-system/shared-types";
import { RequirePermission } from "../auth/decorators/permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import { BrandsService } from "./brands.service.js";

@Controller("brands")
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.CREATE)
  async create(
    @Body(new ZodValidationPipe(createBrandRequestSchema)) body: CreateBrandRequest,
    @Req() request: any,
  ) {
    return {
      success: true,
      data: await this.brandsService.create(body, request.user),
    };
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(listBrandsQuerySchema)) query: ListBrandsQuery,
    @Req() request: any,
  ) {
    // Public endpoint - no authentication required
    const user = request.user || null;
    return {
      success: true,
      data: await this.brandsService.list(query, user),
    };
  }

  @Get(":id")
  async getById(@Param("id", ParseUUIDPipe) id: string, @Req() request: any) {
    // Public endpoint - no authentication required
    const user = request.user || null;
    return {
      success: true,
      data: await this.brandsService.getById(id, user),
    };
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.UPDATE)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBrandRequestSchema)) body: UpdateBrandRequest,
    @Req() request: any,
  ) {
    return {
      success: true,
      data: await this.brandsService.update(id, body, request.user),
    };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.DELETE)
  async delete(@Param("id", ParseUUIDPipe) id: string, @Req() request: any) {
    await this.brandsService.delete(id, request.user);

    return {
      success: true,
      data: null,
    };
  }
}