import { AggregationInterval } from '@enocean/common';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

export class GetDeviceSensorAggregateQuery {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  from!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  to!: number;

  @IsEnum(AggregationInterval)
  interval!: AggregationInterval;
}

export class GetDeviceSensorAggregateItem {
  ts!: number;
  min!: number;
  max!: number;
  avg!: number;
  count!: number;
}
