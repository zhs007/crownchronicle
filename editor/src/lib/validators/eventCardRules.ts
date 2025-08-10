import type { EventCard, EventOption } from 'crownchronicle-core';

export interface RuleStats {
  optionCount: number;
  twoAttrCount: number;
  twoAttrRatio: number; // 0..1
}

export interface RuleResult {
  ok: boolean;
  errors: string[];
  stats: RuleStats;
}

// 更宽松的输入效果类型，用于运行时校验（避免使用 any）
type EffectUnknown = { target: unknown; attribute: unknown; offset: unknown };

type Target = 'player' | 'self';

export function validateEventCardRules(
  card: EventCard,
  legalAttrs: { player: string[]; self: string[] },
  legalOffsets: number[],
): RuleResult {
  const errors: string[] = [];
  const options: EventOption[] = Array.isArray(card.options) ? card.options : [];

  // 1) 每个 option 使用 effects 数组；统计双属性
  let twoAttrCount = 0;
  options.forEach((opt, idx) => {
    const effRaw: unknown = (opt as EventOption).effects as unknown;
    const eff: EffectUnknown[] = Array.isArray(effRaw) ? (effRaw as EffectUnknown[]) : [];

    if (eff.length === 0) {
      errors.push(`第${idx+1}个选项未提供 effects`);
      return;
    }

    // 合法性与冲突检测
    const seenByTarget: Record<Target, Set<string>> = { player: new Set(), self: new Set() };
    for (const e of eff) {
      const tgt = e.target as Target;
      const attr = e.attribute as string;
      const off = e.offset as number;

      if (tgt !== 'player' && tgt !== 'self') {
        errors.push(`第${idx+1}个选项存在非法 target: ${String(e.target)}`);
        continue;
      }
      const legalSet = tgt === 'player' ? legalAttrs.player : legalAttrs.self;
      if (typeof attr !== 'string' || !legalSet.includes(attr)) {
        errors.push(`第${idx+1}个选项存在非法属性: ${String(e.attribute)}（${tgt}）`);
      }
      if (typeof off !== 'number' || !legalOffsets.includes(off)) {
        errors.push(`第${idx+1}个选项存在非法数值: ${String(e.offset)}`);
      }
      if (typeof attr === 'string') {
        seenByTarget[tgt].add(attr);
      }
    }

    // 检查同一属性是否在同一 option 内同时修改了 player 与 self
    const conflictAttrs = [...seenByTarget.player].filter(a => seenByTarget.self.has(a));
    if (conflictAttrs.length > 0) {
      errors.push(`第${idx+1}个选项同一属性同时修改 player 与 self: ${conflictAttrs.join(', ')}`);
    }

    // 统计是否为“≥2 不同属性”的选项（按 target+attribute 去重）
    const distinctAttrs = new Set(
      eff
        .map(e => ({ t: e.target as Target, a: e.attribute as string }))
        .filter(x => (x.t === 'player' || x.t === 'self') && typeof x.a === 'string')
        .map(x => `${x.t}:${x.a}`)
    );
    if (distinctAttrs.size >= 2) twoAttrCount += 1;
  });

  const optionCount = options.length;
  const twoAttrRatio = optionCount > 0 ? twoAttrCount / optionCount : 0;

  // 规则：≥80% 的 option 同时修改≥2 个不同属性
  if (twoAttrRatio < 0.8) {
    errors.push(`至少 80% 的选项需同时修改 ≥2 个不同属性，当前为 ${(twoAttrRatio*100).toFixed(0)}%`);
  }

  return {
    ok: errors.length === 0,
    errors,
    stats: { optionCount, twoAttrCount, twoAttrRatio },
  };
}
