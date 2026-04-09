/**
 * Unit Tests for Validation Middleware
 */

const {
  validateTrainingPlanPreferences,
  validateUserId,
  validateTextInput,
  sanitizeString
} = require('../middleware/validation');

describe('Validation Middleware', () => {
  
  describe('validateTrainingPlanPreferences', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });
    
    test('should pass with valid preferences', () => {
      req.body.preferences = {
        goal: 'Improve 5K time',
        availableDays: [1, 3, 5],
        preferredTime: 'morning',
        maxDistancePerWeek: 30
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('should pass with no preferences (optional)', () => {
      validateTrainingPlanPreferences(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    
    test('should reject goal longer than 200 characters', () => {
      req.body.preferences = {
        goal: 'a'.repeat(201)
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid input'
      }));
    });
    
    test('should reject invalid available days', () => {
      req.body.preferences = {
        availableDays: [0, 8, 10] // Invalid days
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should reject empty available days array', () => {
      req.body.preferences = {
        availableDays: []
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should reject invalid preferred time', () => {
      req.body.preferences = {
        preferredTime: 'midnight'
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should reject maxDistancePerWeek out of range', () => {
      req.body.preferences = {
        maxDistancePerWeek: 200 // Too high
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should accept valid maxDistancePerWeek', () => {
      req.body.preferences = {
        maxDistancePerWeek: 50
      };
      
      validateTrainingPlanPreferences(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });
  
  describe('validateUserId', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = { params: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });
    
    test('should pass with valid user ID', () => {
      req.params.userId = '123';
      
      validateUserId(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
    
    test('should reject non-numeric user ID', () => {
      req.params.userId = 'abc';
      
      validateUserId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should reject negative user ID', () => {
      req.params.userId = '-5';
      
      validateUserId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('should reject zero user ID', () => {
      req.params.userId = '0';
      
      validateUserId(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
  
  describe('sanitizeString', () => {
    test('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeString(input);
      
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
    
    test('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const output = sanitizeString(input);
      
      expect(output).toBe('Tom &amp; Jerry');
    });
    
    test('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
    });
  });
  
  describe('validateTextInput', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = { body: {} };
      res = {};
      next = jest.fn();
    });
    
    test('should sanitize caption field', () => {
      req.body.caption = '<b>Bold</b>';
      
      validateTextInput(req, res, next);
      
      expect(req.body.caption).toBe('&lt;b&gt;Bold&lt;/b&gt;');
      expect(next).toHaveBeenCalled();
    });
    
    test('should sanitize description field', () => {
      req.body.description = 'Test <script>evil</script>';
      
      validateTextInput(req, res, next);
      
      expect(req.body.description).toBe('Test &lt;script&gt;evil&lt;/script&gt;');
    });
  });
});
