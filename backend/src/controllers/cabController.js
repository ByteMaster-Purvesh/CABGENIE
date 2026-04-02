const { validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');

// Mock cab providers data (in real implementation, this would integrate with actual APIs)
const mockCabProviders = {
  uber: [
    { id: 'uber_001', name: 'Uber Go', eta: 5, fare: 150, rating: 4.5, type: 'sedan' },
    { id: 'uber_002', name: 'Uber X', eta: 7, fare: 200, rating: 4.3, type: 'sedan' },
    { id: 'uber_003', name: 'Uber XL', eta: 10, fare: 300, rating: 4.4, type: 'suv' }
  ],
  ola: [
    { id: 'ola_001', name: 'Ola Micro', eta: 4, fare: 140, rating: 4.2, type: 'hatchback' },
    { id: 'ola_002', name: 'Ola Mini', eta: 6, fare: 180, rating: 4.4, type: 'sedan' },
    { id: 'ola_003', name: 'Ola Prime', eta: 8, fare: 250, rating: 4.6, type: 'sedan' }
  ],
  rapido: [
    { id: 'rapido_001', name: 'Rapido Bike', eta: 3, fare: 80, rating: 4.1, type: 'bike' },
    { id: 'rapido_002', name: 'Rapido Auto', eta: 6, fare: 120, rating: 4.3, type: 'auto' }
  ],
  blablacar: [
    { id: 'blabla_001', name: 'BlaBla Share', eta: 15, fare: 100, rating: 4.0, type: 'shared' },
    { id: 'blabla_002', name: 'BlaBla Solo', eta: 12, fare: 220, rating: 4.2, type: 'sedan' }
  ]
};

// AI-powered cab recommendation engine
const aiRecommendationEngine = (cabs, userPreferences, weather, timeOfDay) => {
  const scoredCabs = cabs.map(cab => {
    let score = 0;
    const reasons = [];

    // Fare competitiveness (40% weight)
    const avgFare = cabs.reduce((sum, c) => sum + c.fare, 0) / cabs.length;
    const fareScore = Math.max(0, 100 - ((cab.fare - avgFare) / avgFare * 50));
    score += fareScore * 0.4;
    if (cab.fare <= avgFare * 0.9) {
      reasons.push('Competitive pricing');
    }

    // ETA reliability (30% weight)
    const avgEta = cabs.reduce((sum, c) => sum + c.eta, 0) / cabs.length;
    const etaScore = Math.max(0, 100 - ((cab.eta - avgEta) / avgEta * 30));
    score += etaScore * 0.3;
    if (cab.eta <= avgEta * 0.8) {
      reasons.push('Fast arrival time');
    }

    // Safety rating (20% weight)
    const safetyScore = cab.rating * 20;
    score += safetyScore * 0.2;
    if (cab.rating >= 4.5) {
      reasons.push('High safety rating');
    }

    // User preference alignment (10% weight)
    if (userPreferences.preferredVehicleTypes?.includes(cab.type)) {
      score += 10;
      reasons.push('Matches your vehicle preference');
    }

    // Night ride safety (8 PM to 6 AM)
    if (timeOfDay >= 20 || timeOfDay <= 6) {
      if (cab.rating >= 4.5) {
        score += 15;
        reasons.push('Verified driver for night rides');
      }
    }

    // Weather considerations
    if (weather === 'rainy' && ['sedan', 'suv'].includes(cab.type)) {
      score += 10;
      reasons.push('Weather-appropriate vehicle');
    }

    return {
      ...cab,
      aiScore: Math.round(score),
      aiReasons: reasons
    };
  });

  return scoredCabs.sort((a, b) => b.aiScore - a.aiScore);
};

// Search for available cabs
const searchCabs = async (req, res) => {
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
      aiAgent = false,
      passengerCount = 1
    } = req.body;

    // Validate coordinates
    if (pickupLat < -90 || pickupLat > 90 || pickupLng < -180 || pickupLng > 180) {
      return res.status(400).json({ message: 'Invalid pickup coordinates' });
    }

    if (destinationLat < -90 || destinationLat > 90 || destinationLng < -180 || destinationLng > 180) {
      return res.status(400).json({ message: 'Invalid destination coordinates' });
    }

    // Mock weather data (in real implementation, integrate with weather API)
    const weather = 'clear'; // clear, rainy, foggy
    const timeOfDay = new Date().getHours();

    // Get user preferences
    const user = req.user;
    const userPreferences = user.preferences || {};

    // Calculate distance (mock implementation)
    const distance = calculateDistance(pickupLat, pickupLng, destinationLat, destinationLng);
    const estimatedDuration = Math.round(distance * 2); // Rough estimate: 2 minutes per km

    // Get available cabs from all providers
    let allCabs = [];
    
    Object.entries(mockCabProviders).forEach(([provider, cabs]) => {
      const providerCabs = cabs.map(cab => ({
        ...cab,
        provider,
        pickupLocation: { lat: pickupLat, lng: pickupLng },
        destination: { lat: destinationLat, lng: destinationLng },
        estimatedDistance: distance,
        estimatedDuration: estimatedDuration + cab.eta,
        available: true
      }));
      allCabs.push(...providerCabs);
    });

    // Filter based on user criteria
    if (vehicleType && vehicleType !== 'any') {
      allCabs = allCabs.filter(cab => cab.type === vehicleType);
    }

    if (maxFare && maxFare > 0) {
      allCabs = allCabs.filter(cab => cab.fare <= maxFare);
    }

    // Filter for passenger count
    if (passengerCount > 4) {
      allCabs = allCabs.filter(cab => ['suv', 'luxury'].includes(cab.type));
    } else if (passengerCount > 1 && passengerCount <= 4) {
      allCabs = allCabs.filter(cab => !['bike'].includes(cab.type));
    }

    // Apply AI recommendations if enabled
    let recommendations = allCabs;
    let aiAnalysis = null;

    if (aiAgent) {
      recommendations = aiRecommendationEngine(allCabs, userPreferences, weather, timeOfDay);
      
      // Select top 3 recommendations
      const topRecommendations = recommendations.slice(0, 3);
      
      aiAnalysis = {
        enabled: true,
        totalOptions: allCabs.length,
        recommendedOptions: topRecommendations.length,
        weatherCondition: weather,
        timeOfDay: timeOfDay,
        userPreferences: {
          preferredVehicleTypes: userPreferences.preferredVehicleTypes || [],
          maxFarePreference: userPreferences.maxFarePreference,
          safetyPriority: userPreferences.safetyPriority
        }
      };

      recommendations = topRecommendations;
    }

    // Get nearest available drivers from our platform
    const nearbyDrivers = await getNearbyDrivers(pickupLat, pickupLng, vehicleType);

    res.json({
      success: true,
      searchResults: {
        pickupLocation: { lat: pickupLat, lng: pickupLng },
        destination: { lat: destinationLat, lng: destinationLng },
        estimatedDistance: distance,
        estimatedDuration: estimatedDuration,
        availableCabs: recommendations,
        nearbyDrivers: nearbyDrivers.slice(0, 5), // Top 5 nearest drivers
        aiAgent: aiAnalysis,
        searchTimestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Cab search error:', error);
    res.status(500).json({ 
      message: 'Error searching for available cabs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// Get nearby drivers from our platform
async function getNearbyDrivers(latitude, longitude, vehicleType) {
  try {
    const query = {
      'availability.isAvailable': true,
      'availability.currentLocation': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000 // 5km radius
        }
      },
      'ratings.averageRating': { $gte: 4.0 }, // Minimum 4.0 rating
      'isActive': true,
      'verification.isVehicleVerified': true,
      'verification.isLicenseVerified': true
    };

    if (vehicleType && vehicleType !== 'any') {
      query['driverSpecific.vehicleType'] = vehicleType;
    }

    const drivers = await Driver.find(query)
      .select('profile.firstName profile.lastName driverSpecific vehicle ratings availability.currentLocation')
      .limit(10)
      .lean();

    return drivers.map(driver => ({
      id: driver._id,
      name: `${driver.profile.firstName} ${driver.profile.lastName}`,
      vehicle: {
        model: driver.driverSpecific.vehicleModel,
        type: driver.driverSpecific.vehicleType,
        color: driver.driverSpecific.vehicleColor,
        registration: driver.driverSpecific.vehicleRegistration,
        seatingCapacity: driver.driverSpecific.seatingCapacity,
        acAvailable: driver.driverSpecific.acAvailable
      },
      rating: driver.ratings.averageRating,
      location: driver.availability.currentLocation,
      provider: 'cabgenie',
      estimatedArrival: Math.floor(Math.random() * 10) + 3, // Mock ETA
      fare: calculateDynamicFare(driver.driverSpecific.vehicleType)
    }));

  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    return [];
  }
}

// Dynamic fare calculation based on vehicle type
function calculateDynamicFare(vehicleType) {
  const baseFares = {
    'bike': 60,
    'auto': 100,
    'hatchback': 120,
    'sedan': 150,
    'suv': 200,
    'luxury': 300
  };
  return baseFares[vehicleType] || 150;
}

// Get cab details by ID
const getCabDetails = async (req, res) => {
  try {
    const { cabId } = req.params;
    
    // In real implementation, this would fetch from provider APIs
    const mockCab = {
      id: cabId,
      provider: 'uber',
      name: 'Uber Go',
      driver: {
        name: 'John Doe',
        rating: 4.5,
        photo: 'https://via.placeholder.com/150',
        totalRides: 1250
      },
      vehicle: {
        model: 'Maruti Suzuki Swift',
        color: 'White',
        registration: 'AB12CD3456',
        type: 'sedan',
        seatingCapacity: 4,
        acAvailable: true
      },
      estimatedArrival: 5,
      fare: 150,
      rating: 4.5,
      safetyFeatures: ['GPS Tracking', 'Emergency Button', 'Driver Verification'],
      amenities: ['AC', 'Music System', 'Phone Charger']
    };

    res.json({
      success: true,
      cab: mockCab
    });

  } catch (error) {
    console.error('Get cab details error:', error);
    res.status(500).json({ message: 'Error fetching cab details' });
  }
};

module.exports = {
  searchCabs,
  getCabDetails
};