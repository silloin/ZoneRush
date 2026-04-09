/**
 * Unit Tests for AI Coach Service
 */

const aiCoachService = require('../services/aiCoachService');

// Mock the database pool
jest.mock('../config/db', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn()
  };
  return mockPool;
});

// Mock Groq SDK
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('AI Coach Service', () => {
  
  describe('validateAndStructurePlan', () => {
    test('should handle empty AI response', () => {
      const result = aiCoachService.validateAndStructurePlan({}, { fitness_level: 'beginner' });
      
      expect(result).toHaveProperty('planName');
      expect(result).toHaveProperty('weeklyPlans');
      expect(result.isAI).toBeUndefined();
    });
    
    test('should structure valid AI response correctly', () => {
      const aiResponse = {
        planName: 'Test Plan',
        duration: '4 weeks',
        difficulty: 'intermediate',
        goal: 'Improve fitness',
        weeklyPlans: [
          {
            week: 1,
            focus: 'Building base',
            workouts: [
              {
                day: 1,
                workoutType: 'Easy Run',
                description: 'Light jog',
                distance: 5,
                duration: 30,
                intensity: 'easy',
                notes: 'Stay hydrated'
              }
            ]
          }
        ],
        tips: ['Tip 1', 'Tip 2'],
        warnings: ['Warning 1']
      };
      
      const result = aiCoachService.validateAndStructurePlan(aiResponse, { fitness_level: 'intermediate' });
      
      expect(result.planName).toBe('Test Plan');
      expect(result.weeklyPlans).toHaveLength(1);
      expect(result.weeklyPlans[0].workouts).toHaveLength(1);
      expect(result.tips).toEqual(['Tip 1', 'Tip 2']);
      expect(result.warnings).toEqual(['Warning 1']);
      expect(result.isAI).toBe(true);
      expect(result.generatedAt).toBeDefined();
    });
    
    test('should handle missing fields gracefully', () => {
      const aiResponse = {
        weeklyPlans: [
          {
            week: 1,
            workouts: []
          }
        ]
      };
      
      const result = aiCoachService.validateAndStructurePlan(aiResponse, {});
      
      expect(result.planName).toBeDefined();
      expect(result.difficulty).toBe('beginner'); // default
    });
  });
  
  describe('convertWorkoutsToWeeklyPlan', () => {
    test('should convert flat workouts to weekly structure', () => {
      const workouts = [
        { workoutType: 'Run', distance: 5, duration: 30 },
        { workoutType: 'Rest' },
        { workoutType: 'Run', distance: 6, duration: 35 }
      ];
      
      const result = aiCoachService.convertWorkoutsToWeeklyPlan(workouts);
      
      expect(result).toHaveLength(1); // All fit in one week
      expect(result[0].week).toBe(1);
      expect(result[0].workouts).toHaveLength(3);
    });
    
    test('should split workouts across multiple weeks', () => {
      const workouts = Array(10).fill({ workoutType: 'Run', distance: 5 });
      
      const result = aiCoachService.convertWorkoutsToWeeklyPlan(workouts);
      
      expect(result).toHaveLength(2); // 10 workouts / 7 per week = 2 weeks
      expect(result[0].workouts).toHaveLength(7);
      expect(result[1].workouts).toHaveLength(3);
    });
  });
  
  describe('buildTrainingPlanPrompt', () => {
    test('should create prompt with user data', () => {
      const userData = {
        fitness_level: 'intermediate',
        total_distance: 50000,
        avg_pace_30d: 5.5,
        runs_last_week: 4,
        current_streak: 7,
        best_5k_time: 1500
      };
      
      const recentRuns = [
        { completed_at: new Date(), distance: 5000, pace: 5.5, duration: 1800 }
      ];
      
      const preferences = {
        goal: 'Improve 5K time',
        availableDays: [1, 3, 5]
      };
      
      const prompt = aiCoachService.buildTrainingPlanPrompt(userData, recentRuns, preferences);
      
      expect(prompt).toContain('intermediate');
      expect(prompt).toContain('50.0 km');
      expect(prompt).toContain('Improve 5K time');
      expect(prompt).toContain('JSON format');
    });
  });
});
