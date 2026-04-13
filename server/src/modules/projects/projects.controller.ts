import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/request-context.type';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: QueryProjectsDto) {
    return this.projectsService.list(user.userId, query.status);
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() payload: CreateProjectDto) {
    return this.projectsService.create(user.userId, payload);
  }

  @Get(':projectId')
  async getById(@CurrentUser() user: AuthUser, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.getById(user.userId, projectId);
  }

  @Put(':projectId')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() payload: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.userId, projectId, payload);
  }

  @Patch(':projectId/status')
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() payload: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(user.userId, projectId, payload.status);
  }

  @Get(':projectId/detail')
  async getDetail(@CurrentUser() user: AuthUser, @Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectsService.getDetail(user.userId, projectId);
  }
}
