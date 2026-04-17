import type { GoalType, ActivityLevel } from '@/types/app'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

const GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  lose_weight:         -500,
  maintain:            0,
  gain_muscle:         +300,
  body_recomposition:  -200,
}

export function calculateBMR(sex: string, weight_kg: number, height_cm: number, age: number): number {
  if (sex === 'male') return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
  return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

export function calculateCalorieTarget(tdee: number, goal: GoalType): number {
  return Math.max(1200, Math.round(tdee + GOAL_ADJUSTMENTS[goal]))
}

export function calculateMacros(calories: number, goal: GoalType): {
  protein_g: number; carbs_g: number; fat_g: number
} {
  const macroRatios: Record<GoalType, { p: number; c: number; f: number }> = {
    lose_weight:         { p: 0.35, c: 0.40, f: 0.25 },
    maintain:            { p: 0.25, c: 0.50, f: 0.25 },
    gain_muscle:         { p: 0.30, c: 0.45, f: 0.25 },
    body_recomposition:  { p: 0.35, c: 0.40, f: 0.25 },
  }
  const { p, c, f } = macroRatios[goal]
  return {
    protein_g: Math.round((calories * p) / 4),
    carbs_g:   Math.round((calories * c) / 4),
    fat_g:     Math.round((calories * f) / 9),
  }
}

export function computeUserTargets(params: {
  sex: string; weight_kg: number; height_cm: number;
  age: number; activity_level: ActivityLevel; goal_type: GoalType
}) {
  const bmr = calculateBMR(params.sex, params.weight_kg, params.height_cm, params.age)
  const tdee = calculateTDEE(bmr, params.activity_level)
  const calorie_target = calculateCalorieTarget(tdee, params.goal_type)
  const macros = calculateMacros(calorie_target, params.goal_type)
  return { tdee, calorie_target, ...macros }
}
