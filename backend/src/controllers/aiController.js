const { validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');

// AI Agent for intelligent cab recommendations
class AIRecommendationAgent {
  constructor() {
    this.weights = {
      fare: 0.40,
      eta: 0.30,
      safety: 0.20,
      preference: 0.10
    };
  }

  // Analyze user preferences and history
  async analyzeUserPreferences(userId) {
    try {
      const userBookings = await Booking.find({ 
        'passenger.userId': userId,
        status: 'ride_completed'
      }).sort({ bookingTime: -1 }).limit(10);

      const preferences = {
        preferredProviders: {},
        preferredVehicleTypes: {},
        avgFareRange: { min: Infinity, max: 0 },
        preferredTimeSlots: {},
        safetyPriority: 0
      };

      userBookings.forEach(booking => {
        // Provider preferences
        preferences.preferredProviders[booking.provider.name] = 
          (preferences.preferredProviders[booking.provider.name] || 0) + 1;

        // Vehicle type preferences
        if (booking.provider.vehicleType) {
          preferences.preferredVehicleTypes[booking.provider.vehicleType] = 
            (preferences.preferredVehicleTypes[booking.provider.vehicleType] || 0) + 1;
        }

        // Fare range
        if (booking.fare.totalFare < preferences.avgFareRange.min) {
          preferences.avgFareRange.min = booking.fare.totalFare;
        }
        if (booking.fare.totalFare > preferences.avgFareRange.max) {
          preferences.avgFareRange.max = booking.fare.totalFare;
        }

        // Time slot preferences
        const hour = new Date(booking.bookingTime).getHours();
        const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        preferences.preferredTimeSlots[timeSlot] = (preferences.preferredTimeSlots[timeSlot] || 0) + 1;
      });

      // Calculate average fare range
      if (preferences.avgFareRange.min === Infinity) {
        preferences.avgFareRange = { min: 0, max: 500 };
      }

      return preferences;
    } catch (error) {
      console.error('Error analyzing user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  getDefaultPreferences() {
    return {
      preferredProviders: { uber: 1, ola: 1 },
      preferredVehicleTypes: { sedan: 1, hatchback: 1 },
      avgFareRange: { min: 0, max: 500 },
      preferredTimeSlots: { morning: 1, afternoon: 1 },
      safetyPriority: 5
    };
  }

  // Score cab options based on multiple criteria
  scoreCabOption(cab, userPreferences, context) {
    let score = 0;
    const reasons = [];

    // Fare competitiveness (40% weight)
    const fareScore = this.calculateFareScore(cab, userPreferences);
    score += fareScore * this.weights.fare;
    if (fareScore > 80) {
      reasons.push('Excellent value for money');
    }

    // ETA reliability (30% weight)
    const etaScore = this.calculateEtaScore(cab);
    score += etaScore * this.weights.eta;
    if (etaScore > 80) {
      reasons.push('Quick arrival time');
    }

    // Safety rating (20% weight)
    const safetyScore = this.calculateSafetyScore(cab, context);
    score += safetyScore * this.weights.safety;
    if (safetyScore > 80) {
      reasons.push('High safety standards');
    }

    // User preference alignment (10% weight)
    const preferenceScore = this.calculatePreferenceScore(cab, userPreferences);
    score += preferenceScore * this.weights.preference;
    if (preferenceScore > 80) {
      reasons.push('Matches your preferences');
    }

    return {
      ...cab,
      aiScore: Math.round(score),
      aiReasons: reasons,
      recommendationConfidence: this.calculateConfidence(score)
    };
  }

  calculateFareScore(cab, userPreferences) {
    const avgFare = 200; // Mock average fare
    const fareRatio = cab.fare / avgFare;
    
    if (cab.fare <= userPreferences.avgFareRange.max * 1.1) {
      return Math.max(0, 100 - (fareRatio - 1) * 50);
    }
    return Math.max(0, 50 - (fareRatio - 1) * 30);
  }

  calculateEtaScore(cab) {
    if (cab.eta <= 5) return 100;
    if (cab.eta <= 10) return 80;
    if (cab.eta <= 15) return 60;
    return Math.max(0, 40 - (cab.eta - 15) * 2);
  }

  calculateSafetyScore(cab, context) {
    let score = cab.rating * 20; // Base score from rating

    // Night ride safety (8 PM - 6 AM)
    if (context.isNightRide) {
      if (cab.rating >= 4.5) {
        score += 20;
      }
      if (cab.rating < 4.0) {
        score -= 30; // Penalize low-rated drivers at night
      }
    }

    // Weather conditions
    if (context.weather === 'rainy' && ['sedan', 'suv'].includes(cab.type)) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  calculatePreferenceScore(cab, userPreferences) {
    let score = 50; // Base score

    // Provider preference
    const providerCount = userPreferences.preferredProviders[cab.provider] || 0;
    score += Math.min(30, providerCount * 10);

    // Vehicle type preference
    const vehicleCount = userPreferences.preferredVehicleTypes[cab.type] || 0;
    score += Math.min(20, vehicleCount * 10);

    return Math.min(100, score);
  }

  calculateConfidence(score) {
    if (score >= 90) return 'Very High';
    if (score >= 80) return 'High';
    if (score >= 70) return 'Medium';
    if (score >= 60) return 'Low';
    return 'Very Low';
  }

  // Generate personalized recommendations
  async generateRecommendations(cabOptions, userId, context) {
    try {
      const userPreferences = await this.analyzeUserPreferences(userId);
      
      const scoredOptions = cabOptions.map(cab => 
        this.scoreCabOption(cab, userPreferences, context)
      );

      // Sort by AI score
      scoredOptions.sort((a, b) => b.aiScore - a.aiScore);

      // Return top 3 recommendations with detailed analysis
      return {
        recommendations: scoredOptions.slice(0, 3),
        analysis: {
          totalOptions: cabOptions.length,
          userPreferences: userPreferences,
          context: context,
          scoringWeights: this.weights
        }
      };
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
}

// Initialize AI Agent
const aiAgent = new AIRecommendationAgent();

// Get AI-powered recommendations
const getAIRecommendations = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const {
      pickupLat,
      pickupLng,
      destinationLat,
      destinationLng,
      vehicleType,
      maxFare,
      passengerCount = 1,
      weather = 'clear'
    } = req.body;

    // Mock cab options (in real implementation, this would come from provider APIs)
    const mockCabOptions = [
      { id: 'uber_001', provider: 'uber', name: 'Uber Go', eta: 5, fare: 150, rating: 4.5, type: 'sedan' },
      { id: 'uber_002', provider: 'uber', name: 'Uber X', eta: 7, fare: 200, rating: 4.3, type: 'sedan' },
      { id: 'ola_001', provider: 'ola', name: 'Ola Micro', eta: 4, fare: 140, rating: 4.2, type: 'hatchback' },
      { id: 'ola_002', provider: 'ola', name: 'Ola Mini', eta: 6, fare: 180, rating: 4.4, type: 'sedan' },
      { id: 'rapido_001', provider: 'rapido', name: 'Rapido Bike', eta: 3, fare: 80, rating: 4.1, type: 'bike' },
      { id: 'blabla_001', provider: 'blablacar', name: 'BlaBla Share', eta: 15, fare: 100, rating: 4.0, type: 'shared' }
    ];

    // Filter options based on criteria
    let filteredOptions = mockCabOptions;
    
    if (vehicleType && vehicleType !== 'any') {
      filteredOptions = filteredOptions.filter(cab => cab.type === vehicleType);
    }

    if (maxFare && maxFare > 0) {
      filteredOptions = filteredOptions.filter(cab => cab.fare <= maxFare);
    }

    if (passengerCount > 4) {
      filteredOptions = filteredOptions.filter(cab => ['suv', 'luxury'].includes(cab.type));
    }

    // Context for AI analysis
    const context = {
      isNightRide: new Date().getHours() >= 20 || new Date().getHours() <= 6,
      weather: weather,
      passengerCount: passengerCount,
      distance: Math.random() * 10 + 2 // Mock distance
    };

    // Generate AI recommendations
    const recommendations = await aiAgent.generateRecommendations(
      filteredOptions,
      req.userId,
      context
    );

    res.json({
      success: true,
      aiRecommendations: recommendations.recommendations,
      analysis: recommendations.analysis,
      searchContext: {
        pickup: { lat: pickupLat, lng: pickupLng },
        destination: { lat: destinationLat, lng: destinationLng },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('AI recommendation error:', error);
    res.status(500).json({ 
      message: 'Error generating AI recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get AI insights for user
const getAIInsights = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user booking history
    const userBookings = await Booking.find({ 
      'passenger.userId': userId,
      status: 'ride_completed'
    }).sort({ bookingTime: -1 }).limit(20);

    // Calculate insights
    const insights = {
      totalRides: userBookings.length,
      favoriteProvider: getMostFrequent(userBookings.map(b => b.provider.name)),
      averageFare: Math.round(userBookings.reduce((sum, b) => sum + b.fare.totalFare, 0) / userBookings.length),
      preferredTimeSlot: getMostFrequent(userBookings.map(b => {
        const hour = new Date(b.bookingTime).getHours();
        return hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      })),
      averageRating: Math.round(userBookings.filter(b => b.feedback.passengerRating).reduce((sum, b) => sum + b.feedback.passengerRating, 0) / userBookings.filter(b => b.feedback.passengerRating).length * 10) / 10,
      savings: calculateSavings(userBookings),
      safetyScore: calculateSafetyScore(userBookings)
    };

    res.json({
      success: true,
      insights: insights,
      recommendations: generatePersonalizedRecommendations(insights)
    });

  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ 
      message: 'Error generating AI insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper functions
function getMostFrequent(arr) {
  const frequency = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b, '');
}

function calculateSavings(bookings) {
  // Mock savings calculation
  return Math.floor(Math.random() * 1000) + 500;
}

function calculateSafetyScore(bookings) {
  const nightRides = bookings.filter(b => {
    const hour = new Date(b.bookingTime).getHours();
    return hour >= 20 || hour <= 6;
  }).length;
  
  return Math.round((1 - nightRides / bookings.length) * 100);
}

function generatePersonalizedRecommendations(insights) {
  const recommendations = [];
  
  if (insights.averageFare > 200) {
    recommendations.push('Consider trying shared rides to save money');
  }
  
  if (insights.safetyScore < 70) {
    recommendations.push('Try to avoid late-night rides for better safety');
  }
  
  if (insights.averageRating < 4.0) {
    recommendations.push('Consider rating your drivers to help improve service quality');
  }
  
  return recommendations;
}

module.exports = {
  getAIRecommendations,
  getAIInsights
};