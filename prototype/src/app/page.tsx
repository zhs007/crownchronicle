'use client';

import { useState, useEffect } from 'react';
import { SaveSummary } from '@/types/saves';
import { ApiClient } from '@/utils/apiClient';
import SaveManager from '@/components/SaveManager';

export default function HomePage() {
  const [saves, setSaves] = useState<SaveSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSaves: 0,
    totalPlayTime: 0,
    bestAuthority: 0,
    bestPopularity: 0,
    longestReign: 0
  });

  useEffect(() => {
    loadSaves();
  }, []);

  const loadSaves = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.getSaves();
      
      if (response.success && response.data) {
        setSaves(response.data.saves);
        
        // 计算统计信息
        const savesData = response.data.saves;
        setStats({
          totalSaves: savesData.length,
          totalPlayTime: savesData.reduce((sum, save) => sum + save.metadata.totalPlayTime, 0),
          bestAuthority: savesData.length > 0 ? Math.max(...savesData.map(save => save.metadata.maxPower)) : 0,
          bestPopularity: savesData.length > 0 ? Math.max(...savesData.map(save => save.metadata.maxPopularity)) : 0,
          longestReign: savesData.length > 0 ? Math.max(...savesData.map(save => save.emperorAge)) : 0
        });
      } else {
        setError(response.error || '加载存档失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-imperial-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-imperial-600 to-imperial-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              皇帝编年史
            </h1>
            <p className="text-xl md:text-2xl text-imperial-200">
              Crown Chronicle
            </p>
            <p className="text-lg text-imperial-300 mt-2">
              执掌朝政，御驾亲征，看你能在波诡云谲的朝堂中生存多久
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 存档管理 */}
          <div className="lg:col-span-2">
            <SaveManager 
              saves={saves} 
              onSavesUpdate={loadSaves}
              error={error}
            />
          </div>

          {/* 侧边栏 - 统计信息和游戏介绍 */}
          <div className="space-y-6">
            {/* 游戏统计 */}
            <div className="card card-imperial">
              <h3 className="text-xl font-semibold text-imperial mb-4">游戏统计</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">总存档数：</span>
                  <span className="font-semibold">{stats.totalSaves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总游戏时间：</span>
                  <span className="font-semibold">{formatTime(stats.totalPlayTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最高威望：</span>
                  <span className="font-semibold text-imperial-600">{stats.bestAuthority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最高民心：</span>
                  <span className="font-semibold text-dragon-600">{stats.bestPopularity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最长在位：</span>
                  <span className="font-semibold text-green-600">{stats.longestReign} 年</span>
                </div>
              </div>
            </div>

            {/* 游戏介绍 */}
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">游戏介绍</h3>
              <div className="text-gray-600 space-y-3 text-sm">
                <p>
                  在《皇帝编年史》中，你将扮演一位中国古代的皇帝，面对朝堂上的各路角色。
                </p>
                <p>
                  系统会随机安排武则天、霍光、鳌拜、秦桧、魏忠贤等历史人物出现在你的朝廷中，
                  但他们的真实身份将被隐藏，你需要通过事件互动逐渐发现。
                </p>
                <p>
                  每个决策都会影响你的健康、威望、国库、军事力量和民心。
                  在错综复杂的朝堂政治中，看你能生存多久！
                </p>
              </div>
            </div>

            {/* 游戏规则 */}
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">游戏规则</h3>
              <div className="text-gray-600 space-y-2 text-sm">
                <div className="flex items-start">
                  <span className="font-semibold text-red-600 mr-2">健康：</span>
                  <span>影响皇帝寿命，降至0将驾崩</span>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold text-imperial-600 mr-2">威望：</span>
                  <span>皇帝权威，降至0将被迫退位</span>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold text-yellow-600 mr-2">国库：</span>
                  <span>国家财政，降至0将政权覆灭</span>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold text-green-600 mr-2">军事：</span>
                  <span>军队力量，降至0将被推翻</span>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold text-blue-600 mr-2">民心：</span>
                  <span>百姓支持，降至0将起义四起</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
