import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateDisplayNameDto } from './update-display-name.dto';

describe('UpdateDisplayNameDto', () => {
  it('passes validation for a normal display name', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, { displayName: 'Jane Doe' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('passes validation for a display name exactly 100 characters long', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, {
      displayName: 'a'.repeat(100),
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation for an empty display name', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, { displayName: '' });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('fails validation for a display name over 100 characters', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, {
      displayName: 'a'.repeat(101),
    });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('passes validation for a display name exactly 2 characters long', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, { displayName: 'Jo' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation for a display name under 2 characters', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, { displayName: 'J' });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('fails validation for a non-string display name', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, { displayName: 123 });

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('fails validation when displayName is missing', async () => {
    const dto = plainToInstance(UpdateDisplayNameDto, {});

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });
});
