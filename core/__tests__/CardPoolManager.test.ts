import { CardPoolManager } from '../src/engine/card/CardPoolManager';
import { GameState } from '../src/types/game';
import type { EventCard } from '../src/types/event';

describe('CardPoolManager', () => {
  function makeGameState(overrides?: Partial<GameState>): GameState {
    return {
      emperor: { power: 50, military: 50, wealth: 50, popularity: 50, health: 50, age: 30 },
      activeCharacters: [],
      cardPools: {
        pending: [],
        active: [],
        discarded: []
      },
      gameHistory: [],
      currentEvent: null,
      characterStates: [],
      factionSystem: { activeFactions: [], factionBalance: 0 },
      courtPolitics: { tension: 0, stability: 0, corruption: 0, efficiency: 0, recentEvents: [] },
      gameOver: false,
      startTime: 0,
      currentTurn: 1,
      ...overrides
    };
  }

  function makeEventCard(id: string, extra?: Partial<EventCard>): EventCard {
    // 生成两个标准选项
    const options = [
      {
        optionId: `test_${id}_001`,
        description: '选项A',
        target: 'player',
        attribute: 'power',
        offset: 1
      },
      {
        optionId: `test_${id}_002`,
        description: '选项B',
        target: 'self',
        attribute: 'military',
        offset: -1
      }
    ];
    return { id, title: id, options, ...extra } as EventCard;
  }

  it('should activate and remove cards from pending pool', () => {
    const event1 = makeEventCard('e1', { activationConditions: { minPower: 40 } });
    const event2 = makeEventCard('e2', { removalConditions: { maxPower: 60 } });
    const state = makeGameState({ cardPools: { pending: [event1, event2], active: [], discarded: [] } });
    const newState = CardPoolManager.updatePendingPool(state);
    expect(newState.cardPools.active.map(e => e.id)).toContain('e1');
    expect(newState.cardPools.discarded.map(e => e.id)).toContain('e2');
    expect(newState.cardPools.pending.length).toBe(0);
  });

  it('should select next event by weight', () => {
    const event1 = makeEventCard('e1');
    const event2 = makeEventCard('e2');
    const state = makeGameState({ cardPools: { pending: [], active: [event1, event2], discarded: [] } });
    const next = CardPoolManager.selectNextEvent(state);
    expect(next).not.toBeNull();
    expect(['e1', 'e2']).toContain(next!.id);
  });

  it('should discard event from active pool', () => {
    const event1 = makeEventCard('e1');
    const state = makeGameState({ cardPools: { pending: [], active: [event1], discarded: [] } });
    const newState = CardPoolManager.discardEvent(state, 'e1');
    expect(newState.cardPools.active.length).toBe(0);
    expect(newState.cardPools.discarded[0].id).toBe('e1');
  });

  it('should add events to pending pool', () => {
    const event1 = makeEventCard('e1');
    const state = makeGameState();
    const newState = CardPoolManager.addToPendingPool(state, [event1]);
    expect(newState.cardPools.pending[0].id).toBe('e1');
  });

  it('should force activate event from pending', () => {
    const event1 = makeEventCard('e1');
    const state = makeGameState({ cardPools: { pending: [event1], active: [], discarded: [] } });
    const newState = CardPoolManager.forceActivate(state, 'e1');
    expect(newState.cardPools.active[0].id).toBe('e1');
    expect(newState.cardPools.pending.length).toBe(0);
  });

  it('should force remove event from pending or active', () => {
    const event1 = makeEventCard('e1');
    const event2 = makeEventCard('e2');
    let state = makeGameState({ cardPools: { pending: [event1], active: [event2], discarded: [] } });
    state = CardPoolManager.forceRemove(state, 'e1');
    expect(state.cardPools.discarded.map(e => e.id)).toContain('e1');
    state = CardPoolManager.forceRemove(state, 'e2');
    expect(state.cardPools.discarded.map(e => e.id)).toContain('e2');
  });

  it('should get correct pool status', () => {
    const event1 = makeEventCard('e1');
    const event2 = makeEventCard('e2');
    const state = makeGameState({ cardPools: { pending: [event1], active: [event2], discarded: [] } });
    const status = CardPoolManager.getPoolStatus(state);
    expect(status.pendingCount).toBe(1);
    expect(status.activeCount).toBe(1);
    expect(status.discardedCount).toBe(0);
    expect(status.totalEvents).toBe(2);
  });
});
