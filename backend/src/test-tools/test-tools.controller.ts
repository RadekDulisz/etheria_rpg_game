import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ExecuteTestToolDto } from './dto/execute-test-tool.dto';
import { TestAccountGuard } from './test-account.guard';
import { TestToolsService } from './test-tools.service';

@Controller('test-tools')
@UseGuards(JwtAuthGuard, TestAccountGuard)
export class TestToolsController {
  constructor(private readonly testToolsService: TestToolsService) {}

  @Post('execute')
  execute(@CurrentUser() user: JwtPayload, @Body() dto: ExecuteTestToolDto) {
    return this.testToolsService.execute(user.sub, dto);
  }
}
