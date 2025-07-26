'use client';


interface EmperorStatsProps {
  stats: {
    power: number;
    military: number;
    wealth: number;
    popularity: number;
    health: number;
    age: number;
  };
}

export default function EmperorStats({ stats }: EmperorStatsProps) {
  const getStatColor = (value: number): string => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-blue-600';
    if (value >= 40) return 'text-yellow-600';
    if (value >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatBgColor = (value: number): string => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-yellow-500';
    if (value >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const statItems = [
    { key: 'power', label: '权势', value: stats.power, icon: '👑' },
    { key: 'military', label: '军队', value: stats.military, icon: '⚔️' },
    { key: 'wealth', label: '财富', value: stats.wealth, icon: '💰' },
    { key: 'popularity', label: '民心', value: stats.popularity, icon: '👥' },
    { key: 'health', label: '健康', value: stats.health, icon: '❤️' },
    { key: 'age', label: '年龄', value: stats.age, icon: '🎂' }
  ];

  return (
    <div className="card card-imperial">
      <h2 className="text-xl font-bold text-imperial mb-4 text-center">
        皇帝状态
      </h2>
      
      {/* 基本信息 */}
      <div className="text-center mb-6 p-4 bg-white bg-opacity-50 rounded-lg">
        <div className="text-2xl font-bold text-imperial-700 mb-2">
          {statItems.find(item => item.key === 'age')?.value} 岁
        </div>
      </div>

      {/* 属性列表 */}
      <div className="space-y-4">
        {statItems.map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium text-gray-700">{item.label}</span>
              </div>
              <span className={`font-bold ${getStatColor(item.value)}`}>
                {item.value}
              </span>
            </div>
            
            {/* 进度条 */}
            <div className="progress-bar">
              <div 
                className={`progress-fill ${getStatBgColor(item.value)}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 危险警告 */}
      {statItems.some(item => item.value <= 20) && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-sm font-medium mb-1">
            ⚠️ 危险警告
          </div>
          <div className="text-red-600 text-xs">
            有属性过低，请谨慎决策！
          </div>
        </div>
      )}

      {/* 优秀状态 */}
      {statItems.every(item => item.value >= 60) && (
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600 text-sm font-medium mb-1">
            ✨ 治世之君
          </div>
          <div className="text-green-600 text-xs">
            各项属性良好，国泰民安！
          </div>
        </div>
      )}
    </div>
  );
}
