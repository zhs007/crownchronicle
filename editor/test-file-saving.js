#!/usr/bin/env node

/**
 * 测试 Editor 项目的文件保存功能
 * 验证 AI 代理是否能够实际创建配置文件
 */

const { EditorDataManager } = require('./src/lib/dataManager.ts');
const path = require('path');

async function testFileSaving() {
  console.log('🧪 开始测试 Editor 文件保存功能...\n');
  
  try {
    // 使用开发环境的配置路径
    const devConfigPath = path.resolve(__dirname, '../gameconfig/versions/dev');
    console.log(`📁 使用配置路径: ${devConfigPath}`);
    
    const dataManager = new EditorDataManager(devConfigPath);
    
    // 测试角色数据
    const testCharacter = {
      id: 'test-character-001',
      name: '测试角色',
      displayName: '测试大臣',
      currentTitle: '测试大臣',
      role: '测试职位',
      description: '这是一个用于测试文件保存功能的角色',
      identityRevealed: false,
      
      attributes: {
        power: 70,
        loyalty: 60,
        ambition: 50,
        competence: 80,
        reputation: 65,
        health: 90,
        age: 35
      },
      
      relationshipWithEmperor: {
        affection: 30,
        trust: 40,
        fear: 10,
        respect: 60,
        dependency: 20,
        threat: 15
      },
      
      relationshipNetwork: [],
      factionInfo: {
        secondaryFactions: ['测试派系'],
        factionLoyalty: 70,
        leadershipRole: 'member'
      },
      
      influence: {
        health: 0,
        authority: 5,
        treasury: -2,
        military: 3,
        popularity: 1
      },
      
      revealedTraits: ['智慧'],
      hiddenTraits: ['野心'],
      discoveredClues: [],
      totalClues: 0,
      statusFlags: {
        alive: true,
        inCourt: true,
        inExile: false,
        imprisoned: false,
        promoted: false,
        demoted: false,
        suspicious: false,
        plotting: false
      },
      eventIds: []
    };
    
    // 测试事件数据
    const testEvent = {
      id: 'test-event-001',
      characterId: 'test-character-001',
      title: '测试事件',
      description: '这是一个用于测试的事件',
      speaker: '测试大臣',
      dialogue: '陛下，这是一个测试对话',
      choices: [
        {
          id: 'choice1',
          text: '同意',
          effects: {
            authority: 5,
            treasury: -10
          },
          consequences: '你选择了同意'
        },
        {
          id: 'choice2', 
          text: '拒绝',
          effects: {
            authority: -5,
            popularity: 10
          },
          consequences: '你选择了拒绝'
        }
      ],
      weight: 10,
      activationConditions: {},
      characterClues: ['这个角色似乎很忠诚']
    };
    
    // 测试保存角色
    console.log('💾 测试保存角色...');
    await dataManager.saveCharacter(testCharacter.id, testCharacter);
    console.log('✅ 角色保存成功！');
    
    // 测试保存事件
    console.log('💾 测试保存事件...');
    await dataManager.saveEvent(testCharacter.id, testEvent.id, testEvent);
    console.log('✅ 事件保存成功！');
    
    // 测试读取验证
    console.log('📖 测试读取刚保存的数据...');
    const loadedCharacter = await dataManager.loadCharacter(testCharacter.id);
    const loadedEvent = await dataManager.loadEvent(testCharacter.id, testEvent.id);
    
    if (loadedCharacter && loadedEvent) {
      console.log('✅ 数据读取成功！');
      console.log(`   角色: ${loadedCharacter.name} (${loadedCharacter.id})`);
      console.log(`   事件: ${loadedEvent.title} (${loadedEvent.id})`);
    } else {
      console.log('❌ 数据读取失败');
    }
    
    console.log('\n🎉 文件保存功能测试完成！');
    console.log('现在 AI 代理应该能够实际创建配置文件了。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testFileSaving();
