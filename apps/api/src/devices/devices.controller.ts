import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';

import { DevicesService } from './devices.service';
import { GetDeviceHistoryQuery, GetDeviceHistoryResponse } from './dto/get-device-history.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get(':deviceId/history')
  async getDeviceHistory(
    @Param('deviceId') deviceId: string,
    @Query() query: GetDeviceHistoryQuery,
  ): Promise<GetDeviceHistoryResponse> {
    if (query.from !== undefined && query.to !== undefined && query.from > query.to) {
      throw new BadRequestException('from must be less than or equal to to');
    }

    return this.devicesService.getDeviceHistory(deviceId, query);
  }
}
