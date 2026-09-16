import { AtsContactPipe, DateRangePipe, DegreeFieldPipe } from './cv-preview-pipes';

describe('AtsContactPipe', () => {
  const pipe = new AtsContactPipe();

  it('joins non-null parts with |', () => {
    expect(pipe.transform(['a@b.com', '123', 'London'])).toBe('a@b.com  |  123  |  London');
  });

  it('filters out null and undefined values', () => {
    expect(pipe.transform(['a@b.com', null, undefined, 'London'])).toBe('a@b.com  |  London');
  });

  it('returns empty string when all parts are null', () => {
    expect(pipe.transform([null, null])).toBe('');
  });

  it('returns single value without separator', () => {
    expect(pipe.transform(['only@one.com'])).toBe('only@one.com');
  });
});

describe('DateRangePipe', () => {
  const pipe = new DateRangePipe();

  it('joins two dates with –', () => {
    expect(pipe.transform(['Jan 2020', 'Dec 2022'])).toBe('Jan 2020 – Dec 2022');
  });

  it('returns single date when second is null', () => {
    expect(pipe.transform(['Jan 2020', null])).toBe('Jan 2020');
  });

  it('returns empty string when both are null', () => {
    expect(pipe.transform([null, null])).toBe('');
  });
});

describe('DegreeFieldPipe', () => {
  const pipe = new DegreeFieldPipe();

  it('joins degree and field with comma', () => {
    expect(pipe.transform(['BSc', 'Computer Science'])).toBe('BSc, Computer Science');
  });

  it('returns degree alone when field is null', () => {
    expect(pipe.transform(['BSc', null])).toBe('BSc');
  });

  it('returns empty string when both are null', () => {
    expect(pipe.transform([null, null])).toBe('');
  });
});
