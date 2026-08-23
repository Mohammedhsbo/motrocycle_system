import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Action, Resource } from "@motorcycle-system/shared-types";
import { RequirePermission } from "../auth/decorators/permissions.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import {
  createBranchRequestSchema,
  listBranchesQuerySchema,
  type CreateBranchRequest,
  type ListBranchesQuery,
  type UpdateBranchRequest,
  updateBranchRequestSchema,
} from "@motorcycle-system/shared-types";
import { BranchesService } from "./branches.service.js";

@Controller("branches")
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(@Inject(BranchesService) private readonly branchesService: BranchesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Resource.BRANCH, Action.CREATE)
  async create(
    @Body(new ZodValidationPipe(createBranchRequestSchema)) body: CreateBranchRequest,
    @Req() request: any,
  ) {
    return {
      success: true,
      data: await this.branchesService.create(body, request.user),
    };
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Resource.BRANCH, Action.READ)
  async list(@Query(new ZodValidationPipe(listBranchesQuerySchema)) query: ListBranchesQuery) {
    return {
      success: true,
      data: await this.branchesService.list(query),
    };
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Resource.BRANCH, Action.READ)
  async getById(@Param("id", ParseUUIDPipe) id: string) {
    return {
      success: true,
      data: await this.branchesService.getById(id),
    };
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Resource.BRANCH, Action.UPDATE)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBranchRequestSchema)) body: UpdateBranchRequest,
    @Req() request: any,
  ) {
    return {
      success: true,
      data: await this.branchesService.update(id, body, request.user),
    };
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermission(Resource.BRANCH, Action.DELETE)
  async delete(@Param("id", ParseUUIDPipe) id: string, @Req() request: any) {
    await this.branchesService.delete(id, request.user);

    return {
      success: true,
      data: null,
    };
  }
}
