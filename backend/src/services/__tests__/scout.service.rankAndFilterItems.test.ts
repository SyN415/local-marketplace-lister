import { ScoutService } from '../scout.service';

describe('ScoutService precision matching', () => {
  test('rankAndFilterItems() boosts brand/model matches and filters low-signal items', () => {
    // Note: constructor may log warnings if env is not configured; test focuses on pure ranking logic.
    const svc = new ScoutService();

    const items = [
      {
        title: 'Herman Miller Aeron Size C - remastered - graphite',
        price: { value: '650' },
        image: { imageUrl: 'https://example.com/1.png' },
        itemWebUrl: 'https://example.com/1'
      },
      {
        title: 'Office chair mesh ergonomic',
        price: { value: '120' },
        image: { imageUrl: 'https://example.com/2.png' },
        itemWebUrl: 'https://example.com/2'
      },
      {
        title: 'Herman Miller Mirra chair',
        price: { value: '300' },
        image: { imageUrl: 'https://example.com/3.png' },
        itemWebUrl: 'https://example.com/3'
      }
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ranked = (svc as any).rankAndFilterItems(items as any[], 'Herman Miller Aeron chair', {
      brand: 'Herman Miller',
      model: 'Aeron'
    });

    expect(ranked[0].item.title.toLowerCase()).toContain('aeron');
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]).toHaveProperty('score');
  });
});

