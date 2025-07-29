import { GameEngine } from '../src/engine/GameEngine';
import type { CharacterCard, CommonCard } from '../src/types/card';

describe('CommonCard 合并逻辑', () => {
  const commonCards: CommonCard[] = [
    {
      id: 'chancellor_common',
      name: '丞相通用卡',
      eventIds: ['event_chancellor_1', 'event_chancellor_2'],
    },
    {
      id: 'advisor_common',
      name: '谋士通用卡',
      eventIds: ['event_advisor_1'],
    }
  ];

  it('角色卡无通用卡时只包含自身事件', () => {
    const character: CharacterCard = {
      id: 'zhugeliang',
      name: '诸葛亮',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 80, military: 90, wealth: 60, popularity: 95, health: 80, age: 40 },
      commonCardIds: [],
      eventIds: ['event_zhugeliang_1'],
    };
    const merged = GameEngine.mergeCharacterAndCommonCardEvents(character, commonCards);
    expect(merged).toEqual(['event_zhugeliang_1']);
  });

  it('角色卡有通用卡时合并事件并去重', () => {
    const character: CharacterCard = {
      id: 'yansong',
      name: '严嵩',
      tags: [],
      events: [],
      description: '',
      attributes: { power: 70, military: 60, wealth: 90, popularity: 40, health: 70, age: 55 },
      commonCardIds: ['chancellor_common'],
      eventIds: ['event_yansong_1'],
    };
    const merged = GameEngine.mergeCharacterAndCommonCardEvents(character, commonCards);
    expect(merged.sort()).toEqual(['event_yansong_1', 'event_chancellor_1', 'event_chancellor_2'].sort());
  });
});
