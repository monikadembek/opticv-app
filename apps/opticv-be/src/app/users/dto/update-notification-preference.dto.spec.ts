import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateNotificationPreferenceDto } from './update-notification-preference.dto';

describe('UpdateNotificationPreferenceDto', () => {
  it('passes validation for PRODUCT_UPDATES', async () => {
    const dto = plainToInstance(UpdateNotificationPreferenceDto, {
      type: 'PRODUCT_UPDATES',
      enabled: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation for WEEKLY_TIPS', async () => {
    const dto = plainToInstance(UpdateNotificationPreferenceDto, {
      type: 'WEEKLY_TIPS',
      enabled: false,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation for an invalid type', async () => {
    const dto = plainToInstance(UpdateNotificationPreferenceDto, {
      type: 'BOGUS',
      enabled: true,
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors.find((e) => e.property === 'type')?.constraints).toHaveProperty(
      'isIn',
    );
  });

  it('fails validation for a non-boolean enabled value', async () => {
    const dto = plainToInstance(UpdateNotificationPreferenceDto, {
      type: 'PRODUCT_UPDATES',
      enabled: 'yes',
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(
      errors.find((e) => e.property === 'enabled')?.constraints,
    ).toHaveProperty('isBoolean');
  });

  it('fails validation when type is missing', async () => {
    const dto = plainToInstance(UpdateNotificationPreferenceDto, {
      enabled: true,
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors.find((e) => e.property === 'type')?.constraints).toHaveProperty(
      'isIn',
    );
  });
});
