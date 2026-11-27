import { validate } from 'class-validator';
import { plainToInstance, instanceToPlain } from 'class-transformer';
import {
  CreateManualCvRequestDto,
  CvStructuredDataRequestDto,
  RenameCvDto,
} from './cv-request.dto';

const validPayload = {
  contact: {
    name: 'Jane Doe',
    position: 'Software Engineer',
    email: 'jane@example.com',
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  },
  summary: 'Experienced engineer',
  experience: [
    {
      title: 'Senior Frontend Engineer',
      company: 'Acme Corp',
      location: null,
      startDate: '2021-03',
      endDate: null,
      current: true,
      bullets: ['Led migration to Angular 17'],
    },
  ],
  education: [
    {
      degree: 'B.Sc. Computer Science',
      institution: 'Warsaw University of Technology',
      location: null,
      startDate: '2015-10',
      endDate: '2019-06',
      field: 'Computer Science',
    },
  ],
  skills: ['TypeScript', 'Angular'],
  certifications: [
    {
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      date: '2023-05',
    },
  ],
  projects: [
    {
      name: 'OptiCV',
      description: 'AI-powered CV optimizer',
      technologies: ['Angular', 'NestJS'],
      url: 'https://opticv.app',
    },
  ],
  languages: [{ language: 'English', proficiency: 'C1' }],
  other: null,
  gdprClause: null,
};

describe('CvStructuredDataRequestDto', () => {
  it('passes validation for a fully populated payload', async () => {
    const dto = plainToInstance(CvStructuredDataRequestDto, validPayload);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('retains all fields after transform (whitelist regression guard)', () => {
    const dto = plainToInstance(CvStructuredDataRequestDto, validPayload, {
      excludeExtraneousValues: false,
    });
    const plain = instanceToPlain(dto);

    expect(plain).toEqual(validPayload);
  });

  it('passes validation for an empty/blank CV (all nullable fields null, all arrays empty)', async () => {
    const dto = plainToInstance(CvStructuredDataRequestDto, {
      contact: {
        name: null,
        position: null,
        email: null,
        phone: null,
        location: null,
        linkedin: null,
        website: null,
      },
      summary: null,
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      languages: [],
      other: null,
      gdprClause: null,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails validation when a nested experience bullet is not a string', async () => {
    const dto = plainToInstance(CvStructuredDataRequestDto, {
      ...validPayload,
      experience: [{ ...validPayload.experience[0], bullets: [123] }],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('fails validation when contact is missing', async () => {
    const { contact, ...rest } = validPayload;
    void contact;
    const dto = plainToInstance(CvStructuredDataRequestDto, rest);

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'contact')).toBe(true);
  });
});

describe('RenameCvDto', () => {
  const validateName = async (name: unknown) => {
    const dto = plainToInstance(RenameCvDto, { name });
    const errors = await validate(dto);
    return { dto, errors };
  };

  it('passes validation and trims surrounding whitespace', async () => {
    const { dto, errors } = await validateName('  Foo  ');

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Foo');
  });

  it('accepts a name of exactly 100 characters', async () => {
    const { errors } = await validateName('a'.repeat(100));

    expect(errors).toHaveLength(0);
  });

  it('fails validation when name is missing', async () => {
    const dto = plainToInstance(RenameCvDto, {});

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['longer than 100 characters', 'a'.repeat(101)],
  ])('fails validation when name is %s', async (_label, name) => {
    const { errors } = await validateName(name);

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('fails validation (without throwing) when name is not a string', async () => {
    const { errors } = await validateName(123);

    const nameError = errors.find((e) => e.property === 'name');
    expect(nameError?.constraints).toHaveProperty('isString');
  });
});

describe('CreateManualCvRequestDto', () => {
  it('passes validation without a name', async () => {
    const dto = plainToInstance(CreateManualCvRequestDto, validPayload);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(Object.prototype.hasOwnProperty.call(dto, 'name')).toBe(false);
  });

  it('passes validation with a name and trims it', async () => {
    const dto = plainToInstance(CreateManualCvRequestDto, {
      ...validPayload,
      name: '  Foo ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Foo');
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['longer than 100 characters', 'a'.repeat(101)],
  ])('fails validation when name is %s', async (_label, name) => {
    const dto = plainToInstance(CreateManualCvRequestDto, {
      ...validPayload,
      name,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('still validates the structured CV fields', async () => {
    const { contact, ...rest } = validPayload;
    void contact;
    const dto = plainToInstance(CreateManualCvRequestDto, {
      ...rest,
      name: 'My CV',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'contact')).toBe(true);
  });
});
