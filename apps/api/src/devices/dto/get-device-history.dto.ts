import { DeviceHistoryDoc } from '@enocean/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetDeviceHistoryQuery {
  @IsOptional()
  @IsString()
  sensor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  to?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}

export class GetDeviceHistoryResponse {
  data!: DeviceHistoryDoc[];
  total!: number;
  page!: number;
  limit!: number;
}
